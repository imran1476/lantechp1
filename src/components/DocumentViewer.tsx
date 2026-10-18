import React, { useState } from 'react';
import { ExternalLink, Minus, Plus, RotateCcw } from 'lucide-react';
import { LandRecord } from '../types';
import { DocumentParchment } from './DocumentParchment';

interface DocumentViewerProps {
  record?: LandRecord;
  activeHighlight?: string | null;
  onHighlightClick?: (field: string) => void;
  page?: number;
  totalPages?: number;
}

/**
 * নথির ছবি দেখায়। রেকর্ডে আসল আপলোড করা ছবি থাকলে সেটাই (জুম সহ);
 * না থাকলে নমুনা চিত্র — এবং স্পষ্ট লেখা থাকে যে এটি এই রেকর্ডের আসল স্ক্যান নয়।
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({ record, activeHighlight, onHighlightClick, page = 1, totalPages = 3 }) => {
  const [zoom, setZoom] = useState(1);

  if (record?.imageUrl) {
    const isPdf = record.imageMime === 'application/pdf';
    return (
      <div className="h-full flex flex-col rounded-xl border border-line bg-surface-sunken overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-line text-sm text-fg-muted">
          <span>আপলোড করা মূল নথি</span>
          <div className="flex items-center gap-1">
            {!isPdf && (
              <>
                <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="ছোট করুন" className="p-1 rounded hover:bg-surface-raised"><Minus className="w-4 h-4" /></button>
                <span className="font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="বড় করুন" className="p-1 rounded hover:bg-surface-raised"><Plus className="w-4 h-4" /></button>
                <button type="button" onClick={() => setZoom(1)} aria-label="রিসেট" className="p-1 rounded hover:bg-surface-raised"><RotateCcw className="w-4 h-4" /></button>
              </>
            )}
            <a href={record.imageUrl} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-surface-raised" aria-label="নতুন ট্যাবে খুলুন"><ExternalLink className="w-4 h-4" /></a>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {isPdf ? (
            <object data={record.imageUrl} type="application/pdf" className="w-full h-full min-h-[480px]">
              <a href={record.imageUrl} target="_blank" rel="noreferrer" className="p-4 block text-primary">PDF দেখতে এখানে ক্লিক করুন</a>
            </object>
          ) : (
            <img src={record.imageUrl} alt="আপলোড করা খতিয়ান/পর্চার স্ক্যান" style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} className="block" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2">
      <div role="note" className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-sm text-fg">
        নমুনা চিত্র — এই রেকর্ডের আসল স্ক্যান নয়। আসল ছবি পেতে "নথি আপলোড" থেকে ফাইল দিন।
      </div>
      <div className="flex-1 overflow-hidden">
        <DocumentParchment activeHighlight={activeHighlight} onHighlightClick={onHighlightClick} page={page} totalPages={totalPages} />
      </div>
    </div>
  );
};
