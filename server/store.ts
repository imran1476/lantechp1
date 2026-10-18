// স্থায়ী রেকর্ড স্টোর (JSON ফাইল + ছবির ফাইল)। কোনো বাড়তি প্যাকেজ লাগে না; পেজ রিফ্রেশ বা সার্ভার রিস্টার্টেও ডেটা থাকে।
// প্রোটোটাইপের জন্য যথেষ্ট; বাস্তবে PostgreSQL-এ যাওয়ার জায়গা এই ক্লাসের মেথডগুলোই।
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { AuditLogEntry, LandRecord } from '../src/types';
import { INITIAL_LAND_RECORDS } from '../src/data/sampleRecords';
import { hasBlockingErrors, normalizeRecord, validateLandRecord } from '../src/utils/validation';
import { chainHash, computeRecordHash, verifyRecord, VerifyResult } from './integrity';

export class StoreError extends Error {
  constructor(public status: number, public code: string, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

const BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const toBn = (s: string) => s.replace(/[0-9]/g, (d) => BN[Number(d)]);
const dhakaNow = () => toBn(new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' '));
const dhakaToday = () => dhakaNow().slice(0, 10);

// ক্লায়েন্ট যেসব ফিল্ড বদলাতে পারে (বাকি সব — id, status, হ্যাশ, লগ — শুধু সার্ভার ঠিক করে)
const EDITABLE = ['docType', 'surveyType', 'district', 'upazila', 'mouza', 'jlNo', 'khatianNo', 'dagNo', 'landClass',
  'totalArea', 'areaUnit', 'owners', 'plots', 'boundaries'] as const;
type EditableKey = (typeof EDITABLE)[number];
const CONF_KEYS = ['district', 'upazila', 'mouza', 'khatianNo', 'dagNo', 'totalArea', 'owners', 'boundaries'];
const LABEL: Record<string, string> = {
  docType: 'নথির ধরন', surveyType: 'জরিপ', district: 'জেলা', upazila: 'উপজেলা', mouza: 'মৌজা', jlNo: 'জেএল নং',
  khatianNo: 'খতিয়ান নং', dagNo: 'দাগ নং', landClass: 'জমির শ্রেণি', totalArea: 'মোট জমি', areaUnit: 'একক',
  owners: 'মালিক', plots: 'দাগ-তালিকা', boundaries: 'চৌহদ্দি',
};
const ROLE_BN: Record<string, string> = { operator: 'ডিজিটাইজেশন অপারেটর', reviewer: 'যাচাইকারী কর্মকর্তা', admin: 'প্রশাসক' };

export interface Actor { username: string; name: string; role: string }

const MAX_STR = 2000;
function clampStrings<T>(v: T, depth = 0): T {
  if (depth > 6) return v;
  if (typeof v === 'string') return v.slice(0, MAX_STR) as unknown as T;
  if (Array.isArray(v)) return v.slice(0, 500).map((x) => clampStrings(x, depth + 1)) as unknown as T;
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = clampStrings(x, depth + 1);
    return o as T;
  }
  return v;
}

export class RecordStore {
  private records: LandRecord[] = [];
  private file: string;
  private imgDir: string;

  constructor(dataDir: string) {
    fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });
    this.file = path.join(dataDir, 'db.json');
    this.imgDir = path.join(dataDir, 'uploads');
    if (fs.existsSync(this.file)) {
      this.records = JSON.parse(fs.readFileSync(this.file, 'utf8')).records as LandRecord[];
    } else {
      this.records = INITIAL_LAND_RECORDS.map((r) => this.seal(JSON.parse(JSON.stringify(r)) as LandRecord));
      this.persist();
    }
  }

  // ---- সিড রেকর্ডকে প্রথমবার আসল হ্যাশ-চেইনে বসানো ----
  private seal(r: LandRecord): LandRecord {
    const rec = normalizeRecord(r);
    rec.relatedRecords = [];
    const old = rec.auditLogs ?? [];
    rec.auditLogs = [];
    let prev = '';
    old.forEach((e, i) => {
      const entry: Omit<AuditLogEntry, 'hash'> = { id: `log-${i + 1}`, timestamp: e.timestamp, action: e.action, operator: e.operator, details: e.details, prevHash: prev };
      const hash = chainHash(prev, entry);
      rec.auditLogs.push({ ...entry, hash });
      prev = hash;
    });
    rec.recordHash = '';
    this.appendAudit(rec, { username: 'system', name: 'সিস্টেম', role: 'admin' }, 'নমুনা রেকর্ড সিস্টেমে লোড ও সিল (সিড ডেটা)', 'আগের লগ নমুনার অংশ; এই এন্ট্রি থেকে আসল SHA-256 হ্যাশ-চেইন শুরু');
    rec.checks = validateLandRecord(rec, INITIAL_LAND_RECORDS as LandRecord[]);
    return rec;
  }

  private persist() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, records: this.records }, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  private appendAudit(rec: LandRecord, actor: Actor, action: string, details: string) {
    const prev = rec.auditLogs.length ? rec.auditLogs[rec.auditLogs.length - 1].hash : '';
    const recordHash = computeRecordHash(rec);
    const entry: Omit<AuditLogEntry, 'hash'> = {
      id: `log-${rec.auditLogs.length + 1}`, timestamp: dhakaNow(), action, operator: actor.name, details, prevHash: prev, recordHash,
    };
    rec.auditLogs.push({ ...entry, hash: chainHash(prev, entry) });
    rec.recordHash = recordHash;
  }

  private revalidate(rec: LandRecord) {
    rec.checks = validateLandRecord(rec, this.records);
  }

  // ---- পড়া ----
  list(): LandRecord[] { return this.records; }

  get(id: string): LandRecord {
    const r = this.records.find((x) => x.id === id);
    if (!r) throw new StoreError(404, 'not_found', 'রেকর্ড পাওয়া যায়নি।');
    return r;
  }

  imagePath(id: string): { file: string; mime: string } | null {
    for (const [ext, mime] of [['jpg', 'image/jpeg'], ['png', 'image/png'], ['pdf', 'application/pdf']] as const) {
      const f = path.join(this.imgDir, `${id}.${ext}`);
      if (fs.existsSync(f)) return { file: f, mime };
    }
    return null;
  }

  // ---- তৈরি (নতুন আপলোড) ----
  create(input: Partial<LandRecord> & { rawOcrText?: string }, actor: Actor, image?: { data: Buffer; mime: string }): LandRecord {
    const id = `rec-${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
    const body = clampStrings(input);
    const base = INITIAL_LAND_RECORDS[0];
    const rec = normalizeRecord({
      id,
      khatianNo: String(body.khatianNo ?? ''), khatianNoBn: '', dagNo: String(body.dagNo ?? ''), dagNoBn: '',
      surveyType: (body.surveyType ?? 'RS') as LandRecord['surveyType'],
      docType: body.docType ?? 'খতিয়ান',
      district: body.district ?? '', upazila: body.upazila ?? '', mouza: body.mouza ?? '', jlNo: body.jlNo ?? '',
      landClass: body.landClass ?? '', totalArea: Number(body.totalArea ?? 0), totalAreaBn: '', areaUnit: body.areaUnit ?? 'একর',
      owners: (body.owners ?? []).map((o, i) => ({ ...o, id: o.id || `o-${i + 1}` })),
      plots: body.plots ?? [],
      boundaries: body.boundaries ?? { north: '', south: '', east: '', west: '' },
      rawOcrText: String(body.rawOcrText ?? ''),
      confidenceScore: Number(body.confidenceScore ?? 0),
      fieldConfidences: body.fieldConfidences ?? { ...base.fieldConfidences, district: 0, upazila: 0, mouza: 0, khatianNo: 0, dagNo: 0, totalArea: 0, owners: 0, boundaries: 0 },
      checks: base.checks,
      status: 'পর্যালোচনায়',
      dateCreated: dhakaToday(),
      recordHash: '',
      relatedRecords: [],
      auditLogs: [],
      isDemoData: body.isDemoData === true,
      createdBy: actor.username,
    } as LandRecord);
    if (image) {
      const ext = image.mime === 'application/pdf' ? 'pdf' : image.mime === 'image/png' ? 'png' : 'jpg';
      fs.writeFileSync(path.join(this.imgDir, `${id}.${ext}`), image.data);
      rec.imageUrl = `/api/records/${id}/image`;
      rec.imageMime = image.mime;
    }
    this.revalidate(rec);
    this.appendAudit(rec, actor, 'নতুন স্ক্যান নথি আপলোড ও OCR সম্পন্ন',
      rec.isDemoData ? 'সতর্কতা: এটি আপলোড থেকে পড়া নয়, কাল্পনিক ডেমো ডেটা' : 'ছবি থেকে ফিল্ড নিষ্কাশন সম্পন্ন (যাচাই বাকি)');
    this.records.unshift(rec);
    this.persist();
    return rec;
  }

  // ---- সংশোধন ----
  update(id: string, patch: Partial<Record<EditableKey, unknown>>, confirmFields: string[] | undefined, actor: Actor): LandRecord {
    const rec = this.get(id);
    if (rec.status === 'প্রত্যাখ্যাত') throw new StoreError(409, 'rejected', 'প্রত্যাখ্যাত রেকর্ড সংশোধন করা যায় না।');
    const before = JSON.parse(JSON.stringify(rec)) as LandRecord;
    const clean = clampStrings(patch);
    const next: LandRecord = { ...rec };
    const changed: string[] = [];
    for (const k of EDITABLE) {
      if (clean[k] === undefined) continue;
      if (JSON.stringify(clean[k]) !== JSON.stringify((rec as unknown as Record<string, unknown>)[k])) {
        (next as unknown as Record<string, unknown>)[k] = clean[k];
        changed.push(k);
      }
    }
    const normalized = normalizeRecord(next);
    // মানুষ যা বদলেছে বা নিশ্চিত করেছে তার কনফিডেন্স ৯৯ (মানুষ-যাচাইকৃত) ধরা হয়
    const fc = { ...normalized.fieldConfidences } as Record<string, number>;
    changed.filter((k) => CONF_KEYS.includes(k)).forEach((k) => { fc[k] = 99; });
    const confirmed: string[] = [];
    (confirmFields ?? []).forEach((f) => {
      if (CONF_KEYS.includes(f)) { fc[f] = 99; confirmed.push(f); }
      const m = /^plots\.(\d+)$/.exec(f);
      if (m && normalized.plots[Number(m[1])]) { normalized.plots[Number(m[1])].confidence = 99; confirmed.push(f); }
    });
    if (changed.includes('plots')) {
      normalized.plots = normalized.plots.map((p, i) => {
        const old = before.plots[i];
        return old && JSON.stringify({ ...old, confidence: 0 }) === JSON.stringify({ ...p, confidence: 0 }) ? { ...p, confidence: old.confidence } : { ...p, confidence: 99 };
      });
    }
    normalized.fieldConfidences = fc as LandRecord['fieldConfidences'];
    if (changed.length === 0 && confirmed.length === 0) return rec;

    Object.assign(rec, normalized);
    if (rec.status === 'অনুমোদিত') {
      rec.status = 'সংশোধিত';
      rec.dateVerified = undefined;
      rec.verifiedBy = undefined;
    } else {
      rec.status = 'সংশোধিত';
    }
    this.revalidate(rec);
    const parts: string[] = [];
    changed.forEach((k) => {
      const o = (before as unknown as Record<string, unknown>)[k];
      const n = (rec as unknown as Record<string, unknown>)[k];
      parts.push(typeof o === 'object' ? `${LABEL[k]} সংশোধিত` : `${LABEL[k]}: "${String(o)}" → "${String(n)}"`);
    });
    if (confirmed.length) parts.push(`মানুষ নিশ্চিত করেছে: ${confirmed.map((c) => LABEL[c] ?? c).join(', ')}`);
    this.appendAudit(rec, actor, before.status === 'অনুমোদিত' ? 'অনুমোদিত রেকর্ড সংশোধিত — পুনরায় অনুমোদন প্রয়োজন' : 'মানব রিভিউ ও সংশোধন', parts.join('; '));
    this.persist();
    return rec;
  }

  // ---- অনুমোদন (সার্ভার নিজে আবার যাচাই করে; ভুল থাকলে আটকায়) ----
  approve(id: string, actor: Actor): LandRecord {
    const rec = this.get(id);
    if (rec.status === 'অনুমোদিত') throw new StoreError(409, 'already', 'রেকর্ডটি আগেই অনুমোদিত।');
    if (rec.status === 'প্রত্যাখ্যাত') throw new StoreError(409, 'rejected', 'প্রত্যাখ্যাত রেকর্ড অনুমোদন করা যায় না।');
    const checks = validateLandRecord(rec, this.records);
    if (hasBlockingErrors(checks)) {
      throw new StoreError(422, 'validation', 'যাচাইয়ে ভুল আছে; সংশোধন ছাড়া অনুমোদন সম্ভব নয়।', { issues: (checks.issues ?? []).filter((i) => i.severity === 'error') });
    }
    rec.status = 'অনুমোদিত';
    rec.dateVerified = dhakaToday();
    rec.verifiedBy = `${actor.name} (${ROLE_BN[actor.role] ?? actor.role})`;
    this.revalidate(rec);
    const warns = (rec.checks.issues ?? []).filter((i) => i.severity === 'warning').length;
    this.appendAudit(rec, actor, 'চূড়ান্ত অনুমোদন ও ডিজিটাল আর্কাইভে সংরক্ষণ', `ভুল ০টি; সতর্কতা ${toBn(String(warns))}টি মানুষ দেখে নিশ্চিত করেছে`);
    this.persist();
    return rec;
  }

  reject(id: string, reason: string, actor: Actor): LandRecord {
    const rec = this.get(id);
    const why = String(reason ?? '').trim().slice(0, 300);
    if (!why) throw new StoreError(400, 'reason', 'প্রত্যাখ্যানের কারণ লিখুন।');
    if (rec.status === 'প্রত্যাখ্যাত') throw new StoreError(409, 'already', 'রেকর্ডটি আগেই প্রত্যাখ্যাত।');
    rec.status = 'প্রত্যাখ্যাত';
    this.appendAudit(rec, actor, 'রেকর্ড প্রত্যাখ্যান', `প্রত্যাখ্যানের কারণ: ${why}`);
    this.persist();
    return rec;
  }

  verify(id: string): VerifyResult {
    return verifyRecord(this.get(id));
  }

  /** শুধু পরীক্ষার জন্য: ফাইল থেকে নতুন করে লোড */
  reload() {
    this.records = JSON.parse(fs.readFileSync(this.file, 'utf8')).records as LandRecord[];
  }
}
