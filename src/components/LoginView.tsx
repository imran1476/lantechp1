import React, { useState } from 'react';
import { ScanLine, Cpu, Search, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageToggle } from './LanguageToggle';

export const LoginView: React.FC = () => {
  const { login, config } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t('login.errEmpty'));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await login(username.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setError(result.code === 'network' ? t('login.errNetwork') : result.message || t('login.errNetwork'));
      setPassword('');
    }
  };

  const roleLabel = (r: string) => (r === 'operator' ? t('role.operator') : r === 'reviewer' ? t('role.reviewer') : t('role.admin'));

  const pillars = [
    { icon: <ScanLine className="w-5 h-5" />, title: t('login.p1t'), desc: t('login.p1d') },
    { icon: <Cpu className="w-5 h-5" />, title: t('login.p2t'), desc: t('login.p2d') },
    { icon: <Search className="w-5 h-5" />, title: t('login.p3t'), desc: t('login.p3d') },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-surface-sunken text-fg font-sans">
      {/* বাম পাশ: ব্র্যান্ডিং */}
      <div className="login-brand-panel w-full md:w-5/12 bg-gradient-to-br from-[var(--login-gradient-start)] via-[var(--login-gradient-middle)] to-[var(--login-gradient-end)] p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-primary/40 relative overflow-hidden">
        <div className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-80px] right-[-80px] w-80 h-80 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <img src="/bangladesh-land-logo.svg" alt="বাংলাদেশের মানচিত্র" className="w-12 h-12 object-contain shrink-0" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fg">
                ভূমি<span className="text-primary">লিপি</span>
              </h1>
              <span className="text-sm text-primary/90 tracking-wider">{t('brand.round')}</span>
            </div>
          </div>

          <div className="space-y-4 my-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-fg leading-tight">{t('login.heroTitle')}</h2>
            <p className="text-sm sm:text-base text-fg-muted leading-relaxed font-light">{t('login.heroText')}</p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-3 my-6">
          {pillars.map((p) => (
            <div key={p.title} className="flex items-center gap-3.5 p-3.5 rounded-xl bg-surface/60 border border-primary/20 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">{p.icon}</div>
              <div>
                <div className="font-semibold text-sm text-fg">{p.title}</div>
                <div className="text-sm text-fg-muted">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-sm text-fg-muted pt-4 border-t border-primary/50 flex items-center justify-between gap-2">
          <span>{t('login.footer')}</span>
          <span className="flex items-center gap-1 text-primary">
            <ShieldCheck className="w-3.5 h-3.5" /> {t('login.footerSecure')}
          </span>
        </div>
      </div>

      {/* ডান পাশ: লগইন ফর্ম */}
      <div className="w-full md:w-7/12 flex flex-col p-6 sm:p-12 bg-surface">
        <div className="flex justify-end">
          <LanguageToggle />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-fg tracking-tight">{t('login.welcome')}</h2>
              <p className="text-sm text-fg-muted">{t('login.sub')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="login-username" className="text-sm font-medium text-fg-muted">
                  {t('login.user')}
                </label>
                <div className="relative">
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('login.userPh')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-line text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                  <User className="w-4 h-4 text-fg-muted absolute right-3.5 top-3" aria-hidden="true" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-fg-muted">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.passwordPh')}
                    className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-surface-raised border border-line text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  />
                  <Lock className="w-4 h-4 text-fg-muted absolute right-3.5 top-3" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-10 top-2 p-1 text-fg-muted hover:text-fg"
                    aria-label={showPw ? t('login.hide') : t('login.show')}
                    title={showPw ? t('login.hide') : t('login.show')}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-sm text-danger">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{busy ? t('login.submitting') : t('login.submit')}</span>
                {!busy && <ArrowRight className="w-4 h-4" />}
              </button>
              <p className="text-sm text-fg-muted text-center">{t('login.forgot')}</p>
            </form>

            {config?.demoMode && config.demoAccounts.length > 0 && (
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-sm text-primary space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{t('login.demoTitle')}</span>
                </div>
                <ul className="space-y-1.5">
                  {config.demoAccounts.map((a) => (
                    <li key={a.username} className="flex items-center justify-between gap-2">
                      <span>
                        <b className="font-mono">{a.username}</b> — {roleLabel(a.role)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUsername(a.username);
                          setError(null);
                        }}
                        className="px-2 py-0.5 rounded-md border border-primary/30 hover:bg-primary/20 transition"
                      >
                        {t('login.demoFill')}
                      </button>
                    </li>
                  ))}
                </ul>
                {config.demoPasswordHint && (
                  <div>
                    {t('login.demoPw')} <b className="font-mono">{config.demoPasswordHint}</b>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
