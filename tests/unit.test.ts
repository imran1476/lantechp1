// চালানো: npm test   (tsx --test)
import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_LAND_RECORDS } from '../src/data/sampleRecords';
import type { LandRecord } from '../src/types';
import { hasBlockingErrors, normalizeRecord, parseShare, toDecimalArea, validateLandRecord } from '../src/utils/validation';
import { scoreBangla, fuzzyMatchBangla } from '../src/utils/banglaSearch';
import { computeRelatedRecords } from '../src/utils/linking';
import { autoContrast, estimateSkew, medianFilter3 } from '../src/utils/imagePreprocess';
import { canonicalJson, chainHash, computeRecordHash, verifyRecord } from '../server/integrity';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const base = (): LandRecord => clone(INITIAL_LAND_RECORDS[0]);
const rules = (c: ReturnType<typeof validateLandRecord>, sev?: 'error' | 'warning') =>
  (c.issues ?? []).filter((i) => !sev || i.severity === sev).map((i) => i.rule);

test('সব নমুনা রেকর্ডে কোনো ভুল (error) নেই, শুধু ইচ্ছাকৃত ডেমো রেকর্ডে আছে', () => {
  for (const r of INITIAL_LAND_RECORDS) {
    const c = validateLandRecord(r, INITIAL_LAND_RECORDS);
    if (r.id === 'rec-1260') assert.ok(hasBlockingErrors(c), 'ডেমো রেকর্ডে ভুল থাকার কথা');
    else assert.equal(hasBlockingErrors(c), false, `${r.id}: ${c.notes}`);
  }
});

test('নিয়ম ১: বাংলা অঙ্ক ইংরেজিতে রূপান্তর, আর অপাঠ্য সংখ্যায় ভুল', () => {
  const n = normalizeRecord({ ...base(), khatianNo: '১২৩৪', dagNo: '৫৬৭' });
  assert.equal(n.khatianNo, '1234');
  assert.equal(n.khatianNoBn, '১২৩৪');
  const bad = validateLandRecord({ ...base(), khatianNo: '12ab' });
  assert.ok(rules(bad, 'error').includes(1));
});

test('নিয়ম ২: অংশের যোগফল', () => {
  const r = base();
  r.owners = [{ ...r.owners[0], share: '১/২' }, { ...r.owners[1], share: '১/৩' }];
  const c = validateLandRecord(r);
  assert.equal(c.sharesSum, 'mismatch');
  assert.ok(rules(c, 'error').includes(2));
  r.owners = [{ ...r.owners[0], share: '৮ আনা' }, { ...r.owners[1], share: '০.৫০' }];
  assert.equal(validateLandRecord(r).sharesSum, 'ok');
  r.owners = [{ ...r.owners[0], share: 'অজানা' }];
  assert.equal(validateLandRecord(r).sharesSum, 'invalid'); // পড়া না গেলে আগের মতো পাস নয়
});

test('নিয়ম ২: share পার্সিং', () => {
  assert.equal(parseShare('১/২'), 0.5);
  assert.equal(parseShare('৪ আনা'), 0.25);
  assert.equal(parseShare('১/২ (০.৫০)'), 0.5);
  assert.equal(parseShare('abc'), null);
  assert.equal(parseShare('১/০'), null);
});

test('নিয়ম ৩ ও ৪: একর/শতক মেশালে রূপান্তর করে মেলানো, না মিললে ভুল', () => {
  const r = base();
  r.totalArea = 0.27; r.areaUnit = 'একর';
  r.plots = [{ ...r.plots[0], area: 12, areaUnit: 'শতক' }, { ...r.plots[0], dagNo: '568', area: 0.15, areaUnit: 'একর' }];
  const c = validateLandRecord(r);
  assert.equal(c.areaSum, 'ok', 'শতকে ১২ + একরে ০.১৫ (=১৫) = ২৭ শতক = ০.২৭ একর');
  assert.equal(c.unitConsistency, 'mismatch'); // একক মেশানো → সতর্কতা
  assert.ok(rules(c, 'warning').includes(4));
  r.totalArea = 0.30;
  const c2 = validateLandRecord(r);
  assert.equal(c2.areaSum, 'mismatch');
  assert.ok(rules(c2, 'error').includes(3));
  assert.equal(toDecimalArea(1, 'একর'), 100);
});

test('নিয়ম ৫: অবৈধ জরিপ', () => {
  const c = validateLandRecord({ ...base(), surveyType: 'XS' as never });
  assert.equal(c.surveyValid, 'invalid');
  assert.ok(rules(c, 'error').includes(5));
});

test('নিয়ম ৬: বাধ্যতামূলক ফিল্ড', () => {
  const c = validateLandRecord({ ...base(), mouza: '', owners: [] });
  assert.equal(c.mandatoryFields, 'missing');
  assert.ok(c.fieldStatus?.mouza === 'error' && c.fieldStatus?.owners === 'error');
});

test('নিয়ম ৭: একই দাগ একই জরিপের অন্য খতিয়ানে — অংশ > ১ হলে সতর্কতা, ভাগ করা হলে নয়', () => {
  const a = base();                       // RS খতিয়ান ১২৩৪, দাগ ৫৬৭
  const b = clone(a); b.id = 'x'; b.khatianNo = '9999';
  const all = [a, b];
  assert.ok(rules(validateLandRecord(a, all), 'warning').includes(7));
  a.plots[0].dagShare = '১/২'; b.plots[0].dagShare = '১/২';
  assert.equal(validateLandRecord(a, all).dagOverlap, 'ok');
  const dup = clone(a); dup.id = 'y';    // একই খতিয়ান নম্বর
  assert.ok((validateLandRecord(a, [a, dup]).issues ?? []).some((i) => i.rule === 7 && /ডুপ্লিকেট/.test(i.message)));
});

test('নিয়ম ৮: কম কনফিডেন্স হলুদ', () => {
  const r = base();
  r.fieldConfidences = { ...r.fieldConfidences, mouza: 60 };
  const c = validateLandRecord(r);
  assert.deepEqual(c.lowConfidenceFields, ['mouza']);
  assert.equal(c.fieldStatus?.mouza, 'warn');
  assert.equal(hasBlockingErrors(c), false); // শুধু সতর্কতা, আটকায় না
});

test('বাংলা ফাজি সার্চ: নামের বানান-বৈচিত্র্য মেলে, ভিন্ন নাম মেলে না', () => {
  assert.ok(scoreBangla('মোঃ আব্দুল করিম', 'মোহাম্মদ আব্দুল করিম') > 0.95);
  assert.ok(scoreBangla('মোঃ আব্দুল করিম', 'Md. আব্দুল করিম') > 0.95);
  assert.ok(scoreBangla('মোঃ আবদুল করীম', 'আব্দুল করিম') > 0.95);   // ই/ঈ, আবদুল/আব্দুল
  assert.ok(fuzzyMatchBangla('সেলিনা বেগম', 'সেলিনা'));
  assert.equal(fuzzyMatchBangla('মোঃ আব্দুল করিম', 'আব্দুল রহিম'), false); // শুধু একটা শব্দ মিললে হবে না
  assert.equal(fuzzyMatchBangla('কাশিমপুর', 'গোবিন্দপুর'), false);
  assert.equal(scoreBangla('১২৩৪', '1234'), 1);                    // বাংলা/ইংরেজি অঙ্ক
});

test('জরিপ-লিংক: একই মৌজা ও দাগের অন্য জরিপ জোড়া লাগে, নিজের জরিপ বাদ', () => {
  const rs = INITIAL_LAND_RECORDS.find((r) => r.id === 'rec-1234')!;
  const rel = computeRelatedRecords(rs, INITIAL_LAND_RECORDS);
  assert.deepEqual(rel.map((x) => x.surveyType), ['CS', 'SA', 'BS']);
  assert.ok(rel.every((x) => x.matchPercentage >= 20 && x.matchPercentage <= 99));
  const bs = rel.find((x) => x.surveyType === 'BS')!;
  const cs = rel.find((x) => x.surveyType === 'CS')!;
  assert.ok(bs.matchPercentage > cs.matchPercentage, 'একই মালিকের BS-এর মিল বেশি হওয়ার কথা');
});

// ---- ছবি পরিষ্কার ----
function syntheticPage(w: number, h: number, angleDeg: number): Uint8ClampedArray {
  const g = new Uint8ClampedArray(w * h).fill(255);
  const a = (angleDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cx = w / 2, cy = h / 2;
  for (let line = 0; line < 20; line++) {
    for (let t = 0; t < 6; t++) {
      for (let x = 80; x < w - 80; x++) {
        if ((x / 7) % 3 < 2) {                // শব্দের মতো ফাঁক
          const y0 = 100 + line * 30 + t;
          const xr = cx + (x - cx) * c - (y0 - cy) * s, yr = cy + (x - cx) * s + (y0 - cy) * c;
          const xi = Math.round(xr), yi = Math.round(yr);
          if (xi >= 0 && xi < w && yi >= 0 && yi < h) g[yi * w + xi] = 0;
        }
      }
    }
  }
  return g;
}

test('কাত অনুমান: ৩°, -২.৫°, ০° ধরতে পারে', () => {
  for (const ang of [3, -2.5, 0, 6]) {
    const est = estimateSkew(syntheticPage(700, 800, ang), 700, 800);
    assert.ok(Math.abs(est - ang) <= 0.5, `প্রকৃত ${ang}°, অনুমান ${est}°`);
  }
});

test('মিডিয়ান ফিল্টার একক-পিক্সেল নয়েজ সরায়; কনট্রাস্ট ফ্যাকাসে ছবি টানে', () => {
  const w = 20, h = 20;
  const g = new Uint8ClampedArray(w * h).fill(200);
  g[10 * w + 10] = 0; // salt-and-pepper
  assert.equal(medianFilter3(g, w, h)[10 * w + 10], 200);
  const faded = new Uint8ClampedArray(1000).map((_, i) => 120 + (i % 20)); // ১২০–১৩৯
  const out = autoContrast(faded);
  assert.ok(Math.max(...out) - Math.min(...out) > 200);
});

// ---- অখণ্ডতা (হ্যাশ-চেইন) ----
test('canonicalJson কী-ক্রম নির্বিশেষে এক', () => {
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] }), canonicalJson({ a: [2, { c: 2, d: 1 }], b: 1 }));
});

test('হ্যাশ-চেইন: ঠিক থাকলে ok, লগ/তথ্য বদলালে ধরা পড়ে', () => {
  const r = base();
  r.auditLogs = [];
  const add = (action: string) => {
    const prev = r.auditLogs.length ? r.auditLogs[r.auditLogs.length - 1].hash : '';
    const recordHash = computeRecordHash(r);
    const e = { id: `log-${r.auditLogs.length + 1}`, timestamp: 't', action, operator: 'x', details: 'd', prevHash: prev, recordHash };
    r.auditLogs.push({ ...e, hash: chainHash(prev, e) });
    r.recordHash = recordHash;
  };
  add('এক'); add('দুই');
  assert.equal(verifyRecord(r).ok, true);
  const t1 = clone(r); t1.owners[0].name = 'জালিয়াত';
  assert.equal(verifyRecord(t1).ok, false);
  const t2 = clone(r); t2.auditLogs[0].details = 'বদলানো';
  assert.equal(verifyRecord(t2).chainOk, false);
  const t3 = clone(r); t3.auditLogs.shift();
  assert.equal(verifyRecord(t3).chainOk, false);
});
