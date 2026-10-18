import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  FileSpreadsheet,
  CheckCircle2,
  Save,
  ArrowRight,
  Info,
  Sparkles,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { LandRecord, SurveyType, DocType, Owner, PlotInfo } from '../types';
import { toBengaliDigits, toEnglishDigits } from '../utils/bengaliUtils';
import { validateLandRecord, toDecimalArea } from '../utils/validation';
import { NavTab } from './Sidebar';

interface ExtractionViewProps {
  currentRecord: LandRecord;
  /** অন্য রেকর্ড (নিয়ম ৭: একই দাগ একাধিক খতিয়ানে — মেলাতে লাগে) */
  records?: LandRecord[];
  onUpdateRecord: (updated: LandRecord) => Promise<boolean> | void;
  onNavigate: (tab: NavTab) => void;
}

export const ExtractionView: React.FC<ExtractionViewProps> = ({
  currentRecord,
  records = [],
  onUpdateRecord,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [docType, setDocType] = useState<DocType>(currentRecord.docType);
  const [surveyType, setSurveyType] = useState<SurveyType>(currentRecord.surveyType);
  const [district, setDistrict] = useState(currentRecord.district);
  const [upazila, setUpazila] = useState(currentRecord.upazila);
  const [mouza, setMouza] = useState(currentRecord.mouza);
  const [khatianNo, setKhatianNo] = useState(currentRecord.khatianNo);
  const [dagNo, setDagNo] = useState(currentRecord.dagNo);
  const [totalArea, setTotalArea] = useState<string>(String(currentRecord.totalArea));
  const [areaUnit, setAreaUnit] = useState(currentRecord.areaUnit);
  const [owners, setOwners] = useState<Owner[]>(currentRecord.owners.map((o) => ({ ...o })));
  const [boundaryText, setBoundaryText] = useState(
    `উত্তরে-${currentRecord.boundaries.north}, দক্ষিণে-${currentRecord.boundaries.south}, পূর্বে-${currentRecord.boundaries.east}, পশ্চিমে-${currentRecord.boundaries.west}`
  );
  const [plots, setPlots] = useState<PlotInfo[]>(currentRecord.plots.map((p) => ({ ...p })));
  const [savedNotification, setSavedNotification] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // সম্পাদনার সময়ই লাইভ যাচাই — ভুল সংরক্ষণের আগেই দেখা যায়
  const draft: LandRecord = {
    ...currentRecord, docType, surveyType, district, upazila, mouza,
    khatianNo: toEnglishDigits(khatianNo), dagNo: toEnglishDigits(dagNo),
    totalArea: parseFloat(toEnglishDigits(totalArea)) || 0, areaUnit, owners, plots,
  };
  const draftChecks = validateLandRecord(draft, records);
  const draftIssues = draftChecks.issues ?? [];
  const totalDecimal = toDecimalArea(draft.totalArea, areaUnit);
  const plotsDecimal = plots.reduce((sum, p) => sum + (toDecimalArea(Number(p.area) || 0, p.areaUnit) ?? 0), 0);

  const updatePlot = (idx: number, patch: Partial<PlotInfo>) =>
    setPlots(plots.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const addPlot = () =>
    setPlots([...plots, { dagNo: '', dagNoBn: '', landClass: '', area: 0, areaUnit, confidence: 99 }]);
  const removePlot = (idx: number) => setPlots(plots.filter((_, i) => i !== idx));

  const handleSave = async (): Promise<boolean> => {
    const areaNum = parseFloat(toEnglishDigits(totalArea)) || 0;
    const updated: LandRecord = {
      ...currentRecord,
      docType,
      surveyType,
      district,
      upazila,
      mouza,
      khatianNo: toEnglishDigits(khatianNo),
      khatianNoBn: toBengaliDigits(khatianNo),
      dagNo: toEnglishDigits(dagNo),
      dagNoBn: toBengaliDigits(dagNo),
      totalArea: areaNum,
      totalAreaBn: toBengaliDigits(areaNum),
      areaUnit,
      owners,
      plots,
    };
    setSaveError(null);
    const ok = await onUpdateRecord(updated);
    if (ok === false) {
      setSaveError('সংরক্ষণ করা যায়নি (সার্ভার/অনুমতি/সেশন সমস্যা)।');
      return false;
    }
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
    return true;
  };

  const handleNext = async () => {
    if (await handleSave()) onNavigate('verification');
  };

  const addOwner = () => {
    const newOwner: Owner = {
      id: `o-${Date.now()}`,
      name: 'নতুন মালিকের নাম',
      fatherOrSpouse: '',
      share: '১/২',
      shareDecimal: 0.5,
      address: `${mouza}, ${upazila}, ${district}`,
    };
    setOwners([...owners, newOwner]);
  };

  const removeOwner = (id: string) => {
    if (owners.length <= 1) return;
    setOwners(owners.filter((o) => o.id !== id));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-2xl font-extrabold text-fg tracking-tight flex items-center gap-2">
            <span>{t('title.extraction')}</span>
          </h1>
          <p className="text-sm sm:text-sm text-fg-muted mt-1">
            মেশিন নিষ্কাশিত ক্ষেত্রসমূহ সম্পাদনা করুন এবং বাংলা হরফ ও সংখ্যা স্বাভাবিকীকরণ নিশ্চিত করুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-raised text-fg border border-line text-sm font-semibold transition"
          >
            <Save className="w-3.5 h-3.5 text-primary" />
            <span>সংরক্ষণ</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary text-on-primary font-bold text-sm shadow-md transition cursor-pointer"
          >
            <span>পরবর্তী: যাচাই</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveError && (
        <div role="alert" className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">{saveError}</div>
      )}

      {savedNotification && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            তথ্য সফলভাবে আপডেট ও সংরক্ষিত হয়েছে!
          </span>
          <span className="font-mono text-sm">সার্ভারে সংরক্ষিত</span>
        </div>
      )}

      {/* Main Extraction Form matching Screen 5 */}
      <div className="p-6 rounded-2xl bg-surface border border-line space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 className="text-base font-bold text-fg">এক্সট্র্যাক্টেড তথ্য (সম্পাদনাযোগ্য)</h2>
            <p className="text-sm text-fg-muted">প্রতিটি ফিল্ডের পাশে তারকা (*) চিহ্নিত ঘরগুলো বাধ্যতামূলক</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            <Info className="w-3.5 h-3.5" />
            <span>নির্দেশিকা</span>
          </div>
        </div>

        {/* 2-Column Grid of Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          {/* Document Type */}
          <div className="space-y-1.5">
            <label className="font-semibold text-fg-muted">নথির ধরন *</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="খতিয়ান">খতিয়ান</option>
              <option value="পর্চা">পর্চা</option>
              <option value="দলিল">দলিল</option>
              <option value="নামজারি">নামজারি / ডিসিআর</option>
              <option value="অন্যান্য">অন্যান্য</option>
            </select>
          </div>

          {/* Survey Type */}
          <div className="space-y-1.5">
            <label className="font-semibold text-fg-muted">জরিপের ধরন *</label>
            <select
              value={surveyType}
              onChange={(e) => setSurveyType(e.target.value as SurveyType)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono font-bold text-primary"
            >
              <option value="RS">RS (রিভিশনাল সার্ভে)</option>
              <option value="CS">CS (ক্যাডাস্ট্রাল সার্ভে)</option>
              <option value="SA">SA (স্টেট অ্যাকুইজিশন)</option>
              <option value="BS">BS / City (বাংলাদেশ সার্ভে)</option>
            </select>
          </div>

          {/* District */}
          <div className="space-y-1.5">
            <label className="font-semibold text-fg-muted">জেলা *</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="যেমন: ঢাকা"
            />
          </div>

          {/* Upazila / Thana */}
          <div className="space-y-1.5">
            <label className="font-semibold text-fg-muted">উপজেলা/থানা *</label>
            <input
              type="text"
              value={upazila}
              onChange={(e) => setUpazila(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="যেমন: সাভার"
            />
          </div>

          {/* Mouza */}
          <div className="space-y-1.5">
            <label className="font-semibold text-fg-muted">মৌজা *</label>
            <input
              type="text"
              value={mouza}
              onChange={(e) => setMouza(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="যেমন: কাশিমপুর"
            />
          </div>

          {/* Khatian Number */}
          <div className="space-y-1.5">
            <label className="font-semibold text-fg-muted flex items-center justify-between">
              <span>খতিয়ান নম্বর *</span>
              <span className="text-sm text-primary font-mono">বাংলা: {toBengaliDigits(khatianNo)}</span>
            </label>
            <input
              type="text"
              value={khatianNo}
              onChange={(e) => setKhatianNo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono font-bold"
              placeholder="1234"
            />
          </div>

          {/* Dag Number */}
          <div className="space-y-1.5">
            <label className="font-semibold text-fg-muted flex items-center justify-between">
              <span>দাগ নম্বর *</span>
              <span className="text-sm text-warning font-mono">বাংলা: {toBengaliDigits(dagNo)}</span>
            </label>
            <input
              type="text"
              value={dagNo}
              onChange={(e) => setDagNo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-raised border border-accent/50 text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono font-bold"
              placeholder="567"
            />
          </div>

          {/* Total Area & Unit */}
          <div className="space-y-1.5">
            <label className="font-semibold text-fg-muted flex items-center justify-between">
              <span>জমির পরিমাণ *</span>
              <span className="text-sm text-fg-muted font-mono">
                শতকে: {(totalDecimal ?? 0).toFixed(2)} শতক
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={totalArea}
                onChange={(e) => setTotalArea(e.target.value)}
                className="col-span-2 px-3 py-2.5 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono font-bold"
                placeholder="0.12"
              />
              <select
                value={areaUnit}
                onChange={(e) => setAreaUnit(e.target.value as any)}
                className="px-2 py-2.5 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none"
              >
                <option value="একর">একর</option>
                <option value="শতক">শতক</option>
                <option value="কাঠা">কাঠা</option>
              </select>
            </div>
          </div>
        </div>

        {/* Owners Section */}
        <div className="space-y-3 pt-3 border-t border-line">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-fg-muted text-sm">
              মালিকের নাম ও অংশ (স্বত্বাংশ তালিকা):
            </label>
            <button
              type="button"
              onClick={addOwner}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন মালিক যোগ করুন</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {owners.map((owner, idx) => (
              <div
                key={owner.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl bg-surface-raised/40 border border-line/60 items-center text-sm"
              >
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    value={owner.name}
                    onChange={(e) => {
                      setOwners(owners.map((o, i) => (i === idx ? { ...o, name: e.target.value } : o)));
                    }}
                    placeholder="মালিকের নাম"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-raised border border-line text-fg"
                  />
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={owner.fatherOrSpouse}
                    onChange={(e) => {
                      setOwners(owners.map((o, i) => (i === idx ? { ...o, fatherOrSpouse: e.target.value } : o)));
                    }}
                    placeholder="পিতা / স্বামীর নাম"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-raised border border-line text-fg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={owner.share}
                    onChange={(e) => {
                      setOwners(owners.map((o, i) => (i === idx ? { ...o, share: e.target.value } : o)));
                    }}
                    placeholder="অংশ (১/২)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-raised border border-line text-fg font-mono text-center"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeOwner(owner.id)}
                    disabled={owners.length <= 1}
                    className="p-1 rounded text-fg-muted hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plots Section: প্রতিটি দাগের শ্রেণি ও ক্ষেত্রফল (নিয়ম ৩ ও ৭-এর জন্য দরকার) */}
        <div className="space-y-3 pt-3 border-t border-line">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-fg-muted text-sm">
              দাগ-তালিকা (প্রতিটি দাগের শ্রেণি ও ক্ষেত্রফল):
            </label>
            <button
              type="button"
              onClick={addPlot}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন দাগ যোগ করুন</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {plots.length === 0 && <p className="text-sm text-fg-muted">কোনো দাগ নেই — "নতুন দাগ" চাপুন।</p>}
            {plots.map((plot, idx) => {
              const st = draftChecks.fieldStatus?.[`plots.${idx}.area`] ?? 'ok';
              const border = st === 'error' ? 'border-danger/60' : st === 'warn' ? 'border-accent/60' : 'border-line/60';
              return (
                <div key={idx} className={`grid grid-cols-2 sm:grid-cols-12 gap-2 p-2.5 rounded-xl bg-surface-raised/40 border ${border} items-center text-sm`}>
                  <input type="text" value={plot.dagNo} onChange={(e) => updatePlot(idx, { dagNo: e.target.value })}
                    placeholder="দাগ নং" aria-label="দাগ নং" className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-line text-fg font-mono" />
                  <input type="text" value={plot.landClass} onChange={(e) => updatePlot(idx, { landClass: e.target.value })}
                    placeholder="শ্রেণি (ধানি/ভিটা…)" aria-label="জমির শ্রেণি" className="sm:col-span-3 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-line text-fg" />
                  <input type="text" value={String(plot.area)} onChange={(e) => updatePlot(idx, { area: parseFloat(toEnglishDigits(e.target.value)) || 0 })}
                    placeholder="ক্ষেত্রফল" aria-label="ক্ষেত্রফল" className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-line text-fg font-mono" />
                  <select value={plot.areaUnit} onChange={(e) => updatePlot(idx, { areaUnit: e.target.value as PlotInfo['areaUnit'] })}
                    aria-label="একক" className="sm:col-span-2 px-2 py-1.5 rounded-lg bg-surface-raised border border-line text-fg">
                    <option value="একর">একর</option>
                    <option value="শতক">শতক</option>
                    <option value="কাঠা">কাঠা</option>
                  </select>
                  <input type="text" value={plot.dagShare ?? ''} onChange={(e) => updatePlot(idx, { dagShare: e.target.value })}
                    placeholder="দাগের অংশ (ঐচ্ছিক)" aria-label="দাগের অংশ" className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-line text-fg font-mono text-center" />
                  <button type="button" onClick={() => removePlot(idx)} aria-label="দাগ মুছুন"
                    className="sm:col-span-1 p-1 rounded text-fg-muted hover:text-danger justify-self-end">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-fg-muted font-mono">
            দাগগুলোর যোগফল: <b className="text-fg">{plotsDecimal.toFixed(2)}</b> শতক | মোট জমি: <b className="text-fg">{(totalDecimal ?? 0).toFixed(2)}</b> শতক
          </p>
        </div>

        {/* লাইভ যাচাই: সংরক্ষণের আগেই ভুল দেখা যায় */}
        <div className="space-y-2 pt-3 border-t border-line" aria-live="polite">
          <div className="flex items-center justify-between text-sm font-semibold text-fg-muted">
            <span>স্বয়ংক্রিয় যাচাই (নিয়ম ১–৮)</span>
            <span className={draftIssues.some((i) => i.severity === 'error') ? 'text-danger' : draftIssues.length ? 'text-warning' : 'text-primary'}>
              {draftIssues.some((i) => i.severity === 'error')
                ? `${draftIssues.filter((i) => i.severity === 'error').length}টি ভুল`
                : draftIssues.length ? `${draftIssues.length}টি সতর্কতা` : 'সব ঠিক'}
            </span>
          </div>
          {draftIssues.length === 0 ? (
            <p className="text-sm text-primary">কোনো সমস্যা পাওয়া যায়নি।</p>
          ) : (
            <ul className="space-y-1">
              {Array.from(new Map(draftIssues.map((i) => [`${i.rule}-${i.message}`, i])).values()).map((i) => (
                <li key={`${i.rule}-${i.field}-${i.message}`} className={`text-sm flex gap-2 ${i.severity === 'error' ? 'text-danger' : 'text-warning'}`}>
                  <span className="font-mono shrink-0">নিয়ম {toBengaliDigits(i.rule)}</span>
                  <span>{i.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Boundaries / Other info */}
        <div className="space-y-1.5 pt-3 border-t border-line">
          <label className="font-semibold text-fg-muted text-sm">
            অন্যান্য তথ্য / চৌহদ্দি ও সীমানা:
          </label>
          <textarea
            value={boundaryText}
            onChange={(e) => setBoundaryText(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            placeholder="উত্তরে-রহিম, দক্ষিণে-কামাল, পূর্বে-রফিক, পশ্চিমে-রাস্তা"
          />
        </div>

        {/* Bottom Actions matching Screen 5 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-raised text-fg text-sm font-semibold border border-line transition"
          >
            সংরক্ষণ
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary text-on-primary text-sm font-bold shadow-md transition cursor-pointer flex items-center gap-2"
          >
            <span>পরবর্তী: যাচাই</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
