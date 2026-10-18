// জরিপ ক্রস-লিংকিং (CS → SA → RS → BS): একই মৌজার একই দাগের খতিয়ানগুলো জোড়া লাগিয়ে মালিকানার ধারা দেখানো।
// এটি প্রাথমিক (heuristic) মিল: দাগ নম্বর মিলতে হবে; স্কোর = মালিকের নাম + ক্ষেত্রফলের কাছাকাছি হওয়ার ওপর।
// ওয়ারিশ-ক্রমে নাম বদলায়, তাই কম স্কোর মানে "ভুল" নয়, "মানুষকে দেখে নিশ্চিত করতে হবে"।
import type { LandRecord, RelatedSurveyRecord, SurveyType } from '../types';
import { scoreBangla } from './banglaSearch';
import { toDecimalArea } from './validation';

const ORDER: SurveyType[] = ['CS', 'SA', 'RS', 'BS'];
const BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const toBn = (v: string | number) => String(v).replace(/[0-9]/g, (d) => BN[Number(d)]);
const toAscii = (s: string) => String(s ?? '').replace(/[০-৯]/g, (d) => String(BN.indexOf(d))).trim();

const dagSet = (r: LandRecord): Set<string> => {
  const s = new Set<string>();
  (r.plots ?? []).forEach((p) => p.dagNo && s.add(toAscii(p.dagNo)));
  if (s.size === 0 && r.dagNo) s.add(toAscii(r.dagNo));
  return s;
};

const areaDecimal = (r: LandRecord) => toDecimalArea(Number(r.totalArea), r.areaUnit) ?? 0;

export function computeRelatedRecords(record: LandRecord, all: LandRecord[]): RelatedSurveyRecord[] {
  const mine = dagSet(record);
  const myArea = areaDecimal(record);
  const out: Array<RelatedSurveyRecord & { _o: number }> = [];

  for (const other of all) {
    if (other.id === record.id || other.status === 'প্রত্যাখ্যাত') continue;
    if (other.surveyType === record.surveyType) continue;
    if (other.district !== record.district || other.upazila !== record.upazila || other.mouza !== record.mouza) continue;
    const common = [...dagSet(other)].filter((d) => mine.has(d));
    if (common.length === 0) continue;

    let nameScore = 0;
    for (const a of record.owners ?? []) for (const b of other.owners ?? []) nameScore = Math.max(nameScore, scoreBangla(b.name, a.name));
    const oa = areaDecimal(other);
    const areaScore = myArea > 0 && oa > 0 ? Math.min(myArea, oa) / Math.max(myArea, oa) : 0;
    const pct = Math.round(100 * (0.2 + 0.6 * nameScore + 0.2 * areaScore));

    out.push({
      surveyType: other.surveyType,
      khatianNo: other.khatianNo,
      dagNo: common[0],
      matchPercentage: Math.min(pct, 99),
      ownerName: other.owners?.[0]?.name ?? '—',
      area: `${toBn(other.totalArea)} ${other.areaUnit}`,
      _o: ORDER.indexOf(other.surveyType),
    });
  }
  return out.sort((a, b) => a._o - b._o || b.matchPercentage - a.matchPercentage).map(({ _o, ...rest }) => rest);
}
