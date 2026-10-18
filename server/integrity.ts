// রেকর্ডের অখণ্ডতা: SHA-256 হ্যাশ + হ্যাশ-চেইন করা অডিট লগ।
// প্রতিটি অডিট এন্ট্রির হ্যাশ = SHA-256(আগের এন্ট্রির হ্যাশ + এন্ট্রির নিজের বিষয়বস্তু)।
// ফলে মাঝখানের কোনো লগ বদলালে/মুছলে বা রেকর্ডের তথ্য চুপিচুপি বদলালে verify ধরতে পারে।
// সীমা: ডেটা-ফাইলে পুরো অ্যাক্সেস থাকা কেউ সব হ্যাশ নতুন করে বানিয়ে দিলে এটি ধরবে না;
// তার জন্য হ্যাশের মাথা (head hash) বাইরে আলাদা জায়গায় রাখতে হয় (README-তে লেখা আছে)।
import crypto from 'crypto';
import type { AuditLogEntry, LandRecord } from '../src/types';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).filter((k) => obj[k] !== undefined).sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// যেগুলো হ্যাশে ধরা হয় না: নিজের হ্যাশ, লগ (আলাদা চেইন), হিসাব করা/অনুসঙ্গ তথ্য
const EXCLUDED: Array<keyof LandRecord> = ['recordHash', 'auditLogs', 'relatedRecords', 'checks', 'imageUrl'];

export function computeRecordHash(record: LandRecord): string {
  const body: Record<string, unknown> = { ...record };
  EXCLUDED.forEach((k) => delete body[k]);
  return sha256(canonicalJson(body));
}

export function chainHash(prevHash: string, entry: Omit<AuditLogEntry, 'hash'>): string {
  return sha256(`${prevHash}|${canonicalJson(entry)}`);
}

export interface VerifyResult {
  ok: boolean;
  entries: number;
  chainOk: boolean;
  contentOk: boolean;
  headHash: string;
  problems: string[];
}

export function verifyRecord(record: LandRecord): VerifyResult {
  const problems: string[] = [];
  let prev = '';
  let chainOk = true;
  const logs = record.auditLogs ?? [];
  logs.forEach((entry, i) => {
    const { hash, ...rest } = entry;
    if ((entry.prevHash ?? '') !== prev) {
      chainOk = false;
      problems.push(`লগ #${i + 1}: আগের লগের সাথে যোগসূত্র ছিন্ন`);
    }
    if (chainHash(entry.prevHash ?? '', rest) !== hash) {
      chainOk = false;
      problems.push(`লগ #${i + 1}: হ্যাশ মেলেনি (লগ বদলানো হয়েছে)`);
    }
    prev = hash;
  });
  const current = computeRecordHash(record);
  const lastSealed = [...logs].reverse().find((e) => e.recordHash)?.recordHash;
  let contentOk = true;
  if (record.recordHash !== current) { contentOk = false; problems.push('রেকর্ডের তথ্যের হ্যাশ সংরক্ষিত হ্যাশের সাথে মেলেনি'); }
  if (lastSealed && lastSealed !== current) { contentOk = false; problems.push('শেষ অডিট-সিলের পর রেকর্ডের তথ্য বদলেছে (অডিট ছাড়া পরিবর্তন)'); }
  if (!lastSealed) { contentOk = false; problems.push('কোনো অডিট-সিল পাওয়া যায়নি'); }
  return { ok: chainOk && contentOk, entries: logs.length, chainOk, contentOk, headHash: prev, problems };
}
