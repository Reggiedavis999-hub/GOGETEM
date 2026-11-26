import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Entry, Settings, User } from './types';

export class ApiError extends Error {
  status?: number;
  offline?: boolean;
  auth?: boolean;
}

export interface MeResp { me: User | null; emailReset?: boolean; assistant?: boolean }
export interface LoadResp { entries: Entry[]; settings: Partial<Settings>; users: User[] }

const TOKEN_KEY = 'df_token_v1';
let BASE = 'https://dashin-flexin-api.vercel.app';
let TOKEN = '';

export const setApiBase = (b: string) => { BASE = b.replace(/\/+$/, ''); };

const IS_WEB = Platform.OS === 'web' && typeof window !== 'undefined';

/** Where the API and the Terms/Privacy pages live. The web version talks to its own address, which forwards /api to the backend. */
export const siteOrigin = (configured?: string): string =>
  (IS_WEB ? window.location.origin : configured || 'https://dashin-flexin-api.vercel.app').replace(/\/+$/, '');

/** The sign-in token lives in the phone's secure storage (Keychain on iPhone, Keystore on Android). */
export async function loadToken(): Promise<void> {
  try {
    TOKEN = (IS_WEB ? window.localStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY)) || '';
  } catch { TOKEN = ''; }
}
export async function setToken(t: string): Promise<void> {
  TOKEN = t;
  try {
    if (IS_WEB) {
      if (t) window.localStorage.setItem(TOKEN_KEY, t);
      else window.localStorage.removeItem(TOKEN_KEY);
    } else if (t) await SecureStore.setItemAsync(TOKEN_KEY, t);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch { /* secure storage unavailable: token stays in memory for this session */ }
}

export const hasToken = () => !!TOKEN;

/** Ops where a 401 means "wrong details", not "your session ended". */
const OPEN_OPS: Record<string, 1> = { login: 1, signup: 1, me: 1, forgot: 1, reset: 1 };

/** One call to POST /api/hq with the Bearer token. */
export async function apiRaw<T = Record<string, unknown>>(op: string, body: Record<string, unknown> = {}, timeoutMs = 25000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
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

export interface AssistReply {
  summary: string;
  question: string;
  changes: import('./calc').AssistChange[];
}

/** Asks the notes assistant to read a note. Never saves anything: the app shows the proposal and the person confirms. */
export function askAssistant(text: string, context: Record<string, unknown>, clean: boolean): Promise<AssistReply> {
  return apiRaw<AssistReply>('assist', { text, context, clean });
}

export interface ChatTurn { role: 'user' | 'assistant'; text: string }
export interface ChatAttachment { mime: string; data: string }
export interface ChatFile { name: string; text: string }

/** One chat turn. The server never changes saved data from chat. Attachments ride only on the newest message. */
export function askChat(
  messages: ChatTurn[], attachments: ChatAttachment[], files: ChatFile[], clean: boolean,
): Promise<{ reply: string }> {
  return apiRaw<{ reply: string }>('chat', { messages, attachments, files, clean }, 40000);
}
