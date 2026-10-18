// আপলোডের আগে ছবি পরিষ্কার: কাত সোজা করা (deskew), নয়েজ কমানো (3×3 মিডিয়ান), কনট্রাস্ট ঠিক করা।
// গণিতের অংশ (estimateSkew, medianFilter3, autoContrast) DOM-নির্ভর নয়, তাই আলাদাভাবে টেস্ট করা যায়।
// ব্রাউজারের অংশ (preprocessImageFile) ক্যানভাস ব্যবহার করে। PDF-এ কিছু করা হয় না (ছবি হলে তবেই)।

export interface PreprocessOptions { deskew: boolean; denoise: boolean; contrast: boolean }
export interface PreprocessResult { dataUrl: string; mimeType: string; notes: string[]; skewDeg: number }

export function toGray(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Uint8ClampedArray {
  const g = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000;
  return g;
}

export function otsu(gray: Uint8ClampedArray): number {
  const hist = new Array(256).fill(0);
  gray.forEach((v) => hist[v]++);
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }
  return thr;
}

/**
 * টেক্সট-লাইনের কাত (ডিগ্রি) অনুমান — প্রজেকশন-প্রোফাইল পদ্ধতি।
 * ধনাত্মক মান = লাইনগুলো ডানে নামছে (ঘড়ির কাঁটার দিকে কাত, y নিচের দিকে)।
 * সোজা করতে ছবি এর উল্টো দিকে (-angle) ঘোরাতে হয়।
 */
export function estimateSkew(gray: Uint8ClampedArray, w: number, h: number, maxAngle = 8): number {
  // বড় ছবি ছোট করে দেখা (গতির জন্য)
  const step = Math.max(1, Math.floor(Math.max(w, h) / 700));
  const thr = otsu(gray);
  const xs: number[] = [], ys: number[] = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (gray[y * w + x] <= thr) { xs.push(x / step); ys.push(y / step); }
    }
  }
  if (xs.length < 50) return 0;
  const sw = Math.ceil(w / step), sh = Math.ceil(h / step);
  const bins = sw + sh + 2;
  const score = (deg: number) => {
    const th = (deg * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
    const hist = new Float64Array(bins);
    for (let i = 0; i < xs.length; i++) {
      const yp = ys[i] * c - xs[i] * s + sw * Math.abs(s); // নেগেটিভ এড়াতে সরানো
      const b = Math.floor(yp);
      if (b >= 0 && b < bins) hist[b]++;
    }
    let mean = 0;
    for (let i = 0; i < bins; i++) mean += hist[i];
    mean /= bins;
    let v = 0;
    for (let i = 0; i < bins; i++) v += (hist[i] - mean) * (hist[i] - mean);
    return v;
  };
  let best = 0, bestScore = -1;
  for (let a = -maxAngle; a <= maxAngle + 1e-9; a += 0.5) {
    const sc = score(a);
    if (sc > bestScore) { bestScore = sc; best = a; }
  }
  for (let a = best - 0.5; a <= best + 0.5 + 1e-9; a += 0.1) {
    const sc = score(a);
    if (sc > bestScore) { bestScore = sc; best = a; }
  }
  return Math.round(best * 10) / 10;
}

export function medianFilter3(gray: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length);
  const win = new Array(9);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          win[k++] = gray[yy * w + xx];
        }
      }
      win.sort((a, b) => a - b);
      out[y * w + x] = win[4];
    }
  }
  return out;
}

/** ১% ও ৯৯% পারসেন্টাইল ধরে কনট্রাস্ট টেনে দেওয়া (ঝাপসা/ফ্যাকাসে স্ক্যানের জন্য) */
export function autoContrast(gray: Uint8ClampedArray): Uint8ClampedArray {
  const hist = new Array(256).fill(0);
  gray.forEach((v) => hist[v]++);
  const lo = percentile(hist, gray.length, 0.01), hi = percentile(hist, gray.length, 0.99);
  if (hi - lo < 8) return gray;
  const out = new Uint8ClampedArray(gray.length);
  const scale = 255 / (hi - lo);
  for (let i = 0; i < gray.length; i++) out[i] = (gray[i] - lo) * scale;
  return out;
}
function percentile(hist: number[], total: number, p: number): number {
  let acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * p) return i; }
  return 255;
}

// ---------------- ব্রাউজারের অংশ ----------------
const MAX_SIDE = 2400;

export async function preprocessImageFile(file: File, opts: PreprocessOptions): Promise<PreprocessResult | null> {
  if (!/^image\/(jpeg|png)$/.test(file.type) || !(opts.deskew || opts.denoise || opts.contrast)) return null;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const base = document.createElement('canvas');
  base.width = w; base.height = h;
  const bctx = base.getContext('2d', { willReadFrequently: true })!;
  bctx.fillStyle = '#fff';
  bctx.fillRect(0, 0, w, h);
  bctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const notes: string[] = [];
  let skewDeg = 0;
  let canvas = base;
  if (opts.deskew) {
    const g = toGray(bctx.getImageData(0, 0, w, h).data, w, h);
    skewDeg = estimateSkew(g, w, h);
    if (Math.abs(skewDeg) >= 0.3) {
      const rot = document.createElement('canvas');
      rot.width = w; rot.height = h;
      const rctx = rot.getContext('2d', { willReadFrequently: true })!;
      rctx.fillStyle = '#fff';
      rctx.fillRect(0, 0, w, h);
      rctx.translate(w / 2, h / 2);
      rctx.rotate((-skewDeg * Math.PI) / 180);
      rctx.drawImage(base, -w / 2, -h / 2);
      canvas = rot;
      notes.push(`কাত ${skewDeg}° সোজা করা হয়েছে`);
    } else {
      notes.push('ছবি আগে থেকেই প্রায় সোজা');
    }
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, w, h);
  let gray = toGray(img.data, w, h);
  if (opts.denoise) { gray = medianFilter3(gray, w, h); notes.push('নয়েজ কমানো হয়েছে'); }
  if (opts.contrast) { gray = autoContrast(gray); notes.push('কনট্রাস্ট ঠিক করা হয়েছে'); }
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) { img.data[j] = img.data[j + 1] = img.data[j + 2] = gray[i]; img.data[j + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), mimeType: 'image/jpeg', notes, skewDeg };
}
