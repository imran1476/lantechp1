import React, { useState, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sliders,
  Eye,
  Trash2,
  Sparkles,
  ArrowRight,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { UploadedFileItem } from '../types';
import { NavTab } from './Sidebar';

interface UploadViewProps {
  files: UploadedFileItem[];
  onUploadFile: (file: File, options: { deskew: boolean; denoise: boolean; contrast: boolean }) => void;
  onSelectSample: (sampleId: string) => void;
  onProcessFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onNavigate: (tab: NavTab) => void;
  canUpload?: boolean;
}

export const UploadView: React.FC<UploadViewProps> = ({
  canUpload = true,
  files,
  onUploadFile,
  onSelectSample,
  onProcessFile,
  onDeleteFile,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Image preprocessing controls from PDF Page 3 & 5
  const [deskew, setDeskew] = useState(true);
  const [denoise, setDenoise] = useState(true);
  const [contrastBoost, setContrastBoost] = useState(true);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canUpload) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0], { deskew, denoise, contrast: contrastBoost });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpload) return;
    if (e.target.files && e.target.files[0]) {
      onUploadFile(e.target.files[0], { deskew, denoise, contrast: contrastBoost });
    }
    e.target.value = ''; // একই ফাইল আবার বাছাই করা যাবে
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-2xl font-extrabold text-fg tracking-tight flex items-center gap-2">
            <span>{t('title.upload')}</span>
          </h1>
          <p className="text-sm sm:text-sm text-fg-muted mt-1">
            পুরোনো খতিয়ান, পর্চা ও দলিলের স্ক্যান কপি আপলোড করুন এবং প্রি-প্রসেসিং সম্পন্ন করুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('ocr')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary text-on-primary font-bold text-sm shadow-md transition cursor-pointer"
          >
            <span>OCR ভিউয়ারে যান</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upload Drop Zone matching Screen 3 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => canUpload && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer bg-surface/60 hover:bg-surface ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-line hover:border-primary/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 ring-8 ring-primary/5">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-fg mb-1">
          {canUpload ? 'ফাইল এখানে ড্র্যাগ করুন অথবা ক্লিক করে নির্বাচন করুন' : t('perm.noUpload')}
        </h3>
        <p className="text-sm text-fg-muted max-w-md mx-auto leading-relaxed">
          সমর্থিত ফাইল: <span className="text-fg-muted font-medium">PDF, JPG, PNG</span> | সর্বোচ্চ সাইজ: <span className="text-fg-muted font-medium">১০ MB</span> | একবারে একটি ফাইল
        </p>

        {/* Quick Sample Selector */}
        <div className="mt-6 pt-5 border-t border-line/80 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-fg-muted flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-warning" />
            দ্রুত পরীক্ষার জন্য নমুনা নথি:
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSample('khatian_1234');
            }}
            className="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-raised border border-line text-sm text-fg transition"
          >
            📜 কাশিমপুর RS খতিয়ান (1234)
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSample('porcha_5678');
            }}
            className="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-raised border border-line text-sm text-fg transition"
          >
            📋 গোবিন্দপুর SA পর্চা (5678)
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSample('deed_9012');
            }}
            className="px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-raised border border-line text-sm text-fg transition"
          >
            📑 সাভার CS দলিল (9012)
          </button>
        </div>
      </div>

      {/* Preprocessing Filters Configuration (PDF Requirement) */}
      <div className="p-4 rounded-xl bg-surface border border-line">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-fg uppercase tracking-wider">
              স্বয়ংক্রিয় ছবি পরিষ্করণ ফিল্টার (Image Preprocessing)
            </span>
          </div>
          <span className="text-sm text-primary font-mono">ব্রাউজারেই চলে (আপলোডের আগে); শুধু JPG/PNG, PDF-এ নয়</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-raised/60 border border-line/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deskew}
              onChange={(e) => setDeskew(e.target.checked)}
              className="rounded bg-surface-raised text-primary focus:ring-primary"
            />
            <div>
              <div className="font-semibold text-fg">ছবি সোজা করা (Deskew)</div>
              <div className="text-sm text-fg-muted">বাঁকা স্ক্যান স্বয়ংক্রিয় সোজা করে</div>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-raised/60 border border-line/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={denoise}
              onChange={(e) => setDenoise(e.target.checked)}
              className="rounded bg-surface-raised text-primary focus:ring-primary"
            />
            <div>
              <div className="font-semibold text-fg">নয়েজ কমানো (Denoise)</div>
              <div className="text-sm text-fg-muted">ছোট ছোট ফোঁটা/কণা কমায় (৩×৩ মিডিয়ান ফিল্টার)</div>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-raised/60 border border-line/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={contrastBoost}
              onChange={(e) => setContrastBoost(e.target.checked)}
              className="rounded bg-surface-raised text-primary focus:ring-primary"
            />
            <div>
              <div className="font-semibold text-fg">কনট্রাস্ট বৃদ্ধি</div>
              <div className="text-sm text-fg-muted">ফ্যাকাসে স্ক্যানের আলো-ছায়ার পরিসর বাড়ায়</div>
            </div>
          </label>
        </div>
      </div>

      {/* Uploaded Files Table matching Screen 3 */}
      <div className="rounded-2xl bg-surface border border-line overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-fg">আপলোডকৃত ফাইলসমূহ</h2>
          <span className="text-sm text-fg-muted font-mono">
            {files.length}টি ফাইল তালিকায় আছে
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-fg-muted uppercase font-mono text-sm">
                <th className="py-2.5 px-3">নাম</th>
                <th className="py-2.5 px-3">আকার</th>
                <th className="py-2.5 px-3">ধরন</th>
                <th className="py-2.5 px-3">স্ট্যাটাস</th>
                <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 text-fg">
              {files.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-3 text-center text-fg-muted">
                    এখনো কোনো ফাইল আপলোড হয়নি। উপরে ছবি (JPG/PNG) বা PDF দিন।
                  </td>
                </tr>
              )}
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-surface-raised/40 transition">
                  <td className="py-3 px-3 font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-mono text-fg">{file.name}</span>
                    </div>
                    {file.note && <div className="text-sm text-fg-muted mt-0.5 ml-6">{file.note}</div>}
                  </td>
                  <td className="py-3 px-3 font-mono text-fg-muted">{file.size}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-surface-raised font-mono text-sm text-fg-muted">
                      {file.type}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {file.status === 'প্রসেসিং' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-surface-raised/10 text-fg-muted border border-line/30">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        প্রসেসিং
                      </span>
                    )}
                    {file.status === 'অপেক্ষারত' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-accent/10 text-warning border border-accent/30">
                        <Clock className="w-3 h-3" />
                        অপেক্ষারত
                      </span>
                    )}
                    {file.status === 'সফল' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/30">
                        <CheckCircle2 className="w-3 h-3" />
                        সফল
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onProcessFile(file.id);
                          onNavigate('ocr');
                        }}
                        className="px-2.5 py-1 rounded bg-surface-raised hover:bg-primary hover:text-on-primary text-fg-muted text-sm transition"
                        title="OCR প্রসেস ও দেখুন"
                      >
                        প্রসেস
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteFile(file.id)}
                        className="p-1 rounded text-fg-muted hover:text-danger transition"
                        title="মুছুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Processing Progress Status Bar matching Screen 3 */}
        <div className="pt-3 border-t border-line">
          <div className="flex justify-between items-center text-sm mb-1.5">
            <span className="text-fg-muted flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-fg-muted animate-spin" />
              প্রসেসিং চলছে...
            </span>
            <span className="text-fg-muted font-mono text-sm">২/৩ ফাইল আপলোড সম্পন্ন</span>
          </div>
          <div className="w-full bg-surface-raised h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-surface-raised to-primary h-full rounded-full transition-all duration-500"
              style={{ width: '68%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
