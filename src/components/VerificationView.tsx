import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Calculator, CheckCircle2, Edit3, XCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { LandRecord, ValidationIssue } from '../types';
import { toBengaliDigits } from '../utils/bengaliUtils';
import { CONFIDENCE_THRESHOLD, validateLandRecord } from '../utils/validation';
import { DocumentViewer } from './DocumentViewer';
import { NavTab } from './Sidebar';

interface ActionResult { ok: boolean; record?: LandRecord; message?: string; issues?: Array<{ rule: number; severity: string; field: string; message: string }> }

interface VerificationViewProps {
  currentRecord: LandRecord;
  records?: LandRecord[];
  canReview?: boolean;
  onApproveRecord: (record: LandRecord) => Promise<ActionResult> | ActionResult | void;
  onRejectRecord: (recordId: string, reason: string) => Promise<ActionResult> | ActionResult | void;
  onUpdateRecord: (updated: LandRecord) => Promise<boolean> | void;
  onNavigate: (tab: NavTab) => void;
}

type Status = 'ok' | 'warn' | 'error';
const STYLE: Record<Status, { row: string; badge: string; label: string }> = {
  ok: { row: 'bg-surface-raised/40 border-line/60', badge: 'bg-primary/10 text-primary border-primary/20', label: 'text-fg-muted' },
  warn: { row: 'bg-accent/10 border-accent/40', badge: 'bg-accent/20 text-warning border-accent/30', label: 'text-warning' },
  error: { row: 'bg-danger/10 border-danger/40', badge: 'bg-danger/10 text-danger border-danger/30', label: 'text-danger' },
};

const RULES: Array<{ n: ValidationIssue['rule']; text: string }> = [
  { n: 1, text: 'অঙ্ক স্বাভাবিকীকরণ (বাংলা ⇄ ইংরেজি)' },
  { n: 2, text: 'মালিকদের অংশের যোগফল = ১' },
  { n: 3, text: 'দাগের ক্ষেত্রফলের যোগফল = মোট জমি' },
  { n: 4, text: 'এককের সামঞ্জস্য (১ একর = ১০০ শতক)' },
  { n: 5, text: 'বৈধ জরিপ (CS / SA / RS / BS)' },
  { n: 6, text: 'বাধ্যতামূলক ফিল্ড (মৌজা, খতিয়ান, দাগ, মালিক)' },
  { n: 7, text: 'একই দাগ একাধিক খতিয়ানে / ডুপ্লিকেট' },
  { n: 8, text: `OCR কনফিডেন্স ≥ ${toBengaliDigits(CONFIDENCE_THRESHOLD)}%` },
];

export const VerificationView: React.FC<VerificationViewProps> = ({
  currentRecord, records = [], canReview = true, onApproveRecord, onRejectRecord, onUpdateRecord, onNavigate,
}) => {
  const { t } = useLanguage();
  const [activeHighlight, setActiveHighlight] = useState<string | null>('dagNo');
  const [isEditing, setIsEditing] = useState(false);
  const [editingDag, setEditingDag] = useState(currentRecord.dagNo);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; issues?: ActionResult['issues'] } | null>(null);
  const [busy, setBusy] = useState(false);

  // লাইভ যাচাই — সার্ভারও অনুমোদনের সময় একই কোড আবার চালায়
  const checks = useMemo(() => validateLandRecord(currentRecord, records), [currentRecord, records]);
  const issues = checks.issues ?? [];
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const fs = checks.fieldStatus ?? {};
  const fc = currentRecord.fieldConfidences as unknown as Record<string, number>;
  const status = (key: string): Status => (fs[key] as Status) ?? 'ok';
  const isApproved = currentRecord.status === 'অনুমোদিত';
  const isRejected = currentRecord.status === 'প্রত্যাখ্যাত';

  const rulesView = RULES.map((r) => {
    const list = issues.filter((i) => i.rule === r.n);
    const st: Status = list.some((i) => i.severity === 'error') ? 'error' : list.length ? 'warn' : 'ok';
    return { ...r, st, messages: Array.from(new Set(list.map((i) => i.message))) };
  });
  const passed = rulesView.filter((r) => r.st === 'ok').length;

  const confirmField = async (key: string) => {
    await onUpdateRecord({ ...currentRecord, fieldConfidences: { ...currentRecord.fieldConfidences, [key]: 99 } as LandRecord['fieldConfidences'] });
  };

  const handleQuickFixDag = async () => {
    const old = currentRecord.dagNo;
    const ok = await onUpdateRecord({
      ...currentRecord,
      dagNo: editingDag,
      plots: currentRecord.plots.map((p) => (p.dagNo === old ? { ...p, dagNo: editingDag } : p)),
      fieldConfidences: { ...currentRecord.fieldConfidences, dagNo: 99 },
    });
    if (ok !== false) setIsEditing(false);
  };

  const handleApprove = async () => {
    setBusy(true);
    setError(null);
    const res = (await onApproveRecord(currentRecord)) as ActionResult | undefined;
    setBusy(false);
    if (res?.ok && res.record) {
      setSuccess(res.record.recordHash);
      setTimeout(() => { setSuccess(null); onNavigate('archive'); }, 2200);
    } else if (res) {
      setError({ message: res.message || 'অনুমোদন করা যায়নি।', issues: res.issues });
    }
  };

  const Row: React.FC<{ k: string; label: string; children: React.ReactNode; mono?: boolean; extra?: React.ReactNode }> = ({ k, label, children, extra }) => {
    const st = status(k);
    const conf = fc[k];
    const s = STYLE[st];
    return (
      <div onMouseEnter={() => setActiveHighlight(k)} className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-sm ${s.row}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-24 shrink-0 ${st === 'ok' ? 'text-fg-muted' : `font-bold ${s.label}`}`}>{label}:</span>
          <span className="font-semibold text-fg truncate">{children}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {st === 'warn' && conf !== undefined && conf < CONFIDENCE_THRESHOLD && !isRejected && (
            <button type="button" onClick={() => void confirmField(k)} className="px-2 py-0.5 rounded-md border border-accent/40 text-warning text-sm hover:bg-accent/10" title="মূল নথির সাথে মিলিয়ে ঠিক আছে বলে নিশ্চিত করুন">
              নিশ্চিত করুন
            </button>
          )}
          {conf !== undefined && (
            <span className={`px-2 py-0.5 rounded-md border font-mono font-bold text-sm ${s.badge}`}>{toBengaliDigits(conf)}%</span>
          )}
          {st === 'error' && <XCircle className="w-4 h-4 text-danger" aria-label="ভুল" />}
          {extra}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-2xl font-extrabold text-fg tracking-tight">{t('title.verification')}</h1>
          <p className="text-sm text-fg-muted mt-1">
            মেশিনের সিদ্ধান্তের ওপর মানুষের চূড়ান্ত নিয়ন্ত্রণ: ভুল থাকলে অনুমোদন হয় না, সতর্কতা মানুষ দেখে নিশ্চিত করে
          </p>
        </div>
        <button type="button" onClick={() => onNavigate('archive')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-raised text-fg border border-line text-sm font-semibold transition">
          <span>আর্কাইভে যান</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {success && (
        <div role="status" className="p-4 rounded-xl bg-primary/20 border border-primary/40 text-primary text-sm flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            রেকর্ডটি অনুমোদিত হয়েছে এবং হ্যাশ সহ সার্ভারে সংরক্ষিত হয়েছে।
          </span>
          <span className="font-mono text-sm" title={success}>SHA-256: {success.slice(0, 12)}…</span>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm space-y-1">
          <div className="font-bold">{error.message}</div>
          {error.issues?.slice(0, 5).map((i, n) => <div key={n}>• নিয়ম {toBengaliDigits(i.rule)}: {i.message}</div>)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[660px]">
        <div className="lg:col-span-6 flex flex-col h-[560px] lg:h-[700px]">
          <div className="flex items-center justify-between pb-2 text-sm text-fg-muted">
            <span className="font-semibold">মূল স্ক্যান করা নথি ({currentRecord.upazila} {currentRecord.surveyType}, খতিয়ান {currentRecord.khatianNo}):</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <DocumentViewer record={currentRecord} activeHighlight={activeHighlight} onHighlightClick={(f) => setActiveHighlight(f)} page={1} totalPages={3} />
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col justify-between bg-surface border border-line rounded-2xl p-5 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base font-bold text-fg">তথ্য যাচাই</h2>
              <span className="text-sm text-fg-muted">অবস্থা: <b className="text-fg">{currentRecord.status}</b></span>
            </div>

            <div className="space-y-2">
              <Row k="surveyType" label="জরিপ"><span className="font-mono text-primary">{currentRecord.surveyType}</span></Row>
              <Row k="district" label="জেলা">{currentRecord.district || '—'}</Row>
              <Row k="upazila" label="উপজেলা">{currentRecord.upazila || '—'}</Row>
              <Row k="mouza" label="মৌজা">{currentRecord.mouza || '—'}</Row>
              <Row k="khatianNo" label="খতিয়ান নং"><span className="font-mono">{currentRecord.khatianNo || '—'}</span></Row>
              <Row
                k="dagNo" label="দাগ নম্বর"
                extra={!isEditing && !isRejected && (
                  <button type="button" onClick={() => { setEditingDag(currentRecord.dagNo); setIsEditing(true); }} className="p-1 rounded text-fg-muted hover:text-fg" title="সংশোধন করুন" aria-label="দাগ নম্বর সংশোধন">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              >
                {isEditing ? (
                  <span className="inline-flex items-center gap-2">
                    <input type="text" value={editingDag} onChange={(e) => setEditingDag(e.target.value)} aria-label="দাগ নম্বর"
                      className="px-2 py-1 rounded bg-surface-raised border border-accent text-fg font-mono text-sm w-24" />
                    <button type="button" onClick={() => void handleQuickFixDag()} className="px-2 py-1 bg-primary text-on-primary rounded font-bold text-sm">ঠিক করুন</button>
                    <button type="button" onClick={() => setIsEditing(false)} className="px-2 py-1 text-fg-muted text-sm">বাতিল</button>
                  </span>
                ) : <span className="font-mono">{currentRecord.dagNo || '—'}</span>}
              </Row>
              <Row k="totalArea" label="জমির পরিমাণ"><span className="font-mono">{currentRecord.totalArea} {currentRecord.areaUnit}</span></Row>
              <Row k="owners" label="মালিক">{currentRecord.owners.map((o) => o.name).filter(Boolean).join(', ') || '—'}</Row>
            </div>

            {/* মালিক ও দাগের বিস্তারিত — প্রতিটির নিজস্ব রং */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="space-y-1.5">
                <div className="font-semibold text-fg-muted">অংশ</div>
                {currentRecord.owners.map((o, i) => {
                  const st = status(`owners.${i}.share`);
                  return (
                    <div key={o.id} className={`flex justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${STYLE[st].row}`}>
                      <span className="truncate">{o.name || '—'}</span>
                      <span className="font-mono font-bold">{o.share || '?'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <div className="font-semibold text-fg-muted">দাগ-তালিকা</div>
                {currentRecord.plots.length === 0 && <div className="text-fg-muted">কোনো দাগ নেই</div>}
                {currentRecord.plots.map((p, i) => {
                  const st = status(`plots.${i}.area`) === 'ok' ? status(`plots.${i}.dagNo`) : status(`plots.${i}.area`);
                  return (
                    <div key={i} className={`flex justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${STYLE[st].row}`}>
                      <span className="font-mono">দাগ {p.dagNo || '?'} <span className="text-fg-muted font-sans">({p.landClass || '—'})</span></span>
                      <span className="font-mono font-bold">{p.area} {p.areaUnit}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ৮টি নিয়ম — আসল যাচাইয়ের ফল */}
            <div className="p-3 rounded-xl bg-surface-sunken/70 border border-line space-y-2" aria-live="polite">
              <div className="flex items-center justify-between text-sm font-semibold text-fg-muted">
                <span className="flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5 text-primary" />স্বয়ংক্রিয় নিয়ম যাচাই (নিয়ম ১–৮):</span>
                <span className={`font-mono ${errorCount ? 'text-danger' : passed === 8 ? 'text-primary' : 'text-warning'}`}>{toBengaliDigits(passed)}/৮ পাস</span>
              </div>
              <ul className="space-y-1.5 text-sm">
                {rulesView.map((r) => (
                  <li key={r.n}>
                    <div className="flex items-start gap-1.5">
                      {r.st === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />}
                      {r.st === 'warn' && <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-warning shrink-0" />}
                      {r.st === 'error' && <XCircle className="w-3.5 h-3.5 mt-0.5 text-danger shrink-0" />}
                      <span className={r.st === 'error' ? 'text-danger font-semibold' : r.st === 'warn' ? 'text-warning' : 'text-fg-muted'}>{toBengaliDigits(r.n)}. {r.text}</span>
                    </div>
                    {r.messages.map((m) => (
                      <div key={m} className={`ml-5 text-sm ${r.st === 'error' ? 'text-danger' : 'text-warning'}`}>→ {m}</div>
                    ))}
                  </li>
                ))}
              </ul>
              {checks.areaSumValues && (
                <div className="text-sm text-fg-muted font-mono pt-1 border-t border-line/60">
                  দাগের যোগফল {checks.areaSumValues.plotsSum} শতক · মোট জমি {checks.areaSumValues.total} শতক
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-line">
            {!canReview && <p className="text-sm text-fg-muted">{t('perm.noReview')}</p>}
            {errorCount > 0 && <p className="text-sm text-danger">{toBengaliDigits(errorCount)}টি ভুল সংশোধন না করা পর্যন্ত অনুমোদন হবে না।</p>}
            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={() => onNavigate('extraction')}
                className="py-2.5 rounded-xl bg-surface-raised text-fg text-sm font-semibold border border-line transition">সংশোধন করুন</button>
              <button type="button" disabled={!canReview || isRejected || busy}
                title={canReview ? undefined : t('perm.noReview')}
                onClick={async () => {
                  const reason = prompt('প্রত্যাখ্যানের কারণ লিখুন (যেমন: দাগ নম্বর অপাঠ্য):');
                  if (reason) await onRejectRecord(currentRecord.id, reason);
                }}
                className="disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 text-sm font-semibold transition">
                প্রত্যাখ্যান
              </button>
              <button type="button" onClick={() => void handleApprove()}
                disabled={!canReview || isApproved || isRejected || busy || errorCount > 0}
                title={!canReview ? t('perm.noReview') : errorCount > 0 ? 'আগে ভুল সংশোধন করুন' : undefined}
                className="disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isApproved ? 'অনুমোদিত' : busy ? 'অপেক্ষা করুন…' : 'অনুমোদন'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
