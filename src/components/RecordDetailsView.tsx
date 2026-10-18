import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Printer,
  Download,
  QrCode,
  ShieldCheck,
  History,
  Layers,
  Calendar,
  MapPin,
  User,
  Share2
} from 'lucide-react';
import { LandRecord } from '../types';
import { DocumentViewer } from './DocumentViewer';
import { computeRelatedRecords } from '../utils/linking';
import { toBengaliDigits } from '../utils/bengaliUtils';
import { useAuth } from '../auth/AuthContext';
import { verifyRecordIntegrity } from '../api';
import { NavTab } from './Sidebar';

interface RecordDetailsViewProps {
  record: LandRecord;
  records?: LandRecord[];
  onBack: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const RecordDetailsView: React.FC<RecordDetailsViewProps> = ({
  record,
  records = [],
  onBack,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'scan' | 'related' | 'history'>('overview');
  const [showQrModal, setShowQrModal] = useState(false);
  const { api } = useAuth();
  const [verify, setVerify] = useState<{ ok: boolean; entries: number; problems: string[]; headHash: string } | 'loading' | 'error' | null>(null);
  const related = computeRelatedRecords(record, records);

  const runVerify = async () => {
    setVerify('loading');
    const res = await verifyRecordIntegrity(api, record.id);
    setVerify(res.ok && res.data ? res.data.result : 'error');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header matching Screen 8 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface-raised text-fg-muted text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ফিরে যান</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-fg tracking-tight font-mono">
                খতিয়ান নং: {record.khatianNo}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {record.status}
              </span>
            </div>
            <p className="text-sm text-fg-muted mt-0.5">
              মৌজা: <span className="text-fg font-medium">{record.mouza}</span> | জরিপ:{' '}
              <span className="text-primary font-mono font-bold">{record.surveyType}</span> | জেলা:{' '}
              <span className="text-fg font-medium">{record.district}</span> | উপজেলা:{' '}
              <span className="text-fg font-medium">{record.upazila}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-raised text-fg-muted border border-line text-sm font-medium transition"
          >
            <QrCode className="w-3.5 h-3.5 text-primary" />
            <span>ভেরিফিকেশন কোড</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary text-on-primary font-bold text-sm shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* 4 Tabs matching Screen 8 */}
      <div className="flex items-center gap-2 border-b border-line pb-2 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'overview'
              ? 'bg-primary text-on-primary font-bold'
              : 'text-fg-muted hover:text-on-primary hover:bg-surface-raised/60'
          }`}
        >
          সামগ্রিক তথ্য
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'scan'
              ? 'bg-primary text-on-primary font-bold'
              : 'text-fg-muted hover:text-on-primary hover:bg-surface-raised/60'
          }`}
        >
          নথির ছবি
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('related')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'related'
              ? 'bg-primary text-on-primary font-bold'
              : 'text-fg-muted hover:text-on-primary hover:bg-surface-raised/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>সম্পর্কিত রেকর্ড (CS-SA-RS-BS)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-primary text-on-primary font-bold'
              : 'text-fg-muted hover:text-on-primary hover:bg-surface-raised/60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>ইতিহাস ও অডিট লগ</span>
        </button>
      </div>

      {/* Tab 1: Overview matching Screen 8 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Info Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* মূল তথ্য Card matching Screen 8 */}
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
              <h2 className="text-base font-bold text-fg border-b border-line pb-2">
                মূল তথ্য
              </h2>

              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-sm">
                <div>
                  <span className="text-fg-muted block text-sm">নথির ধরন:</span>
                  <span className="font-semibold text-fg text-sm">{record.docType}</span>
                </div>

                <div>
                  <span className="text-fg-muted block text-sm">জমির পরিমাণ:</span>
                  <span className="font-semibold text-primary font-mono text-sm">
                    {record.totalArea} {record.areaUnit}
                  </span>
                </div>

                <div>
                  <span className="text-fg-muted block text-sm">দাগ নম্বর:</span>
                  <span className="font-semibold text-fg font-mono text-sm">{record.dagNo}</span>
                </div>

                <div>
                  <span className="text-fg-muted block text-sm">জমির শ্রেণি:</span>
                  <span className="font-semibold text-fg text-sm">{record.landClass}</span>
                </div>

                <div>
                  <span className="text-fg-muted block text-sm">মালিকের নাম:</span>
                  <span className="font-semibold text-fg text-sm">
                    {record.owners.map((o) => o.name).join(', ')}
                  </span>
                </div>

                <div>
                  <span className="text-fg-muted block text-sm">পিতা/স্বামী:</span>
                  <span className="font-semibold text-fg text-sm">
                    {record.owners.map((o) => o.fatherOrSpouse).filter(Boolean).join(', ') || '—'}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="text-fg-muted block text-sm">ঠিকানা:</span>
                  <span className="font-semibold text-fg text-sm">
                    {record.owners[0]?.address || '—'}
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-line">
                  <span className="text-fg-muted block text-sm">চৌহদ্দি ও সীমানা:</span>
                  <span className="text-fg-muted leading-relaxed">
                    উত্তরে-{record.boundaries.north}, দক্ষিণে-{record.boundaries.south}, পূর্বে-{record.boundaries.east}, পশ্চিমে-{record.boundaries.west}
                  </span>
                </div>
              </div>
            </div>

            {/* সম্পর্কিত রেকর্ড: একই মৌজা ও দাগের অন্য জরিপ (হিসাব করা) */}
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-fg flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>সম্পর্কিত রেকর্ড (জরিপ ক্রস-লিংকিং)</span>
                </h2>
                <span className="text-sm text-fg-muted font-mono">CS → SA → RS → BS</span>
              </div>
              {related.length === 0 ? (
                <p className="text-sm text-fg-muted">এই দাগের অন্য কোনো জরিপের রেকর্ড আর্কাইভে পাওয়া যায়নি।</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {related.map((r) => (
                    <div key={`${r.surveyType}-${r.khatianNo}`} className="p-3.5 rounded-xl bg-surface-raised/40 border border-line/60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-fg text-sm">{r.surveyType} জরিপ</span>
                        <span className={`px-2 py-0.5 rounded border font-mono font-bold text-sm ${r.matchPercentage >= 70 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-accent/10 text-warning border-accent/20'}`}>
                          মিল: {toBengaliDigits(r.matchPercentage)}%
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-fg-muted text-sm">
                        <div>খতিয়ান: <span className="font-bold text-fg">{r.khatianNo}</span></div>
                        <div>দাগ: <span className="font-bold text-fg">{r.dagNo}</span></div>
                        <div className="font-sans truncate">{r.ownerName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Document Scan Preview Column matching Screen 8 (5 cols) */}
          <div className="lg:col-span-5 h-[580px] flex flex-col">
            <div className="flex items-center justify-between pb-2 text-sm text-fg-muted">
              <span className="font-semibold text-fg-muted">মূল স্ক্যান ({record.surveyType} {record.khatianNo}):</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentViewer record={record} page={1} totalPages={3} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Document Scan */}
      {activeTab === 'scan' && (
        <div className="h-[700px] w-full">
          <DocumentViewer record={record} page={1} totalPages={3} />
        </div>
      )}

      {/* Tab 3: জরিপ-ধারা (হিসাব করা) */}
      {activeTab === 'related' && (
        <div className="p-6 rounded-2xl bg-surface border border-line space-y-4">
          <div>
            <h2 className="text-base font-bold text-fg">জরিপ ক্রনোলজি ও স্বত্বাধিকার ধারা</h2>
            <p className="text-sm text-fg-muted">
              একই মৌজার একই দাগ নম্বরের খতিয়ান জোড়া লাগানো হয়েছে। মিলের শতাংশ = দাগ মেলা + মালিকের নামের মিল + ক্ষেত্রফলের কাছাকাছি হওয়া।
              ওয়ারিশ-ক্রমে নাম বদলায়, তাই কম শতাংশ মানে ভুল নয় — মানুষকে দেখে নিশ্চিত করতে হবে। এটি প্রাথমিক (heuristic) মিল।
            </p>
          </div>
          {related.length === 0 ? (
            <p className="text-sm text-fg-muted">অন্য জরিপের কোনো মিল পাওয়া যায়নি।</p>
          ) : (
            <div className="space-y-3">
              {related.map((r, i) => (
                <div key={`${r.surveyType}-${r.khatianNo}`} className="p-4 rounded-xl bg-surface-raised/40 border border-line/60 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold text-primary font-mono block">{toBengaliDigits(i + 1)}. {r.surveyType} জরিপ</span>
                    <span className="text-fg-muted">খতিয়ান {r.khatianNo}, দাগ {r.dagNo} • মালিক: {r.ownerName} • {r.area}</span>
                  </div>
                  <span className="font-mono text-primary font-bold">{toBengaliDigits(r.matchPercentage)}% মিল</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: অডিট লগ (সার্ভারে তৈরি SHA-256 হ্যাশ-চেইন) */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-2xl bg-surface border border-line space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-fg">অডিট লগ ও হ্যাশ-চেইন</h2>
              <p className="text-sm text-fg-muted">প্রতিটি লগের হ্যাশ আগের লগের হ্যাশের সাথে জোড়া; কিছু বদলালে "অখণ্ডতা যাচাই" ধরে ফেলে।</p>
            </div>
            <button type="button" onClick={() => void runVerify()} disabled={verify === 'loading'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm disabled:opacity-60">
              <ShieldCheck className="w-4 h-4" />
              <span>{verify === 'loading' ? 'যাচাই চলছে…' : 'অখণ্ডতা যাচাই'}</span>
            </button>
          </div>

          {verify && verify !== 'loading' && (
            <div role="status" className={`p-3 rounded-xl border text-sm ${verify !== 'error' && verify.ok ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-danger/10 border-danger/30 text-danger'}`}>
              {verify === 'error' ? 'যাচাই করা যায়নি (সার্ভার/সেশন সমস্যা)।'
                : verify.ok ? `ঠিক আছে — ${toBengaliDigits(verify.entries)}টি লগের চেইন অক্ষত এবং রেকর্ডের তথ্য শেষ সিলের সাথে মেলে।`
                : <>সতর্কতা: অখণ্ডতা নষ্ট!<ul className="mt-1">{verify.problems.map((p) => <li key={p}>• {p}</li>)}</ul></>}
            </div>
          )}

          <div className="font-mono text-sm text-primary break-all">SHA-256 (রেকর্ড): {record.recordHash || '—'}</div>

          <div className="space-y-3">
            {record.auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-surface-raised/50 border border-line/50 text-sm">
                <div className="flex items-center justify-between text-fg-muted mb-1">
                  <span className="font-semibold text-fg">{log.action}</span>
                  <span className="font-mono text-sm">{log.timestamp}</span>
                </div>
                <div className="text-fg-muted mb-1">{log.details}</div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm text-fg-muted font-mono pt-1 border-t border-line/40">
                  <span>ব্যবহারকারী: {log.operator}</span>
                  <span className="break-all">হ্যাশ: {log.hash.slice(0, 16)}{log.hash.length > 16 ? '…' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ভেরিফিকেশন কোড (QR নয়; ই-নামজারি/নিবন্ধনের সাথে সংযোগ এখনো নেই) */}
      {showQrModal && (
        <div className="fixed inset-0 bg-surface-sunken/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="ভেরিফিকেশন কোড">
          <div className="bg-surface border border-line rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-fg text-center">রেকর্ড ভেরিফিকেশন কোড</h3>
            <p className="text-sm text-fg-muted">
              এই কোড দিয়ে রেকর্ডের বিষয়বস্তুর SHA-256 হ্যাশ মেলানো যায়। সরকারের ই-নামজারি বা নিবন্ধন সিস্টেমের সাথে সংযোগ এখনো তৈরি হয়নি;
              ভবিষ্যতে এই কোড (বা QR) দিয়েই সংযুক্তি দেওয়া যাবে।
            </p>
            <div className="font-mono text-sm text-primary bg-surface-sunken p-2 rounded-lg break-all">
              <div>রেকর্ড: {record.id}</div>
              <div>হ্যাশ: {record.recordHash || '—'}</div>
            </div>
            <button type="button" onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-surface-raised text-fg text-sm font-semibold">বন্ধ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};
