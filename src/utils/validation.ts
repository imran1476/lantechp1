// ভূমিলিপি — স্বয়ংক্রিয় যাচাই (রুল ইঞ্জিন), প্ল্যানের নিয়ম ১–৮।
// এটি বিশুদ্ধ TypeScript (ব্রাউজার/DOM নির্ভর নয়): ক্লায়েন্ট ও সার্ভার দুজনেই একই কোড চালায়,
// তাই অনুমোদনের সময় সার্ভার নিজে আবার যাচাই করে — ক্লায়েন্টের কথায় ভরসা করে না।
import type { LandRecord, PlotInfo, ValidationChecks, ValidationIssue } from '../types';

export const CONFIDENCE_THRESHOLD = 80; // নিয়ম ৮: এর নিচে হলে হলুদ সতর্কতা
export const SHARE_TOLERANCE = 0.005;   // অংশের যোগফল ১ থেকে এর বেশি দূরে থাকলে ভুল
export const AREA_TOLERANCE_DECIMAL = 0.02; // শতকে (রাউন্ডিং সহ্য করতে)

const BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const toAscii = (v: unknown): string => String(v ?? '').replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
const toBn = (v: unknown): string => String(v ?? '').replace(/[0-9]/g, (d) => BN[Number(d)]);

export const VALID_SURVEYS = ['CS', 'SA', 'RS', 'BS'];

// ১ একর = ১০০ শতক। ১ কাঠা ≈ ৭২০ বর্গফুট ÷ ৪৩৫.৬ বর্গফুট/শতক ≈ ১.৬৫ শতক (কাঠার মান অঞ্চলভেদে বদলায়)
export const UNIT_TO_DECIMAL: Record<string, number> = { 'একর': 100, 'শতক': 1, 'কাঠা': 720 / 435.6 };

export function normalizeUnit(u: string | undefined | null): string {
  const t = String(u ?? '').trim();
  if (['শতাংশ', 'ডেসিমেল', 'decimal', 'Decimal'].includes(t)) return 'শতক';
  if (['acre', 'Acre'].includes(t)) return 'একর';
  return t;
}

export function toDecimalArea(area: number, unit: string | undefined | null): number | null {
  const f = UNIT_TO_DECIMAL[normalizeUnit(unit)];
  return f !== undefined && Number.isFinite(area) ? area * f : null;
}

/** অংশ -> 0..1। "১/২", "০.৫০", "৮ আনা", "৫০%", "১/২ (০.৫০)" সমর্থিত। পড়া না গেলে null */
export function parseShare(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const s = toAscii(raw).replace(/\(.*?\)/g, '').replace(/অংশ/g, '').trim();
  if (!s) return null;
  let m = s.match(/^(\d+(?:\.\d+)?)\s*আনা$/);
  if (m) return Number(m[1]) / 16;
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2]);
  m = s.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (m) return Number(m[1]) / 100;
  if (/^(\d+\.?\d*|\.\d+)$/.test(s)) return Number(s);
  return null;
}

const ID_PATTERN = /^\d+(?:[\/\-]\d+)?[ক-হ]?$/; // যেমন 1234, 1234/1, 56ক

/** রেকর্ড সংরক্ষণের আগে চালানো হয়: নিয়ম ১ — বাংলা অঙ্ক → ইংরেজি, আর বাংলা রূপও ঠিক রাখা */
export function normalizeRecord<T extends Partial<LandRecord>>(r: T): T {
  const out: Partial<LandRecord> = { ...r };
  if (out.khatianNo !== undefined) {
    out.khatianNo = toAscii(out.khatianNo).trim();
    out.khatianNoBn = toBn(out.khatianNo);
  }
  if (out.dagNo !== undefined) {
    out.dagNo = toAscii(out.dagNo).trim();
    out.dagNoBn = toBn(out.dagNo);
  }
  if (out.jlNo !== undefined) out.jlNo = toBn(toAscii(out.jlNo)).trim();
  if (out.totalArea !== undefined && out.totalArea !== null) out.totalAreaBn = toBn(out.totalArea);
  if (out.areaUnit !== undefined) out.areaUnit = normalizeUnit(out.areaUnit) as LandRecord['areaUnit'];
  if (out.plots) {
    out.plots = out.plots.map((p) => ({
      ...p,
      dagNo: toAscii(p.dagNo).trim(),
      dagNoBn: toBn(toAscii(p.dagNo).trim()),
      areaUnit: normalizeUnit(p.areaUnit) as PlotInfo['areaUnit'],
    }));
  }
  if (out.owners) {
    out.owners = out.owners.map((o) => {
      const v = parseShare(o.share);
      return { ...o, shareDecimal: v === null ? 0 : Number(v.toFixed(6)) };
    });
  }
  return out as T;
}

const fieldLabels: Record<string, string> = {
  district: 'জেলা', upazila: 'উপজেলা', mouza: 'মৌজা', khatianNo: 'খতিয়ান নং',
  dagNo: 'দাগ নং', totalArea: 'মোট জমি', owners: 'মালিক', boundaries: 'চৌহদ্দি',
};

export function validateLandRecord(record: Partial<LandRecord>, allRecords: LandRecord[] = []): ValidationChecks {
  const issues: ValidationIssue[] = [];
  const add = (rule: ValidationIssue['rule'], severity: ValidationIssue['severity'], field: string, message: string) =>
    issues.push({ rule, severity, field, message });

  const owners = record.owners ?? [];
  const plots = record.plots ?? [];

  // ---- নিয়ম ৬: বাধ্যতামূলক ফিল্ড ----
  const hasText = (v: unknown) => String(v ?? '').trim().length > 0;
  const primaryDag = hasText(record.dagNo) ? String(record.dagNo) : plots.find((p) => hasText(p.dagNo))?.dagNo ?? '';
  if (!hasText(record.mouza)) add(6, 'error', 'mouza', 'মৌজা খালি');
  if (!hasText(record.khatianNo)) add(6, 'error', 'khatianNo', 'খতিয়ান নং খালি');
  if (!hasText(primaryDag)) add(6, 'error', 'dagNo', 'দাগ নং খালি');
  if (owners.length === 0) add(6, 'error', 'owners', 'কোনো মালিক নেই');
  owners.forEach((o, i) => { if (!hasText(o.name)) add(6, 'error', `owners.${i}.name`, `${toBn(i + 1)} নম্বর মালিকের নাম খালি`); });
  if (!hasText(record.district)) add(6, 'warning', 'district', 'জেলা খালি');
  if (!hasText(record.upazila)) add(6, 'warning', 'upazila', 'উপজেলা খালি');

  // ---- নিয়ম ১: সংখ্যা স্বাভাবিকীকরণ ----
  let numeralNormalized = true;
  const checkId = (value: unknown, field: string, label: string) => {
    if (!hasText(value)) return;
    const raw = String(value).trim();
    if (/[০-৯]/.test(raw)) numeralNormalized = false; // সংরক্ষণের সময় normalizeRecord ঠিক করে দেয়
    if (!ID_PATTERN.test(toAscii(raw))) add(1, 'error', field, `${label} "${raw}" সংখ্যা হিসেবে পড়া যায়নি`);
  };
  checkId(record.khatianNo, 'khatianNo', 'খতিয়ান নং');
  checkId(record.dagNo, 'dagNo', 'দাগ নং');
  plots.forEach((p, i) => checkId(p.dagNo, `plots.${i}.dagNo`, 'দাগ নং'));

  // ---- নিয়ম ৫: বৈধ জরিপ ----
  const surveyValid = record.surveyType && VALID_SURVEYS.includes(record.surveyType) ? 'ok' : 'invalid';
  if (surveyValid === 'invalid') add(5, 'error', 'surveyType', `জরিপের ধরন "${record.surveyType ?? ''}" বৈধ নয় (CS/SA/RS/BS হতে হবে)`);

  // ---- নিয়ম ২: মালিকদের অংশের যোগফল = ১ ----
  let sharesTotal = 0;
  let sharesBad = false;
  owners.forEach((o, i) => {
    const v = parseShare(o.share);
    if (v === null) { sharesBad = true; add(2, 'error', `owners.${i}.share`, `অংশ "${o.share ?? ''}" পড়া যায়নি`); return; }
    if (v <= 0 || v > 1 + SHARE_TOLERANCE) { sharesBad = true; add(2, 'error', `owners.${i}.share`, `অংশ ${v.toFixed(3)} অসম্ভব (০ < অংশ ≤ ১ হতে হবে)`); return; }
    sharesTotal += v;
  });
  let sharesSum: ValidationChecks['sharesSum'] = 'ok';
  if (owners.length === 0) sharesSum = 'warning';
  else if (sharesBad) sharesSum = 'invalid';
  else if (Math.abs(sharesTotal - 1) > SHARE_TOLERANCE) {
    sharesSum = 'mismatch';
    add(2, 'error', 'owners', `মালিকদের অংশের যোগফল ${sharesTotal.toFixed(3)}; পূর্ণ ১ হতে হবে`);
    owners.forEach((_, i) => add(2, 'error', `owners.${i}.share`, 'অংশের যোগফল ১ হয়নি'));
  }

  // ---- নিয়ম ৪: এককের সামঞ্জস্য ----
  const units = new Set<string>();
  let unitUnknown = false;
  const regUnit = (u: string | undefined, field: string) => {
    const nu = normalizeUnit(u);
    if (!(nu in UNIT_TO_DECIMAL)) { unitUnknown = true; add(4, 'error', field, `অজানা একক "${u ?? ''}"`); return; }
    units.add(nu);
    if (nu === 'কাঠা') add(4, 'warning', field, 'কাঠার মান অঞ্চলভেদে ভিন্ন; এখানে ১ কাঠা ≈ ১.৬৫ শতক ধরা হয়েছে — মিলিয়ে নিন');
  };
  plots.forEach((p, i) => regUnit(p.areaUnit, `plots.${i}.area`));
  if (record.totalArea !== undefined) regUnit(record.areaUnit, 'totalArea');
  let unitConsistency: ValidationChecks['unitConsistency'] = 'ok';
  if (unitUnknown) unitConsistency = 'mismatch';
  else if (units.size > 1) {
    unitConsistency = 'mismatch';
    add(4, 'warning', 'totalArea', `এক খতিয়ানে একক মেশানো (${[...units].join(', ')}); শতকে রূপান্তর করে মেলানো হয়েছে`);
  }

  // ---- নিয়ম ৩: দাগের ক্ষেত্রফলের যোগফল = মোট জমি (শতকে রূপান্তর করে) ----
  let areaSum: ValidationChecks['areaSum'] = 'ok';
  let areaSumValues: ValidationChecks['areaSumValues'];
  const totalArea = Number(record.totalArea);
  if (record.totalArea === undefined || !Number.isFinite(totalArea) || totalArea <= 0) {
    areaSum = 'warning';
    add(3, 'error', 'totalArea', 'মোট জমির পরিমাণ খালি বা ০');
  } else if (plots.length > 0) {
    const parts = plots.map((p) => toDecimalArea(Number(p.area), p.areaUnit));
    const totalDec = toDecimalArea(totalArea, record.areaUnit);
    if (parts.some((x) => x === null || (x as number) <= 0) || totalDec === null) {
      areaSum = 'warning';
      plots.forEach((p, i) => { if (!(Number(p.area) > 0)) add(3, 'error', `plots.${i}.area`, 'দাগের ক্ষেত্রফল খালি বা ০'); });
    } else {
      const plotsSum = (parts as number[]).reduce((a, b) => a + b, 0);
      areaSumValues = { plotsSum: Number(plotsSum.toFixed(4)), total: Number(totalDec.toFixed(4)) };
      if (Math.abs(plotsSum - totalDec) > AREA_TOLERANCE_DECIMAL) {
        areaSum = 'mismatch';
        const msg = `দাগগুলোর যোগফল ${plotsSum.toFixed(2)} শতক, কিন্তু মোট জমি ${totalDec.toFixed(2)} শতক`;
        add(3, 'error', 'totalArea', msg);
        plots.forEach((_, i) => add(3, 'error', `plots.${i}.area`, msg));
      }
    }
  }

  // ---- নিয়ম ৭: একই দাগ একাধিক খতিয়ানে / ডুপ্লিকেট খতিয়ান ----
  let dagOverlap: 'ok' | 'warning' = 'ok';
  const myDags = new Map<string, number>(); // দাগ -> আমার অংশ
  const addDag = (dag: string | undefined, share: string | undefined) => {
    const k = toAscii(dag).trim();
    if (!k) return;
    const s = hasText(share) ? parseShare(share) ?? 1 : 1;
    myDags.set(k, Math.max(myDags.get(k) ?? 0, s));
  };
  plots.forEach((p) => addDag(p.dagNo, p.dagShare));
  if (plots.length === 0) addDag(record.dagNo, undefined);
  // একই খতিয়ানে একই দাগ দুবার
  const seen = new Set<string>();
  plots.forEach((p, i) => {
    const k = toAscii(p.dagNo).trim();
    if (!k) return;
    if (seen.has(k)) { dagOverlap = 'warning'; add(7, 'warning', `plots.${i}.dagNo`, `দাগ ${k} এই খতিয়ানেই দুইবার আছে`); }
    seen.add(k);
  });
  const peers = allRecords.filter((o) =>
    o.id !== record.id && o.district === record.district && o.upazila === record.upazila &&
    o.mouza === record.mouza && o.surveyType === record.surveyType && o.status !== 'প্রত্যাখ্যাত');
  const myKhatian = toAscii(record.khatianNo).trim();
  if (myKhatian && peers.some((o) => toAscii(o.khatianNo).trim() === myKhatian)) {
    dagOverlap = 'warning';
    add(7, 'warning', 'khatianNo', `এই মৌজা ও জরিপে খতিয়ান ${myKhatian} আগেই আছে (সম্ভাব্য ডুপ্লিকেট)`);
  }
  myDags.forEach((myShare, dag) => {
    const others = peers.filter((o) => toAscii(o.khatianNo).trim() !== myKhatian).map((o) => {
      const pl = (o.plots ?? []).find((p) => toAscii(p.dagNo).trim() === dag);
      if (pl) return { kh: o.khatianNo, share: hasText(pl.dagShare) ? parseShare(pl.dagShare) ?? 1 : 1 };
      return toAscii(o.dagNo).trim() === dag && (o.plots ?? []).length === 0 ? { kh: o.khatianNo, share: 1 } : null;
    }).filter((x): x is { kh: string; share: number } => x !== null);
    if (others.length === 0) return;
    const total = myShare + others.reduce((a, b) => a + b.share, 0);
    if (total > 1 + SHARE_TOLERANCE) {
      dagOverlap = 'warning';
      add(7, 'warning', 'dagNo', `দাগ ${dag} খতিয়ান ${others.map((x) => x.kh).join(', ')}-এও আছে; মোট অংশ ${total.toFixed(2)} (> ১)`);
    }
  });

  // ---- নিয়ম ৮: কম OCR কনফিডেন্স ----
  const lowConfidenceFields: string[] = [];
  const fc = record.fieldConfidences as Record<string, number> | undefined;
  if (fc) {
    Object.entries(fc).forEach(([k, v]) => {
      if (typeof v === 'number' && v < CONFIDENCE_THRESHOLD) {
        lowConfidenceFields.push(k);
        add(8, 'warning', k, `${fieldLabels[k] ?? k}: OCR কনফিডেন্স ${v}% (সীমা ${CONFIDENCE_THRESHOLD}%) — মূল নথির সাথে মিলিয়ে দেখুন`);
      }
    });
  }
  plots.forEach((p, i) => {
    if (typeof p.confidence === 'number' && p.confidence < CONFIDENCE_THRESHOLD) {
      add(8, 'warning', `plots.${i}.dagNo`, `দাগ ${p.dagNo}: কনফিডেন্স ${p.confidence}%`);
    }
  });

  // ---- ফলাফল সাজানো ----
  const fieldStatus: Record<string, 'ok' | 'warn' | 'error'> = {};
  ['surveyType', 'district', 'upazila', 'mouza', 'khatianNo', 'dagNo', 'totalArea', 'owners', 'boundaries'].forEach((k) => { fieldStatus[k] = 'ok'; });
  issues.forEach((it) => {
    const next = it.severity === 'error' ? 'error' : 'warn';
    const cur = fieldStatus[it.field] ?? 'ok';
    fieldStatus[it.field] = cur === 'error' || next === 'error' ? 'error' : 'warn';
    // owners.N.share / name -> owners-এর সারাংশেও প্রতিফলিত
    const parent = it.field.split('.')[0];
    if (parent !== it.field) {
      const pc = fieldStatus[parent] ?? 'ok';
      fieldStatus[parent] = pc === 'error' || next === 'error' ? 'error' : 'warn';
    }
  });

  const mandatoryFields = issues.some((i) => i.rule === 6 && i.severity === 'error') ? 'missing' : 'ok';
  const firstError = issues.find((i) => i.severity === 'error');
  const firstWarn = issues.find((i) => i.severity === 'warning');
  const notes = firstError
    ? `ভুল পাওয়া গেছে: ${firstError.message}`
    : firstWarn ? `সতর্কতা: ${firstWarn.message}` : 'সকল নিয়ম (১–৮) যাচাই করা হয়েছে; কোনো সমস্যা পাওয়া যায়নি।';

  return {
    sharesSum, sharesSumValue: Number(sharesTotal.toFixed(3)), areaSum, surveyValid, mandatoryFields,
    unitConsistency, numeralNormalized, notes, issues, fieldStatus, lowConfidenceFields, dagOverlap, areaSumValues,
  };
}

export function hasBlockingErrors(checks: ValidationChecks): boolean {
  return (checks.issues ?? []).some((i) => i.severity === 'error');
}

export function issueCounts(checks: ValidationChecks): { errors: number; warnings: number } {
  const list = checks.issues ?? [];
  return { errors: list.filter((i) => i.severity === 'error').length, warnings: list.filter((i) => i.severity === 'warning').length };
}
