

export const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const ENGLISH_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function toEnglishDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
}

export function toBengaliDigits(str: string | number): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s.replace(/[0-9]/g, (d) => BENGALI_DIGITS[parseInt(d, 10)]);
}

// Convert fraction like '১/২' or '1/2' or '০.৫০' to float decimal
export function parseShareToDecimal(shareStr: string): number {
  if (!shareStr) return 0;
  const eng = toEnglishDigits(shareStr.trim());
  if (eng.includes('/')) {
    const [num, den] = eng.split('/').map(Number);
    if (den && !isNaN(num) && !isNaN(den)) {
      return num / den;
    }
  }
  // Check if 16 ana system: "৮ আনা" => 8/16 = 0.5
  if (shareStr.includes('আনা')) {
    const numPart = parseFloat(toEnglishDigits(shareStr.replace('আনা', '').trim()));
    if (!isNaN(numPart)) {
      return numPart / 16;
    }
  }
  const val = parseFloat(eng);
  return isNaN(val) ? 0 : val;
}

// বাংলা নামের ফাজি সার্চের কোড এখন ./banglaSearch.ts-এ
export { normalizeBanglaSearch, fuzzyMatchBangla, scoreBangla } from './banglaSearch';

// যাচাই নিয়মের আসল কোড এখন ./validation.ts-এ (ক্লায়েন্ট ও সার্ভার একই কোড ব্যবহার করে)
export { validateLandRecord } from './validation';

export function generateRecordHash(recordId: string, timestamp: string): string {
  let hash = 0;
  const str = `${recordId}-${timestamp}-bhoomi-ai-verified-secure`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex}7b4f9a12c8e3`;
}
