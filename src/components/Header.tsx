import React from 'react';
import {
  Bell,
  BookOpen,
  LogOut,
  Menu,
  Moon,
  Sun,
  Settings
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageToggle } from './LanguageToggle';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenConceptModal?: () => void;
  onLogout?: () => void;
  activeTabLabel: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenConceptModal,
  onLogout,
  activeTabLabel,
}) => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const displayName = user ? (lang === 'en' ? user.nameEn : user.name) : '';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]).join('');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const profileButtonRef = React.useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem('theme');
    } catch {
      savedTheme = null;
    }
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('theme', theme);
    } catch {
      // Theme still applies when browser storage is unavailable.
    }
  }, [theme]);

  React.useEffect(() => {
    if (!showProfileMenu) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setShowProfileMenu(false);
        setShowSettings(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
        setShowSettings(false);
        profileButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showProfileMenu]);

  const notifications = [
    {
      id: 1,
      title: 'খতিয়ান নং ১২৩৪ স্বয়ংক্রিয় রুল চেক',
      desc: 'দাগ নম্বর ৫৬৭ কনফিডেন্স ৭৮% সতর্কবার্তা জারি',
      time: '৫ মিনিট আগে',
      unread: true,
    },
    {
      id: 2,
      title: 'নতুন নথি আপলোড সফল',
      desc: 'khatiyan_1234.pdf প্রসেসিংয়ের জন্য প্রস্তুত',
      time: '১২ মিনিট আগে',
      unread: true,
    },
    {
      id: 3,
      title: 'সিস্টেম অডিট লক',
      desc: '৩টি রেকর্ডের ক্রিপ্টোগ্রাফিক হ্যাশ তৈরি হয়েছে',
      time: '১ ঘণ্টা আগে',
      unread: false,
    },
  ];

  return (
    <header className="app-header h-16 backdrop-blur px-4 sm:px-6 flex items-center justify-between z-20 sticky top-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="header-action p-2 rounded-lg transition md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="header-crumb">{t('header.crumb')}</span>
          <span className="header-divider">/</span>
          <span className="font-semibold">{activeTabLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <LanguageToggle />
        <button
          type="button"
          onClick={() => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark')}
          className="header-action p-2 rounded-lg transition"
          title={theme === 'dark' ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'}
          aria-label={theme === 'dark' ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="header-action p-2 rounded-lg transition relative"
            title="বিজ্ঞপ্তি"
          >
            <Bell className="w-5 h-5" />
            <span className="header-notification-count absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--header-background)]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-line rounded-xl shadow-md p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-line">
                <span className="font-semibold text-sm text-fg">বিজ্ঞপ্তিসমূহ</span>
                <span className="text-sm text-primary font-mono">২টি নতুন</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2 rounded-lg text-sm transition ${
                      n.unread ? 'bg-surface-raised/70 border border-line/50' : 'bg-transparent text-fg-muted'
                    }`}
                  >
                    <div className="font-medium text-fg mb-0.5">{n.title}</div>
                    <div className="text-sm text-fg-muted leading-tight">{n.desc}</div>
                    <div className="text-sm text-fg-muted mt-1 font-mono">{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={profileMenuRef} className="relative">
          <button
            ref={profileButtonRef}
            type="button"
            onClick={() => setShowProfileMenu((open) => !open)}
            className="header-profile-border flex items-center gap-2 pl-2 sm:pl-3 border-l text-left"
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            aria-label={t('header.profile')}
          >
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-[var(--on-primary)] font-bold text-sm shadow-sm ring-2 ring-primary/20">
              {initials}
            </div>
            <div className="hidden sm:block leading-tight">
              <span className="block text-sm font-semibold">{displayName}</span>
              <span className="header-operator-caption block text-sm">{user ? t(`role.${user.role}` as const) : ''}</span>
            </div>
          </button>

          {showProfileMenu && (
            <div role="menu" aria-label="প্রোফাইল অপশন" className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-md z-50">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onOpenConceptModal?.();
                  setShowProfileMenu(false);
                }}
                className="profile-menu-item"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t('header.concept')}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => setShowSettings((open) => !open)}
                className="profile-menu-item"
                aria-expanded={showSettings}
              >
                <Settings className="w-4 h-4" />
                <span>{t('header.settings')}</span>
              </button>
              {showSettings && (
                <div className="profile-settings" role="group" aria-label="থিম সেটিংস">
                  <button type="button" onClick={() => setTheme('light')} aria-pressed={theme === 'light'}>{t('header.light')}</button>
                  <button type="button" onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}>{t('header.dark')}</button>
                </div>
              )}
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onLogout?.();
                  setShowProfileMenu(false);
                }}
                className="profile-menu-item profile-menu-logout"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('header.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
