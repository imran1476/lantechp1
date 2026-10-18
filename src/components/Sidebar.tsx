import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Cpu,
  CheckCheck,
  Search,
  FileSpreadsheet,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export type NavTab = 
  | 'dashboard' 
  | 'upload' 
  | 'ocr' 
  | 'extraction' 
  | 'verification' 
  | 'archive' 
  | 'details' 
  | 'concept';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const { t } = useLanguage();
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'upload',
      label: t('nav.upload'),
      icon: <UploadCloud className="w-5 h-5" />,
      badge: '৩',
    },
    {
      id: 'ocr',
      label: t('nav.ocr'),
      icon: <Cpu className="w-5 h-5" />,
    },
    {
      id: 'extraction',
      label: t('nav.extraction'),
      icon: <FileSpreadsheet className="w-5 h-5" />,
    },
    {
      id: 'verification',
      label: t('nav.verification'),
      icon: <CheckCheck className="w-5 h-5" />,
      badge: '১২',
    },
    {
      id: 'archive',
      label: t('nav.archive'),
      icon: <Search className="w-5 h-5" />,
    },
    {
      id: 'concept',
      label: t('nav.concept'),
      icon: <BookOpen className="w-5 h-5" />,
      badge: 'P1',
    },
  ];

  return (
    <aside
      className={`h-screen bg-surface border-r border-line flex flex-col justify-between transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-line">
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
          >
            <img
              src="/bangladesh-land-logo.svg"
              alt="বাংলাদেশের মানচিত্র"
              className="w-10 h-10 object-contain shrink-0"
            />
            {!collapsed && (
              <div className="leading-tight">
                <span className="font-bold text-lg text-fg tracking-tight flex items-center gap-1.5">
                  Bhoomi<span className="text-primary">AI</span>
                </span>
                <span className="block text-sm text-fg-muted font-medium">
                  {t('brand.sub')}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-fg-muted hover:text-on-primary hover:bg-surface-raised transition hidden md:block"
            title={collapsed ? t('nav.expand') : t('nav.collapse')}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm'
                    : 'text-fg-muted hover:text-on-primary hover:bg-surface-raised/60'
                }`}
                title={item.label}
              >
                <span className={`${isActive ? 'text-primary' : 'text-fg-muted group-hover:text-on-primary'}`}>
                  {item.icon}
                </span>

                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {!collapsed && item.badge && (
                  <span
                    className={`text-sm px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-primary/30 text-primary'
                        : 'bg-surface-raised text-fg-muted group-hover:bg-surface-raised'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed tooltip */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-surface-raised text-fg text-sm rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Operator Info */}
      <div className="sidebar-footer p-3 border-t border-line/80">
        {!collapsed ? (
          <div className="bg-surface-raised/40 border border-line rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5 text-sm text-primary font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('nav.footerTitle')}</span>
            </div>
            <p className="text-sm text-fg-muted leading-snug">
              {t('nav.footerText')}
            </p>
          </div>
        ) : (
          <div className="flex justify-center text-primary p-2">
            <ShieldCheck className="w-5 h-5" />
          </div>
        )}
      </div>
    </aside>
  );
};
