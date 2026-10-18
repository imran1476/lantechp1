// ভূমিলিপি — সার্ভার-সাইড লগইন ও রোল-ভিত্তিক অ্যাক্সেস।
// কোনো বাড়তি npm প্যাকেজ লাগে না: Node-এর crypto (scrypt + HMAC) ব্যবহার করা হয়েছে।
// সেশন = HMAC-সই করা টোকেন, httpOnly + SameSite=Strict কুকিতে থাকে (জাভাস্ক্রিপ্ট পড়তে পারে না)।
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export type Role = 'operator' | 'reviewer' | 'admin';

export interface PublicUser {
  username: string;
  name: string;
  nameEn: string;
  role: Role;
}

interface UserRecord extends PublicUser {
  salt: string;
  hash: string;
}

const COOKIE_NAME = 'bhoomi_session';
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_FAILS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

const isProd = process.env.NODE_ENV === 'production';

let secret = process.env.AUTH_SECRET || '';
if (!secret) {
  if (isProd) {
    throw new Error('AUTH_SECRET সেট করা নেই। প্রোডাকশনে এটি বাধ্যতামূলক (কমপক্ষে ৩২ অক্ষরের র‍্যান্ডম স্ট্রিং)।');
  }
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('[auth] AUTH_SECRET নেই — এই রানের জন্য র‍্যান্ডম সিক্রেট তৈরি হলো (রিস্টার্ট করলে সবাই লগআউট হবে)।');
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function makeUser(username: string, name: string, nameEn: string, role: Role, password: string): UserRecord {
  const salt = crypto.randomBytes(16).toString('hex');
  return { username, name, nameEn, role, salt, hash: hashPassword(password, salt) };
}

// ডেমো অ্যাকাউন্ট (সব কাল্পনিক)। পাসওয়ার্ড .env থেকে বদলানো যায়; আসল ডেপ্লয়মেন্টে অবশ্যই বদলাবেন।
export const DEMO_MODE = process.env.DEMO_MODE !== 'false';
const defaultPw = process.env.DEMO_PASSWORD || 'Bhoomi@2026';

const users: UserRecord[] = [
  makeUser('operator', 'রফিকুল ইসলাম', 'Rafiqul Islam', 'operator', process.env.OPERATOR_PASSWORD || defaultPw),
  makeUser('reviewer', 'নাসরিন সুলতানা', 'Nasrin Sultana', 'reviewer', process.env.REVIEWER_PASSWORD || defaultPw),
  makeUser('admin', 'সিস্টেম প্রশাসক', 'System Admin', 'admin', process.env.ADMIN_PASSWORD || defaultPw),
];
const DUMMY = makeUser('_dummy', '', '', 'operator', crypto.randomBytes(8).toString('hex'));

export const DEMO_ACCOUNTS = users.map((u) => ({ username: u.username, role: u.role }));
export const DEMO_PASSWORD_HINT = DEMO_MODE && !process.env.DEMO_PASSWORD && !process.env.OPERATOR_PASSWORD ? defaultPw : null;

const toPublic = (u: UserRecord): PublicUser => ({ username: u.username, name: u.name, nameEn: u.nameEn, role: u.role });

// ---------- টোকেন ----------
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const sign = (data: string) => crypto.createHmac('sha256', secret).update(data).digest('base64url');
const revoked = new Map<string, number>(); // jti -> exp

function issueToken(username: string): string {
  const payload = { u: username, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS, j: crypto.randomBytes(8).toString('hex') };
  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function readToken(token: string | undefined): { user: UserRecord; jti: string; exp: number } | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof p.exp !== 'number' || p.exp < Date.now() / 1000) return null;
    if (revoked.has(p.j)) return null;
    const user = users.find((u) => u.username === p.u);
    return user ? { user, jti: p.j, exp: p.exp } : null;
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  (header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function cookieFlags(req: Request): string {
  const secure = isProd && (req.secure || req.headers['x-forwarded-proto'] === 'https');
  return `Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
}

// ---------- ব্রুট-ফোর্স সীমা ----------
const fails = new Map<string, { count: number; first: number }>();
function lockInfo(key: string): number {
  const f = fails.get(key);
  if (!f) return 0;
  if (Date.now() - f.first > LOCK_WINDOW_MS) { fails.delete(key); return 0; }
  return f.count >= MAX_FAILS ? Math.ceil((LOCK_WINDOW_MS - (Date.now() - f.first)) / 1000) : 0;
}

function logEvent(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data })); // পাসওয়ার্ড/টোকেন কখনো লগ হয় না
}

// ---------- মিডলওয়্যার ----------
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const session = readToken(parseCookies(req.headers.cookie)[COOKIE_NAME]);
  (req as Request & { auth?: { user: PublicUser; jti: string; exp: number } | null }).auth =
    session ? { user: toPublic(session.user), jti: session.jti, exp: session.exp } : null;
  next();
}

export function requireAuth(roles?: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = (req as Request & { auth?: { user: PublicUser } | null }).auth;
    if (!auth) return res.status(401).json({ success: false, error: 'unauthenticated', message: 'লগইন করা নেই বা সেশন শেষ হয়েছে।' });
    if (roles && !roles.includes(auth.user.role)) {
      logEvent('forbidden', { user: auth.user.username, path: req.path });
      return res.status(403).json({ success: false, error: 'forbidden', message: 'এই কাজের অনুমতি আপনার রোলে নেই।' });
    }
    next();
  };
}

// ক্রস-সাইট অনুরোধ ঠেকাতে: অরিজিন থাকলে হোস্টের সাথে মিলতে হবে (SameSite=Strict-এর অতিরিক্ত স্তর)
export function sameOriginOnly(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ success: false, error: 'bad_origin', message: 'অনুমোদিত নয় এমন উৎস থেকে অনুরোধ।' });
      }
    } catch {
      return res.status(403).json({ success: false, error: 'bad_origin' });
    }
  }
  next();
}

export function registerAuthRoutes(app: import('express').Express) {
  app.get('/api/auth/config', (_req, res) => {
    res.json({ demoMode: DEMO_MODE, demoAccounts: DEMO_MODE ? DEMO_ACCOUNTS : [], demoPasswordHint: DEMO_PASSWORD_HINT });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = String(req.body?.username ?? '').trim().toLowerCase().slice(0, 64);
    const password = String(req.body?.password ?? '').slice(0, 256);
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'missing', message: 'ইউজারনেম ও পাসওয়ার্ড দিন।' });
    }
    const key = `${req.ip}|${username}`;
    const wait = lockInfo(key);
    if (wait > 0) {
      return res.status(429).json({ success: false, error: 'locked', retryAfterSeconds: wait,
        message: `অনেকবার ভুল চেষ্টা হয়েছে। ${Math.ceil(wait / 60)} মিনিট পরে আবার চেষ্টা করুন।` });
    }
    const user = users.find((u) => u.username === username);
    const candidate = hashPassword(password, (user ?? DUMMY).salt); // ইউজার না থাকলেও একই সময় লাগে
    const ok = !!user && crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.hash, 'hex'));
    if (!ok) {
      const f = fails.get(key);
      fails.set(key, f && Date.now() - f.first <= LOCK_WINDOW_MS ? { count: f.count + 1, first: f.first } : { count: 1, first: Date.now() });
      logEvent('login_failed', { username, ip: req.ip });
      return res.status(401).json({ success: false, error: 'invalid', message: 'ইউজারনেম বা পাসওয়ার্ড ভুল।' });
    }
    fails.delete(key);
    const token = issueToken(user!.username);
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${SESSION_SECONDS}; ${cookieFlags(req)}`);
    logEvent('login_ok', { username, role: user!.role });
    res.json({ success: true, user: toPublic(user!) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const auth = (req as Request & { auth?: { user: PublicUser; jti: string; exp: number } | null }).auth;
    if (auth) { revoked.set(auth.jti, auth.exp); logEvent('logout', { username: auth.user.username }); }
    for (const [j, exp] of revoked) if (exp < Date.now() / 1000) revoked.delete(j);
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; ${cookieFlags(req)}`);
    res.json({ success: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const auth = (req as Request & { auth?: { user: PublicUser } | null }).auth;
    if (!auth) return res.status(401).json({ success: false, error: 'unauthenticated' });
    res.json({ success: true, user: auth.user });
  });
}
