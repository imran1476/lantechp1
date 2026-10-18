import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  UploadCloud,
  Cpu,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { NavTab } from './Sidebar';

const numberFormatter = new Intl.NumberFormat('bn-BD');
const formatNumber = (value: number) => numberFormatter.format(value);

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  stats?: {
    totalUploads: number;
    processing: number;
    forReview: number;
    approved: number;
  };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  stats = {
    totalUploads: 48,
    processing: 32,
    forReview: 12,
    approved: 24,
  },
}) => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const welcomeName = user ? (lang === 'en' ? user.nameEn : user.name) : '';
  const axisTicks = [
    { value: 80, y: 30 },
    { value: 60, y: 75 },
    { value: 40, y: 120 },
    { value: 20, y: 165 },
    { value: 0, y: 210 },
  ];

  const [startDate, setStartDate] = React.useState('2026-10-15');
  const [endDate, setEndDate] = React.useState('2026-10-19');
  const [appliedRange, setAppliedRange] = React.useState('');

  const handleDateFilter = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (startDate && endDate && startDate <= endDate) {
      const formatDate = (value: string) => new Intl.DateTimeFormat('bn-BD', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${value}T00:00:00`));
      setAppliedRange(`${formatDate(startDate)} – ${formatDate(endDate)}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
            {t('title.dashboard')}
          </h1>
          <p className="text-sm text-fg-muted mt-1 flex items-center gap-1.5">
            {t('dash.welcome')} <span className="text-primary font-semibold">{welcomeName}</span> 👋
            <span className="text-fg-muted">•</span> {t('dash.today')}
          </p>
          <form onSubmit={handleDateFilter} className="mt-4 flex flex-wrap items-end gap-2">
            <label className="date-filter-field">
              <span>শুরুর তারিখ</span>
              <input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="date-filter-field">
              <span>শেষ তারিখ</span>
              <input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <button type="submit" className="date-filter-button">ফিল্টার করুন</button>
          </form>
          {appliedRange && <p role="status" className="mt-2 text-sm text-fg-muted">নির্বাচিত সময়: {appliedRange}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary text-on-primary font-bold text-sm shadow-md transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>নতুন নথি আপলোড</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards matching Screen 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Uploads */}
        <div className="stat-card hover:border-line/30 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-fg-muted">মোট আপলোড</span>
            <div className="w-8 h-8 rounded-lg bg-surface-raised/10 text-fg-muted flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-fg font-mono tracking-tight">
            {formatNumber(stats.totalUploads)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-sm text-fg-muted font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ {formatNumber(12)}% গত ৭ দিনে</span>
          </div>
        </div>

        {/* In Processing */}
        <div className="stat-card hover:border-line/30 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-fg-muted">প্রক্রিয়াকরণে</span>
            <div className="w-8 h-8 rounded-lg bg-surface-raised/10 text-fg-muted flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-fg font-mono tracking-tight">
            {formatNumber(stats.processing)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-sm text-danger font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ {formatNumber(18)}% গত ৭ দিনে</span>
          </div>
        </div>

        {/* For Review */}
        <button
          type="button"
          onClick={() => onNavigate('verification')}
          className="stat-card w-full text-left hover:border-accent/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-fg-muted group-hover:text-warning">
              পর্যালোচনার জন্য
            </span>
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-warning flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-fg font-mono tracking-tight">
            {formatNumber(stats.forReview)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-sm text-primary font-medium">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>↓ {formatNumber(8)}% গত ৭ দিনে</span>
          </div>
          <span className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary">
            যাচাই প্রয়োজন <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
          </span>
        </button>

        {/* Approved */}
        <div className="stat-card hover:border-primary/30 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-fg-muted">অনুমোদিত</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-fg font-mono tracking-tight">
            {formatNumber(stats.approved)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-sm text-primary font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ {formatNumber(20)}% গত ৭ দিনে</span>
          </div>
        </div>
      </div>

      {/* Main Visual Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Processing Flow Graph */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-surface border border-line space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-fg">ডকুমেন্ট প্রক্রিয়াকরণ প্রবাহ</h2>
              <p className="text-sm text-fg-muted">দৈনিক আপলোড, প্রসেসিং ও অনুমোদনের পরিসংখ্যান</p>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-raised" />
                আপলোড
              </span>
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-raised" />
                প্রক্রিয়াকরণ
              </span>
              <span className="flex items-center gap-1.5 text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                অনুমোদিত
              </span>
            </div>
          </div>

          {/* Interactive SVG Chart matching Screen 2 */}
          <div className="h-64 w-full relative pt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 700 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-blue)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--chart-blue)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-green)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--chart-green)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {axisTicks.map((tick) => (
                <line key={`grid-${tick.value}`} x1="50" y1={tick.y} x2="680" y2={tick.y} stroke="var(--chart-grid)" strokeDasharray="3 3" />
              ))}

              {/* Y Axis Labels */}
              {axisTicks.map((tick) => (
                <text key={`axis-${tick.value}`} x="25" y={tick.y + 4} fill="var(--chart-label)" fontSize="11" fontFamily="sans-serif">
                  {formatNumber(tick.value)}
                </text>
              ))}

              {/* Area 1: Uploads (Blue) */}
              <path
                d="M 60,180 L 160,140 L 260,110 L 360,120 L 460,95 L 560,105 L 660,70 L 660,210 L 60,210 Z"
                fill="url(#blueGradient)"
              />
              <path
                d="M 60,180 L 160,140 L 260,110 L 360,120 L 460,95 L 560,105 L 660,70"
                fill="none"
                stroke="var(--chart-blue)"
                strokeWidth="2.5"
              />

              {/* Area 2: Processing (Purple) */}
              <path
                d="M 60,195 L 160,165 L 260,135 L 360,145 L 460,120 L 560,115 L 660,85"
                fill="none"
                stroke="var(--chart-purple)"
                strokeWidth="2.5"
              />

              {/* Area 3: Approved (Emerald) */}
              <path
                d="M 60,205 L 160,185 L 260,160 L 360,165 L 460,145 L 560,135 L 660,100 L 660,210 L 60,210 Z"
                fill="url(#emeraldGradient)"
              />
              <path
                d="M 60,205 L 160,185 L 260,160 L 360,165 L 460,145 L 560,135 L 660,100"
                fill="none"
                stroke="var(--chart-green)"
                strokeWidth="2.5"
              />

              {/* Data points */}
              {[[60,180], [160,140], [260,110], [360,120], [460,95], [560,105], [660,70]].map(([x,y], i) => (
                <circle key={`u-${i}`} cx={x} cy={y} r="3.5" fill="var(--chart-blue)" stroke="var(--background)" strokeWidth="2" />
              ))}
              {[[60,205], [160,185], [260,160], [360,165], [460,145], [560,135], [660,100]].map(([x,y], i) => (
                <circle key={`a-${i}`} cx={x} cy={y} r="3.5" fill="var(--chart-green)" stroke="var(--background)" strokeWidth="2" />
              ))}
            </svg>

            {/* X Axis Dates */}
            <div className="flex justify-between px-6 pt-2 text-sm text-fg-muted font-mono">
              <span>Oct 10</span>
              <span>Oct 11</span>
              <span>Oct 12</span>
              <span>Oct 13</span>
              <span>Oct 14</span>
              <span>Oct 15</span>
              <span>Oct 16</span>
            </div>
          </div>
        </div>

        {/* Document Types Donut Chart */}
        <div className="p-5 rounded-2xl bg-surface border border-line flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-fg">নথির ধরন</h2>
            <p className="text-sm text-fg-muted">সংগৃহীত রেকর্ডের শ্রেণিবিভাগ</p>
          </div>

          {/* Donut Chart Visual */}
          <div className="relative flex items-center justify-center my-6">
            <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle cx="50" cy="50" r="38" stroke="var(--chart-grid)" strokeWidth="12" fill="none" />
              {/* Khatian: 60% = circumference 238.76 => strokeDasharray: 143 238 */}
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="var(--chart-cyan)"
                strokeWidth="12"
                strokeDasharray="143 239"
                strokeDashoffset="0"
                fill="none"
              />
              {/* Porcha: 25% => 60 */}
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="var(--chart-green)"
                strokeWidth="12"
                strokeDasharray="60 239"
                strokeDashoffset="-143"
                fill="none"
              />
              {/* Deed/Dolil: 10% => 24 */}
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="var(--chart-accent)"
                strokeWidth="12"
                strokeDasharray="24 239"
                strokeDashoffset="-203"
                fill="none"
              />
              {/* Other: 5% => 12 */}
              <circle
                cx="50"
                cy="50"
                r="38"
                stroke="var(--chart-purple)"
                strokeWidth="12"
                strokeDasharray="12 239"
                strokeDashoffset="-227"
                fill="none"
              />
            </svg>

            {/* Donut center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-fg font-mono">{formatNumber(stats.totalUploads)}</span>
              <span className="text-sm text-fg-muted font-medium">মোট নথি</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-raised/40">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-raised" />
                খতিয়ান
              </span>
              <span className="font-mono font-bold text-fg-muted">{formatNumber(60)}%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-raised/40">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                পর্চা
              </span>
              <span className="font-mono font-bold text-primary">{formatNumber(25)}%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-raised/40">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                দলিল
              </span>
              <span className="font-mono font-bold text-warning">{formatNumber(10)}%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-raised/40">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-raised" />
                অন্যান্য
              </span>
              <span className="font-mono font-bold text-fg-muted">{formatNumber(5)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch & Recent Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div
          onClick={() => onNavigate('upload')}
          className="p-4 rounded-xl bg-gradient-to-r from-primary/40 to-line border border-primary/20 hover:border-primary/40 transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-fg">স্ক্যান নথি আপলোড ও পরিষ্করণ</div>
              <div className="text-sm text-fg-muted">নয়েজ কমানো, সোজা করা ও প্রি-প্রসেসিং</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-primary" />
        </div>

        <div
          onClick={() => onNavigate('verification')}
          className="p-4 rounded-xl bg-gradient-to-r from-accent/40 to-line border border-accent/20 hover:border-accent/40 transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/20 text-warning">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-fg">স্বয়ংক্রিয় যাচাই ও হিউম্যান রিভিউ</div>
              <div className="text-sm text-fg-muted">{formatNumber(8)}টি গাণিতিক রুল চেক ও কনফিডেন্স রং</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-warning" />
        </div>

        <div
          onClick={() => onNavigate('archive')}
          className="p-4 rounded-xl bg-gradient-to-r from-surface-raised/40 to-line border border-line/20 hover:border-line/40 transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-surface-raised/20 text-fg-muted">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-fg">জরিপ ক্রস-লিংকিং ও অনুসন্ধান</div>
              <div className="text-sm text-fg-muted">CS → SA → RS → BS চেইন ও ফাজি সার্চ</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-fg-muted" />
        </div>
      </div>
    </div>
  );
};
