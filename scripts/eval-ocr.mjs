// নিজেদের নমুনায় OCR/ফিল্ড-নিষ্কাশনের নির্ভুলতা মাপার স্ক্রিপ্ট।
// চালানো: node scripts/eval-ocr.mjs http://localhost:3000 operator Bhoomi@2026
// শর্ত: সার্ভারে GEMINI_API_KEY দেওয়া থাকতে হবে (না থাকলে ডেমো ডেটা আসে, স্ক্রিপ্ট নিজেই থেমে যায়)।
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [base = 'http://localhost:3000', user = 'operator', pass = 'Bhoomi@2026'] = process.argv.slice(2);
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'samples');
const truth = JSON.parse(fs.readFileSync(path.join(dir, 'ground_truth.json'), 'utf8'));

const BN = '০১২৩৪৫৬৭৮৯';
const norm = (s) => String(s ?? '').replace(/[০-৯]/g, (d) => BN.indexOf(d)).replace(/\s+/g, ' ').trim();
const frac = (s) => { const t = norm(s); const m = t.match(/^(\d+)\s*\/\s*(\d+)$/); return m ? Number(m[1]) / Number(m[2]) : Number(t); };
const num = (x) => Math.round(Number(norm(x)) * 100) / 100;

const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
if (!login.ok) { console.error('লগইন ব্যর্থ:', login.status); process.exit(1); }
const cookie = login.headers.get('set-cookie').split(';')[0];

const tally = {};
const hit = (field, ok) => { (tally[field] ??= { ok: 0, n: 0 }); tally[field].n++; if (ok) tally[field].ok++; };
let samples = 0;

for (const [name, t] of Object.entries(truth)) {
  const img = fs.readFileSync(path.join(dir, `${name}.png`)).toString('base64');
  const r = await fetch(`${base}/api/ocr-extract`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ imageBase64: img, mimeType: 'image/png', fileName: `${name}.png` }) });
  const j = await r.json();
  if (!r.ok) { console.error(name, 'ব্যর্থ:', j.message); continue; }
  if (j.isDemoData) { console.error('সার্ভার ডেমো ডেটা ফেরত দিচ্ছে (GEMINI_API_KEY নেই বা কল ব্যর্থ) — মাপা সম্ভব নয়।', j.errorInfo ?? ''); process.exit(2); }
  const s = j.structuredData ?? {};
  samples++;
  hit('জরিপ', norm(s.surveyType) === t.survey);
  hit('জেলা', norm(s.district) === t.district);
  hit('মৌজা', norm(s.mouza) === t.mouza);
  hit('খতিয়ান নং', norm(s.khatianNo) === String(t.khatianNo));
  hit('মালিক-সংখ্যা', (s.owners ?? []).length === t.owners.length);
  t.owners.forEach((o, i) => {
    hit('মালিকের নাম', norm(s.owners?.[i]?.name) === norm(o.name));
    hit('অংশ', Math.abs(frac(s.owners?.[i]?.share) - frac(o.share)) < 1e-6);
  });
  hit('দাগ-সংখ্যা', (s.plots ?? []).length === t.plots.length);
  t.plots.forEach((p, i) => {
    hit('দাগ নং', norm(s.plots?.[i]?.dagNo) === String(p.dagNo));
    hit('ক্ষেত্রফল', num(s.plots?.[i]?.area) === p.area);
  });
  hit('মোট জমি', num(s.totalArea) === t.total);
  console.log(`${name}: পড়া হলো`);
}

console.log(`\n=== ফিল্ড-পর্যায়ের নির্ভুলতা (${samples}টি নিজস্ব সিনথেটিক ছাপা নমুনায়) ===`);
let ok = 0, n = 0;
for (const [f, v] of Object.entries(tally)) { console.log(`${f.padEnd(14)} ${v.ok}/${v.n}  (${Math.round((100 * v.ok) / v.n)}%)`); ok += v.ok; n += v.n; }
console.log(`মোট           ${ok}/${n}  (${Math.round((100 * ok) / Math.max(n, 1))}%)`);
console.log('\nসতর্কতা: এটি ছাপা-ধাঁচের সিনথেটিক নমুনা; আসল পুরোনো/হাতে-লেখা খতিয়ানে ফল অনেক খারাপ হতে পারে। রিপোর্টে নমুনার আকারসহ লিখুন।');
