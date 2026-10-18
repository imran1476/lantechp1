// বাংলা নামের ফাজি সার্চ: বানান-বৈচিত্র্য (মোঃ/মো/মুহাম্মদ/Md.), ই-ঈ, শ-ষ-স, ণ-ন ইত্যাদি সামলায়।
// বিশুদ্ধ TypeScript — ব্রাউজার ও সার্ভারে একইভাবে চলে। প্রতিটি মিলের একটি স্কোর (০–১) পাওয়া যায়।
const ZW = /[\u200b\u200c\u200d\ufeff]/g;

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

// নামের আগে বসা উপাধি/শিরোনাম: স্কোরিং-এ বাদ দেওয়া হয় (কিন্তু সব টোকেন উপাধি হলে রাখা হয়)
const HONORIFICS = new Set([
  'মোঃ', 'মো', 'মোহাম্মদ', 'মোহাম্মাদ', 'মুহাম্মদ', 'মুহাম্মাদ', 'মুহম্মদ', 'মোহম্মদ', 'মোহাম্মেদ', 'মুহাম্মেদ',
  'md', 'mohammad', 'mohammed', 'muhammad', 'mohd', 'mhd',
  'মোছাঃ', 'মোছাম্মৎ', 'মোসাম্মৎ', 'মোসাঃ', 'মোছা', 'মোসা', 'মৃত', 'মরহুম', 'মরহুমা',
]);

// একই নামের ভিন্ন বানান -> একটি রূপ
const CANON: Record<string, string> = {
  'আবদুল': 'আব্দুল', 'আঃ': 'আব্দুল', 'abdul': 'আব্দুল', 'আব্দুর': 'আব্দুর', 'আবদুর': 'আব্দুর', 'abdur': 'আব্দুর',
  'বেগম': 'বেগম', 'begum': 'বেগম', 'খাতুন': 'খাতুন', 'khatun': 'খাতুন',
};

const FOLD: Array<[RegExp, string]> = [
  [/\u09dc/g, '\u09b0'], [/\u09dd/g, '\u09b0'],           // ড়, ঢ় -> র
  [/\u09a1\u09bc/g, '\u09b0'], [/\u09a2\u09bc/g, '\u09b0'],
  [/\u09df/g, '\u09af'], [/\u09af\u09bc/g, '\u09af'],      // য় -> য
  [/ী/g, 'ি'], [/ূ/g, 'ু'], [/ঈ/g, 'ই'], [/ঊ/g, 'উ'],
  [/[শষ]/g, 'স'], [/ণ/g, 'ন'], [/ঞ/g, 'ন'], [/ৎ/g, 'ত'], [/ঁ/g, ''],
];

function fold(token: string): string {
  let t = token;
  for (const [re, to] of FOLD) t = t.replace(re, to);
  return t;
}

/** নামকে তুলনার উপযোগী টোকেনে ভাঙা (উপাধি বাদ, বানান-বৈচিত্র্য একীভূত) */
export function nameTokens(input: string): string[] {
  if (!input) return [];
  const base = input.normalize('NFC').replace(ZW, '').toLowerCase()
    .replace(/[.,;:()\-_/।ঃ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const raw = base.split(' ').filter(Boolean);
  const mapped = raw.map((t) => CANON[t] ?? t);
  const nonHonorific = mapped.filter((t) => !HONORIFICS.has(t));
  return (nonHonorific.length > 0 ? nonHonorific : mapped).map(fold);
}

/** ডিবাগ/পুরোনো কোডের সাথে মানানসই: নামের স্বাভাবিকীকৃত রূপ */
export function normalizeBanglaSearch(term: string): string {
  return nameTokens(term).join(' ');
}

function levenshtein(a: string[], b: string[]): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function tokenSimilarity(q: string, t: string): number {
  if (q === t) return 1;
  const qa = Array.from(q), ta = Array.from(t);
  const sim = 1 - levenshtein(qa, ta) / Math.max(qa.length, ta.length);
  if (qa.length >= 2 && t.startsWith(q)) return Math.max(sim, 0.92); // টাইপ করতে থাকলে প্রিফিক্স মিল
  return sim;
}

export const MATCH_THRESHOLD = 0.72;
const TOKEN_FLOOR = 0.6;

/** target-এ query কতটা মেলে: ০ (মেলে না) থেকে ১ (হুবহু)। সব query-টোকেনকেই মিলতে হয়, শুধু একটা শব্দ মিললে হয় না। */
export function scoreBangla(target: string, query: string): number {
  if (!query || !query.trim()) return 1;
  if (!target) return 0;
  // সংখ্যা (খতিয়ান/দাগ নং): বাংলা-ইংরেজি অঙ্ক সমান ধরা, শুরু মিললে আংশিক স্কোর
  const qa = toAscii(query).trim(), ta = toAscii(target).trim();
  if (/^\d+([\/\-]\d+)?$/.test(qa) && /^\d/.test(ta)) {
    if (qa === ta) return 1;
    return ta.startsWith(qa) ? 0.8 : 0;
  }
  const q = nameTokens(query), t = nameTokens(target);
  if (q.length === 0 || t.length === 0) return 0;
  const used = new Set<number>();
  let total = 0;
  for (const qt of q) {
    let best = 0, bestIdx = -1;
    t.forEach((tt, i) => {
      if (used.has(i)) return;
      const s = tokenSimilarity(qt, tt);
      if (s > best) { best = s; bestIdx = i; }
    });
    if (bestIdx >= 0) used.add(bestIdx);
    total += best >= TOKEN_FLOOR ? best : 0; // একটা শব্দ একদম না মিললে সেটা মিস (যেমন করিম ≠ রহিম)
  }
  const extra = Math.max(0, t.length - q.length);
  return Math.max(0, (total / q.length) * (1 - 0.04 * Math.min(extra, 4)));
}

export function fuzzyMatchBangla(target: string, query: string): boolean {
  return scoreBangla(target, query) >= MATCH_THRESHOLD;
}
