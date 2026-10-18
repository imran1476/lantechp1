import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Role = 'operator' | 'reviewer' | 'admin';

export interface AuthUser {
  username: string;
  name: string;
  nameEn: string;
  role: Role;
}

export interface AuthConfig {
  demoMode: boolean;
  demoAccounts: { username: string; role: Role }[];
  demoPasswordHint: string | null;
}

export type LoginResult = { ok: true } | { ok: false; code: 'invalid' | 'locked' | 'missing' | 'network'; message?: string };

interface AuthValue {
  user: AuthUser | null;
  checking: boolean;
  config: AuthConfig | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  can: (action: 'upload' | 'edit' | 'review') => boolean;
  /** API ডাকার সময় 401 এলে নিজে থেকে লগআউট করে */
  api: (input: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthValue | null>(null);

// রোল ও অনুমতি: operator = আপলোড/সংশোধন, reviewer = অনুমোদন/প্রত্যাখ্যান, admin = সব
const PERMISSIONS: Record<Role, Array<'upload' | 'edit' | 'review'>> = {
  operator: ['upload', 'edit'],
  reviewer: ['edit', 'review'],
  admin: ['upload', 'edit', 'review'],
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [config, setConfig] = useState<AuthConfig | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [me, cfg] = await Promise.all([fetch('/api/auth/me'), fetch('/api/auth/config')]);
        if (!alive) return;
        if (me.ok) setUser((await me.json()).user as AuthUser);
        if (cfg.ok) setConfig((await cfg.json()) as AuthConfig);
      } catch {
        // সার্ভার না পেলে লগইন পেজ দেখাবে
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setUser(data.user as AuthUser);
        return { ok: true };
      }
      const code = data.error === 'locked' ? 'locked' : data.error === 'missing' ? 'missing' : 'invalid';
      return { ok: false, code, message: data.message };
    } catch {
      return { ok: false, code: 'network' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    } finally {
      setUser(null);
    }
  }, []);

  const api = useCallback(
    async (input: string, init?: RequestInit) => {
      const res = await fetch(input, init);
      if (res.status === 401) setUser(null);
      return res;
    },
    []
  );

  const can = useCallback((action: 'upload' | 'edit' | 'review') => !!user && PERMISSIONS[user.role].includes(action), [user]);

  const value = useMemo(() => ({ user, checking, config, login, logout, can, api }), [user, checking, config, login, logout, can, api]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth অবশ্যই AuthProvider-এর ভেতরে ব্যবহার করতে হবে');
  return ctx;
}
