import * as SecureStore from 'expo-secure-store';
import type { Entry, Settings, User } from './types';

export class ApiError extends Error {
  status?: number;
  offline?: boolean;
  auth?: boolean;
}

export interface MeResp { me: User | null; emailReset?: boolean }
export interface LoadResp { entries: Entry[]; settings: Partial<Settings>; users: User[] }

const TOKEN_KEY = 'df_token_v1';
let BASE = 'https://dashin-flexin-api.vercel.app';
let TOKEN = '';

export const setApiBase = (b: string) => { BASE = b.replace(/\/+$/, ''); };

/** The sign-in token lives in the phone's secure storage (Keychain on iPhone, Keystore on Android). */
export async function loadToken(): Promise<void> {
  try { TOKEN = (await SecureStore.getItemAsync(TOKEN_KEY)) || ''; } catch { TOKEN = ''; }
}
export async function setToken(t: string): Promise<void> {
  TOKEN = t;
  try {
    if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch { /* secure storage unavailable: token stays in memory for this session */ }
}

export const hasToken = () => !!TOKEN;

/** Ops where a 401 means "wrong details", not "your session ended". */
const OPEN_OPS: Record<string, 1> = { login: 1, signup: 1, me: 1, forgot: 1, reset: 1 };

/** One call to POST /api/hq with the Bearer token. */
export async function apiRaw<T = Record<string, unknown>>(op: string, body: Record<string, unknown> = {}): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  let r: Response;
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
    r = await fetch(`${BASE}/api/hq`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ op, ...body }),
      signal: ctl.signal,
    });
  } catch {
    const oe = new ApiError('No connection. Try again.');
    oe.offline = true;
    throw oe;
  } finally {
    clearTimeout(timer);
  }
  let j: Record<string, unknown> = {};
  try { j = await r.json(); } catch { /* empty body */ }
  if (r.status === 401 && !OPEN_OPS[op]) {
    const ae = new ApiError('Signed out. Sign in again.');
    ae.auth = true;
    ae.status = 401;
    throw ae;
  }
  if (!r.ok) {
    const he = new ApiError((j.error as string) || 'Request failed.');
    he.status = r.status;
    throw he;
  }
  return j as T;
}

const WRITE: Record<string, 1> = { put: 1, del: 1, delmany: 1, settings: 1 };
let queue: Promise<unknown> = Promise.resolve();
export let inflight = 0;
export let writeSeq = 0;

/** All writes go through one queue, one at a time, so two taps can never overlap and overwrite each other. */
export function api<T = Record<string, unknown>>(op: string, body?: Record<string, unknown>): Promise<T> {
  if (!WRITE[op]) return apiRaw<T>(op, body);
  inflight++; writeSeq++;
  const p = queue.then(() => apiRaw<T>(op, body));
  queue = p.then(() => { inflight--; }, () => { inflight--; });
  return p;
}

export const writesInFlight = () => inflight;
export const writeCount = () => writeSeq;
