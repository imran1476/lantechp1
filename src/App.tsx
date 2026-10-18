import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { NoticeTicker } from './components/NoticeTicker';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { UploadView } from './components/UploadView';
import { OcrView } from './components/OcrView';
import { ExtractionView } from './components/ExtractionView';
import { VerificationView } from './components/VerificationView';
import { ArchiveView } from './components/ArchiveView';
import { RecordDetailsView } from './components/RecordDetailsView';
import { ConceptModal } from './components/ConceptModal';
import { LandRecord, Owner, PlotInfo, UploadedFileItem } from './types';
import { toBengaliDigits } from './utils/bengaliUtils';
import { preprocessImageFile } from './utils/imagePreprocess';
import { useAuth } from './auth/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import * as recordsApi from './api';

// সার্ভার যে ফিল্ডগুলো ক্লায়েন্টের কাছ থেকে নেয় (বাকি সব সার্ভার ঠিক করে)
const EDITABLE_KEYS = ['docType', 'surveyType', 'district', 'upazila', 'mouza', 'jlNo', 'khatianNo', 'dagNo', 'landClass',
  'totalArea', 'areaUnit', 'owners', 'plots', 'boundaries'] as const;
const CONF_KEYS = ['district', 'upazila', 'mouza', 'khatianNo', 'dagNo', 'totalArea', 'owners', 'boundaries'] as const;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** OCR-এর ফল থেকে রেকর্ডের খসড়া। অন্য রেকর্ড থেকে কিছু ধার করা হয় না — না পেলে খালি রাখা হয়, যাচাই ধরবে। */
function draftFromOcr(data: any): Partial<LandRecord> {
  const sd = data.structuredData ?? {};
  const owners: Owner[] = (sd.owners ?? []).map((o: any, i: number) => ({
    id: `o-${i + 1}`, name: String(o.name ?? ''), fatherOrSpouse: String(o.fatherOrSpouse ?? ''),
    share: String(o.share ?? ''), shareDecimal: Number(o.shareDecimal ?? 0), address: String(o.address ?? ''),
  }));
  const plots: PlotInfo[] = (sd.plots ?? []).map((p: any) => ({
    dagNo: String(p.dagNo ?? ''), dagNoBn: String(p.dagNoBn ?? ''), landClass: String(p.landClass ?? ''),
    area: Number(p.area ?? 0), areaUnit: p.areaUnit ?? 'একর', confidence: Number(p.confidence ?? 0),
  }));
  const fc = sd.fieldConfidences ?? {};
  const pick = (k: string) => Number(fc[k] ?? 0);
  return {
    docType: sd.docType ?? 'খতিয়ান', surveyType: sd.surveyType ?? 'RS', district: sd.district ?? '', upazila: sd.upazila ?? '',
    mouza: sd.mouza ?? '', jlNo: sd.jlNo ?? '', khatianNo: String(sd.khatianNo ?? ''), dagNo: String(sd.dagNo ?? ''),
    landClass: sd.landClass ?? '', totalArea: Number(sd.totalArea ?? 0), areaUnit: sd.areaUnit ?? 'একর',
    owners, plots, boundaries: { north: sd.boundaries?.north ?? '', south: sd.boundaries?.south ?? '', east: sd.boundaries?.east ?? '', west: sd.boundaries?.west ?? '' },
    rawOcrText: String(data.rawText ?? ''),
    confidenceScore: Number(sd.confidenceScore ?? 0),
    fieldConfidences: { district: pick('district'), upazila: pick('upazila'), mouza: pick('mouza'), khatianNo: pick('khatianNo'),
      dagNo: pick('dagNo'), totalArea: pick('totalArea'), owners: pick('owners'), boundaries: pick('boundaries') },
    isDemoData: data.isDemoData === true,
  };
}

export interface ActionResult { ok: boolean; record?: LandRecord; message?: string; issues?: recordsApi.ApiResult['issues'] }

export default function App() {
  const { user, checking, can, api, logout } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [recordsState, setRecordsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filesQueue, setFilesQueue] = useState<UploadedFileItem[]>([]);
  const [conceptModalOpen, setConceptModalOpen] = useState<boolean>(false);
  const [isLoadingOcr, setIsLoadingOcr] = useState<boolean>(false);

  const loadRecords = useCallback(async () => {
    setRecordsState('loading');
    const res = await recordsApi.listRecords(api);
    if (res.ok && res.data) {
      const list = res.data.records;
      setRecords(list);
      setSelectedId((cur) => cur && list.some((r) => r.id === cur) ? cur
        : (list.find((r) => r.status === 'পর্যালোচনায়' || r.status === 'সংশোধিত') ?? list[0])?.id ?? null);
      setRecordsState('ready');
    } else if (res.status !== 401) {
      setRecordsState('error');
    }
  }, [api]);

  // লগইন হলে সার্ভার থেকে রেকর্ড আনা; লগআউট হলে স্ক্রিনের ডেটা মুছে ফেলা
  useEffect(() => {
    if (user) void loadRecords();
    else { setRecords([]); setSelectedId(null); setRecordsState('idle'); setFilesQueue([]); setActiveTab('dashboard'); }
  }, [user?.username, loadRecords]);

  const selectedRecord: LandRecord | null = useMemo(
    () => records.find((r) => r.id === selectedId) ?? records[0] ?? null, [records, selectedId]);

  const putRecord = (rec: LandRecord) => {
    setRecords((prev) => (prev.some((r) => r.id === rec.id) ? prev.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...prev]));
  };

  const getTabLabel = (tab: NavTab): string => {
    const known = ['dashboard', 'upload', 'ocr', 'extraction', 'verification', 'archive', 'details', 'concept'] as const;
    return known.includes(tab) ? t(`tab.${tab}` as const) : t('header.crumb');
  };

  // ---------- আপলোড: ছবি পরিষ্কার -> OCR -> সার্ভারে সংরক্ষণ ----------
  const handleUploadFile = async (file: File, options: { deskew: boolean; denoise: boolean; contrast: boolean }) => {
    if (!can('upload')) { alert(t('perm.noUpload')); return; }
    if (file.size > MAX_UPLOAD_BYTES) { alert('ফাইল ১০ MB-এর বেশি হতে পারবে না।'); return; }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) { alert('শুধু JPG, PNG বা PDF ফাইল গ্রহণযোগ্য।'); return; }

    const newId = `f-${Date.now()}`;
    const setItem = (patch: Partial<UploadedFileItem>) =>
      setFilesQueue((prev) => prev.map((f) => (f.id === newId ? { ...f, ...patch } : f)));
    setFilesQueue((prev) => [{
      id: newId, name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      type: file.name.split('.').pop()?.toUpperCase() || 'PDF', status: 'প্রসেসিং', progress: 10,
    }, ...prev]);

    try {
      setIsLoadingOcr(true);
      let dataUrl: string;
      let mimeType = file.type;
      let note = file.type === 'application/pdf' ? 'PDF-এ ছবি-পরিষ্কার প্রযোজ্য নয়' : undefined;
      try {
        const pre = await preprocessImageFile(file, options);
        if (pre) { dataUrl = pre.dataUrl; mimeType = pre.mimeType; note = pre.notes.join(' · '); }
        else dataUrl = await readAsDataUrl(file);
      } catch {
        dataUrl = await readAsDataUrl(file);
        note = 'ছবি পরিষ্কার করা যায়নি; মূল ফাইল ব্যবহার হয়েছে';
      }
      setItem({ progress: 40, note });

      const ocr = await api('/api/ocr-extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType, fileName: file.name }),
      });
      const data = await ocr.json().catch(() => ({}));
      if (!ocr.ok || !data.success || !data.structuredData) {
        setItem({ status: 'ব্যর্থ', progress: 100 });
        if (ocr.status !== 401) alert(data.message || 'OCR করা যায়নি।');
        return;
      }
      setItem({ progress: 75 });

      const saved = await recordsApi.createRecord(api, draftFromOcr(data), dataUrl, mimeType);
      if (!saved.ok || !saved.data) {
        setItem({ status: 'ব্যর্থ', progress: 100 });
        if (saved.status !== 401) alert(saved.message || 'রেকর্ড সংরক্ষণ করা যায়নি।');
        return;
      }
      putRecord(saved.data.record);
      setSelectedId(saved.data.record.id);
      setItem({ status: 'সফল', progress: 100, recordId: saved.data.record.id,
        note: [note, data.isDemoData ? 'ডেমো ডেটা (আসল OCR নয়)' : null].filter(Boolean).join(' · ') });
    } catch (err) {
      console.error('Upload error:', err);
      setItem({ status: 'ব্যর্থ', progress: 100 });
    } finally {
      setIsLoadingOcr(false);
    }
  };

  const handleSelectSample = () => {
    const found = records.find((r) => r.id === 'rec-1260') ?? records[0];
    if (found) { setSelectedId(found.id); setActiveTab('ocr'); }
  };

  const handleProcessFile = (fileId: string) => {
    const file = filesQueue.find((f) => f.id === fileId);
    if (file?.recordId) setSelectedId(file.recordId);
  };

  const handleDeleteFile = (fileId: string) => setFilesQueue((prev) => prev.filter((f) => f.id !== fileId));

  // ---------- সংশোধন / অনুমোদন / প্রত্যাখ্যান: সব সার্ভারে, সার্ভার নিজে যাচাই ও লগ করে ----------
  const handleUpdateRecord = async (updated: LandRecord): Promise<boolean> => {
    const current = records.find((r) => r.id === updated.id);
    const patch: Record<string, unknown> = {};
    EDITABLE_KEYS.forEach((k) => { patch[k] = (updated as unknown as Record<string, unknown>)[k]; });
    const confirm = CONF_KEYS.filter((k) => (updated.fieldConfidences?.[k] ?? 0) > (current?.fieldConfidences?.[k] ?? 0));
    const res = await recordsApi.updateRecord(api, updated.id, patch as Partial<LandRecord>, [...confirm]);
    if (res.ok && res.data) { putRecord(res.data.record); return true; }
    if (res.status !== 401) alert(res.message || 'সংরক্ষণ করা যায়নি।');
    return false;
  };

  const handleApproveRecord = async (record: LandRecord): Promise<ActionResult> => {
    if (!can('review')) { alert(t('perm.noReview')); return { ok: false, message: t('perm.noReview') }; }
    const res = await recordsApi.approveRecord(api, record.id);
    if (res.ok && res.data) { putRecord(res.data.record); return { ok: true, record: res.data.record }; }
    return { ok: false, message: res.message, issues: res.issues };
  };

  const handleRejectRecord = async (recordId: string, reason: string): Promise<ActionResult> => {
    if (!can('review')) { alert(t('perm.noReview')); return { ok: false, message: t('perm.noReview') }; }
    const res = await recordsApi.rejectRecord(api, recordId, reason);
    if (res.ok && res.data) { putRecord(res.data.record); return { ok: true, record: res.data.record }; }
    alert(res.message || 'প্রত্যাখ্যান করা যায়নি।');
    return { ok: false, message: res.message };
  };

  // ---------- স্ক্রিন ----------
  if (checking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-surface-sunken text-fg-muted" role="status">
        {t('loading')}
      </div>
    );
  }
  if (!user) return <LoginView />;

  const stats = {
    totalUploads: records.length,
    processing: filesQueue.filter((f) => f.status === 'প্রসেসিং').length,
    forReview: records.filter((r) => r.status === 'পর্যালোচনায়' || r.status === 'সংশোধিত').length,
    approved: records.filter((r) => r.status === 'অনুমোদিত').length,
  };

  const body = (() => {
    if (recordsState === 'error') {
      return (
        <div className="p-8 text-center space-y-3">
          <p className="text-danger">রেকর্ড লোড করা যায়নি।</p>
          <button type="button" onClick={() => void loadRecords()} className="px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold">আবার চেষ্টা করুন</button>
        </div>
      );
    }
    if (!selectedRecord) {
      return <div className="p-8 text-center text-fg-muted" role="status">{t('loading')}</div>;
    }
    return (
      <>
        {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} stats={stats} />}

        {activeTab === 'upload' && (
          <UploadView files={filesQueue} onUploadFile={handleUploadFile} onSelectSample={handleSelectSample}
            onProcessFile={handleProcessFile} onDeleteFile={handleDeleteFile} onNavigate={setActiveTab} canUpload={can('upload')} />
        )}

        {activeTab === 'ocr' && (
          <OcrView currentRecord={selectedRecord} onNavigate={setActiveTab} isLoadingOcr={isLoadingOcr} />
        )}

        {activeTab === 'extraction' && (
          <ExtractionView key={`${selectedRecord.id}-${selectedRecord.recordHash}`} currentRecord={selectedRecord} records={records}
            onUpdateRecord={handleUpdateRecord} onNavigate={setActiveTab} />
        )}

        {activeTab === 'verification' && (
          <VerificationView currentRecord={selectedRecord} records={records} canReview={can('review')}
            onApproveRecord={handleApproveRecord} onRejectRecord={handleRejectRecord} onUpdateRecord={handleUpdateRecord}
            onNavigate={setActiveTab} />
        )}

        {activeTab === 'archive' && (
          <ArchiveView records={records} onSelectRecord={(rec) => { setSelectedId(rec.id); setActiveTab('details'); }} onNavigate={setActiveTab} />
        )}

        {activeTab === 'details' && (
          <RecordDetailsView record={selectedRecord} records={records} onBack={() => setActiveTab('archive')} onNavigate={setActiveTab} />
        )}
      </>
    );
  })();

  const steps = ['dashboard', 'upload', 'ocr', 'extraction', 'verification', 'archive', 'details'] as const;

  return (
    <div className="flex h-screen w-full bg-surface-sunken text-fg overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => (tab === 'concept' ? setConceptModalOpen(true) : setActiveTab(tab))}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          activeTabLabel={getTabLabel(activeTab)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenConceptModal={() => setConceptModalOpen(true)}
          onLogout={() => { void logout(); }}
        />
        <NoticeTicker />

        <main className="flex-1 overflow-y-auto">
          {selectedRecord?.isDemoData && ['ocr', 'extraction', 'verification', 'details'].includes(activeTab) && (
            <div role="status" className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-3 rounded-xl bg-warning/10 border border-warning/30 text-sm text-fg">
              ⚠ {t('demo.banner')}
            </div>
          )}
          <nav className="workflow-stepper" aria-label={t('step.aria')}>
            <ol>
              {steps.map((id, index) => {
                const currentIndex = steps.indexOf(activeTab as (typeof steps)[number]);
                const state = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
                return (
                  <li key={id}>
                    <button type="button" onClick={() => setActiveTab(id)}
                      className={`workflow-step workflow-step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                      <span className="workflow-step-number">{toBengaliDigits(index + 1)}</span>
                      <span>{t(`step.${id}` as const)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {body}
        </main>
      </div>

      <ConceptModal isOpen={conceptModalOpen} onClose={() => setConceptModalOpen(false)} />
    </div>
  );
}
