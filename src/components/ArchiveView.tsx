import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileJson,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { LandRecord, SurveyType, DocType } from '../types';
import { toBengaliDigits } from '../utils/bengaliUtils';
import { MATCH_THRESHOLD, scoreBangla } from '../utils/banglaSearch';
import { NavTab } from './Sidebar';

interface ArchiveViewProps {
  records: LandRecord[];
  onSelectRecord: (record: LandRecord) => void;
  onNavigate: (tab: NavTab) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  records,
  onSelectRecord,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDocType, setFilterDocType] = useState<string>('সব');
  const [filterSurveyType, setFilterSurveyType] = useState<string>('সব');
  const [filterDistrict, setFilterDistrict] = useState<string>('সব');
  const [filterUpazila, setFilterUpazila] = useState<string>('সব');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // শুধু অনুমোদিত (যাচাইকৃত) রেকর্ড সার্চে আসে; চাইলে বাকিগুলোও দেখা যায়
  const [includeUnapproved, setIncludeUnapproved] = useState(false);

  // ফিল্টার + র‍্যাঙ্ক করা ফাজি সার্চ (সেরা মিল আগে)
  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim();
    const scored = records
      .filter((rec) => {
        if (!includeUnapproved && rec.status !== 'অনুমোদিত') return false;
        if (filterDocType !== 'সব' && rec.docType !== filterDocType) return false;
        if (filterSurveyType !== 'সব' && rec.surveyType !== filterSurveyType) return false;
        if (filterDistrict !== 'সব' && rec.district !== filterDistrict) return false;
        if (filterUpazila !== 'সব' && rec.upazila !== filterUpazila) return false;
        return true;
      })
      .map((rec) => {
        if (!q) return { rec, score: 1 };
        const score = Math.max(
          scoreBangla(rec.khatianNo, q), scoreBangla(rec.dagNo, q),
          ...(rec.plots ?? []).map((p) => scoreBangla(p.dagNo, q)),
          scoreBangla(rec.mouza, q),
          ...rec.owners.map((o) => scoreBangla(o.name, q)),
        );
        return { rec, score };
      })
      .filter((x) => !q || x.score >= MATCH_THRESHOLD);
    if (q) scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.rec);
  }, [records, searchTerm, includeUnapproved, filterDocType, filterSurveyType, filterDistrict, filterUpazila]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['রেকর্ড_আইডি', 'জেলা', 'উপজেলা', 'মৌজা', 'জরিপ', 'খতিয়ান_নং', 'দাগ_নং', 'নথির_ধরন', 'মালিক_ও_অংশ', 'মোট_জমি', 'একক', 'অবস্থা', 'SHA256'];
    const rows = filteredRecords.map((r) => [
      r.id, r.district, r.upazila, r.mouza, r.surveyType, r.khatianNo,
      (r.plots?.length ? r.plots.map((p) => p.dagNo).join('; ') : r.dagNo), r.docType,
      r.owners.map((o) => `${o.name} (${o.share})`).join('; '), r.totalArea, r.areaUnit, r.status, r.recordHash,
    ]);
    const csvContent = '\uFEFF' + [headers, ...rows].map((row) => row.map(esc).join(',')).join('\n'); // BOM: Excel-এ বাংলা ঠিক দেখায়
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bhoomi_records_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(filteredRecords, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bhoomi_records_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-2xl font-extrabold text-fg tracking-tight flex items-center gap-2">
            <span>{t('title.archive')}</span>
          </h1>
          <p className="text-sm sm:text-sm text-fg-muted mt-1">
            খতিয়ান নম্বর, দাগ নম্বর, মৌজা বা মালিকের নাম দিয়ে তাৎক্ষণিক অনুসন্ধান ও জরিপ ইতিহাস
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-raised text-fg border border-line text-sm font-medium transition"
            title="CSV এক্সপোর্ট"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-raised text-fg border border-line text-sm font-medium transition"
            title="JSON এক্সপোর্ট"
          >
            <FileJson className="w-3.5 h-3.5 text-warning" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Main Search Panel matching Screen 7 */}
      <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-fg">ভূমি রেকর্ড অনুসন্ধান</h2>
          <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer select-none">
            <input type="checkbox" checked={includeUnapproved}
              onChange={(e) => { setIncludeUnapproved(e.target.checked); setCurrentPage(1); }}
              className="rounded bg-surface-raised text-primary focus:ring-primary" />
            অননুমোদিত/পর্যালোচনাধীন রেকর্ডও দেখান
          </label>
        </div>

        {/* Large Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="খতিয়ান নম্বর, দাগ নম্বর, মৌজা, মালিকের নাম..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-raised border border-line text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
            />
            <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-3.5" />
          </div>

          <button
            type="button"
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary text-on-primary font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>অনুসন্ধান</span>
          </button>
        </div>

        {/* Filter Dropdowns matching Screen 7 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-1">
          <div className="space-y-1">
            <label className="text-fg-muted font-medium">নথির ধরন</label>
            <select
              value={filterDocType}
              onChange={(e) => setFilterDocType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none"
            >
              <option value="সব">সব</option>
              <option value="খতিয়ান">খতিয়ান</option>
              <option value="পর্চা">পর্চা</option>
              <option value="দলিল">দলিল</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-fg-muted font-medium">জরিপের ধরন</label>
            <select
              value={filterSurveyType}
              onChange={(e) => setFilterSurveyType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none font-mono"
            >
              <option value="সব">সব</option>
              <option value="RS">RS</option>
              <option value="CS">CS</option>
              <option value="SA">SA</option>
              <option value="BS">BS</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-fg-muted font-medium">জেলা</label>
            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none"
            >
              <option value="সব">সব</option>
              <option value="ঢাকা">ঢাকা</option>
              <option value="ময়মনসিংহ">ময়মনসিংহ</option>
              <option value="রাজশাহী">রাজশাহী</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-fg-muted font-medium">উপজেলা</label>
            <select
              value={filterUpazila}
              onChange={(e) => setFilterUpazila(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-line text-fg focus:outline-none"
            >
              <option value="সব">সব</option>
              <option value="সাভার">সাভার</option>
              <option value="ধামরাই">ধামরাই</option>
              <option value="কেরানীগঞ্জ">কেরানীগঞ্জ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Stats & Table matching Screen 7 */}
      <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-fg text-sm">
              ফলাফল ({filteredRecords.length})
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              সম্ভাব্য মিল (৫) • বাংলা ফাজি সার্চ
            </span>
          </div>

          <span className="text-sm text-fg-muted font-mono">
            পৃষ্ঠা {currentPage} / {totalPages}
          </span>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-fg-muted uppercase font-mono text-sm">
                <th className="py-2.5 px-3">খতিয়ান নং</th>
                <th className="py-2.5 px-3">দাগ নং</th>
                <th className="py-2.5 px-3">মৌজা</th>
                <th className="py-2.5 px-3">জরিপ</th>
                <th className="py-2.5 px-3">মালিকের নাম</th>
                <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 text-fg">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-surface-raised/50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-fg">
                      {rec.khatianNo}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-warning">
                      {rec.dagNo}
                    </td>
                    <td className="py-3 px-3">{rec.mouza}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-surface-raised border border-line font-mono text-sm font-bold text-primary">
                        {rec.surveyType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-fg">
                      {rec.owners.map((o) => o.name).join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectRecord(rec);
                          onNavigate('details');
                        }}
                        className="px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-sm font-semibold transition"
                      >
                        বিস্তারিত
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-fg-muted">
                    কোনো রেকর্ড পাওয়া যায়নি। অনুসন্ধান পরিবর্তন করে পুনরায় চেষ্টা করুন।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching Screen 7 */}
        <div className="flex justify-center items-center gap-1 pt-3 border-t border-line text-sm">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-surface-raised text-fg-muted hover:text-on-primary disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-lg font-mono font-bold transition ${
                currentPage === page
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-raised text-fg-muted hover:text-on-primary'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-surface-raised text-fg-muted hover:text-on-primary disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
