import type { Entry, Settings, User } from './types';

export class ApiError extends Error {
  status?: number;
  offline?: boolean;
  auth?: boolean;
}

export interface MeResp { me: User | null; setup?: boolean; canJoin?: boolean }
export interface LoadResp { entries: Entry[]; settings: Partial<Settings>; users: User[]; invite?: string }

let BASE = 'https://gogetem-flex-hq.vercel.app';
export const setApiBase = (b: string) => { BASE = b.replace(/\/+$/, ''); };

/** One call to POST /api/hq. Session cookie lives in the native cookie jar (credentials: 'include'). */
export async function apiRaw<T = Record<string, unknown>>(op: string, body: Record<string, unknown> = {}): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  let r: Response;
  try {
    r = await fetch(`${BASE}/api/hq`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
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
  if (r.status === 401 && op !== 'login' && op !== 'signup' && op !== 'me') {
    const ae = new ApiError('Signed out. Sign in again.');
    ae.auth = true;
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
