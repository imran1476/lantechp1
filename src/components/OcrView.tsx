import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  FileText,
  Download,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Copy,
  Check,
  Zap,
  Layers
} from 'lucide-react';
import { LandRecord } from '../types';
import { DocumentViewer } from './DocumentViewer';
import { NavTab } from './Sidebar';

interface OcrViewProps {
  currentRecord: LandRecord;
  onNavigate: (tab: NavTab) => void;
  onRunLiveOcr?: () => void;
  isLoadingOcr?: boolean;
}

export const OcrView: React.FC<OcrViewProps> = ({
  currentRecord,
  onNavigate,
  onRunLiveOcr,
  isLoadingOcr = false,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'raw' | 'processed'>('raw');
  const [copied, setCopied] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  const handleCopyText = () => {
    navigator.clipboard.writeText(
      activeTab === 'raw' ? currentRecord.rawOcrText : JSON.stringify(currentRecord, null, 2)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadText = () => {
    const blob = new Blob([currentRecord.rawOcrText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khatian_${currentRecord.khatianNo}_ocr_text.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-2xl font-extrabold text-fg tracking-tight flex items-center gap-2">
            <span>{t('title.ocr')}</span>
          </h1>
          <p className="text-sm sm:text-sm text-fg-muted mt-1">
            মেশিন লার্নিং ও ভিশন মডেলের মাধ্যমে স্ক্যান করা পুরোনো খতিয়ান থেকে বাংলা টেক্সট রূপান্তর
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRunLiveOcr && (
            <button
              type="button"
              onClick={onRunLiveOcr}
              disabled={isLoadingOcr}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-raised text-primary border border-primary/30 text-sm font-semibold transition disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isLoadingOcr ? 'animate-spin' : ''}`} />
              <span>{isLoadingOcr ? 'OCR প্রক্রিয়াকরণ হচ্ছে...' : 'Gemini AI লাইভ OCR'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('extraction')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary text-on-primary font-bold text-sm shadow-md transition cursor-pointer"
          >
            <span>পরবর্তী প্রসেস করুন</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Grid: Left Image Viewer, Right OCR Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* Left Side: Document Viewer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[560px] lg:h-[680px]">
          <div className="flex items-center justify-between pb-2 text-sm text-fg-muted">
            <span className="font-semibold text-fg-muted">মূল স্ক্যান করা নথি ভিউয়ার:</span>
            <span className="text-primary text-sm font-mono">{currentRecord.imageUrl ? 'আপলোড করা আসল ছবি' : 'নমুনা চিত্র'}</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <DocumentViewer
              record={currentRecord}
              activeHighlight={activeHighlight}
              onHighlightClick={(field) => setActiveHighlight(field)}
              page={1}
              totalPages={3}
            />
          </div>
        </div>

        {/* Right Side: OCR Results matching Screen 4 (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-surface border border-line rounded-2xl p-5 space-y-4">
          <div>
            {/* Header with Title and Tabs */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base font-bold text-fg flex items-center gap-2">
                <span>OCR ফলাফল</span>
              </h2>

              <div className="flex items-center bg-surface-raised p-0.5 rounded-lg text-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab('raw')}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    activeTab === 'raw'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'text-fg-muted hover:text-on-primary'
                  }`}
                >
                  মূল টেক্সট
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('processed')}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    activeTab === 'processed'
                      ? 'bg-primary text-on-primary font-bold'
                      : 'text-fg-muted hover:text-on-primary'
                  }`}
                >
                  প্রসেসড টেক্সট
                </button>
              </div>
            </div>

            {/* Extracted Key Summary Badges from Screen 4 */}
            <div className="grid grid-cols-2 gap-2 my-4 text-sm">
              <div
                onMouseEnter={() => setActiveHighlight('district')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-2.5 rounded-xl bg-surface-raised/60 border border-line/60 hover:border-primary/50 transition cursor-pointer"
              >
                <span className="text-fg-muted block text-sm">জেলা:</span>
                <span className="font-bold text-fg text-sm">{currentRecord.district}</span>
              </div>

              <div
                onMouseEnter={() => setActiveHighlight('upazila')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-2.5 rounded-xl bg-surface-raised/60 border border-line/60 hover:border-primary/50 transition cursor-pointer"
              >
                <span className="text-fg-muted block text-sm">উপজেলা:</span>
                <span className="font-bold text-fg text-sm">{currentRecord.upazila}</span>
              </div>

              <div
                onMouseEnter={() => setActiveHighlight('mouza')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-2.5 rounded-xl bg-surface-raised/60 border border-line/60 hover:border-primary/50 transition cursor-pointer"
              >
                <span className="text-fg-muted block text-sm">মৌজা:</span>
                <span className="font-bold text-fg text-sm">{currentRecord.mouza}</span>
              </div>

              <div
                onMouseEnter={() => setActiveHighlight('khatianNo')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-2.5 rounded-xl bg-surface-raised/60 border border-line/60 hover:border-primary/50 transition cursor-pointer"
              >
                <span className="text-fg-muted block text-sm">খতিয়ান নম্বর:</span>
                <span className="font-bold text-primary text-sm font-mono">
                  {currentRecord.khatianNoBn} ({currentRecord.khatianNo})
                </span>
              </div>

              <div
                onMouseEnter={() => setActiveHighlight('dagNo')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-2.5 rounded-xl bg-surface-raised/60 border border-accent/40 hover:border-accent transition cursor-pointer relative"
              >
                <span className="text-fg-muted block text-sm">দাগ নম্বর:</span>
                <span className="font-bold text-warning text-sm font-mono">
                  {currentRecord.dagNoBn} ({currentRecord.dagNo})
                </span>
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--accent)]" />
              </div>

              <div
                onMouseEnter={() => setActiveHighlight('totalArea')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="p-2.5 rounded-xl bg-surface-raised/60 border border-line/60 hover:border-primary/50 transition cursor-pointer"
              >
                <span className="text-fg-muted block text-sm">জমির পরিমাণ:</span>
                <span className="font-bold text-fg text-sm font-mono">
                  {currentRecord.totalAreaBn} {currentRecord.areaUnit}
                </span>
              </div>

              <div
                onMouseEnter={() => setActiveHighlight('owners')}
                onMouseLeave={() => setActiveHighlight(null)}
                className="col-span-2 p-2.5 rounded-xl bg-surface-raised/60 border border-line/60 hover:border-primary/50 transition cursor-pointer"
              >
                <span className="text-fg-muted block text-sm">মালিকের নাম:</span>
                <span className="font-bold text-fg text-sm">
                  {currentRecord.owners.map((o) => o.name).join(', ')}
                </span>
              </div>
            </div>

            {/* OCR Content Box */}
            <div className="relative">
              <div className="flex items-center justify-between text-sm text-fg-muted mb-1.5 px-1">
                <span>{activeTab === 'raw' ? 'নিষ্কাশিত বাংলা হরফ' : 'JSON স্ট্রাকচার'}</span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-fg-muted hover:text-on-primary transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-sunken/80 border border-line text-sm text-fg-muted font-mono h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                {activeTab === 'raw' ? currentRecord.rawOcrText : JSON.stringify(currentRecord, null, 2)}
              </div>
            </div>
          </div>

          {/* Bottom Confidence Bar & Actions matching Screen 4 */}
          <div className="space-y-4 pt-3 border-t border-line">
            {/* Confidence Score Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-fg-muted flex items-center gap-1.5">
                  <span>{t('ocr.confidence')}</span>
                  <span className="text-sm bg-surface-raised text-fg-muted px-1.5 py-0.5 rounded font-mono">
                    Tesseract + Vision
                  </span>
                </span>
                <span className="font-mono font-bold text-primary text-sm">
                  {currentRecord.confidenceScore}%
                </span>
              </div>

              <div className="w-full bg-surface-raised h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentRecord.confidenceScore}%` }}
                />
              </div>
            </div>

            {/* Action Buttons from Screen 4 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadText}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-raised text-fg text-sm font-semibold border border-line transition"
              >
                <Download className="w-4 h-4" />
                <span>ডাউনলোড টেক্সট</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('extraction')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary text-on-primary text-sm font-bold shadow-md transition cursor-pointer"
              >
                <span>পরবর্তী প্রসেস করুন</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
