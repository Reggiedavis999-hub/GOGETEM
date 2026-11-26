import type {
  Block, BlockSum, DashDetail, Drop, Entry, ExpPlatform, ExpSum, Expense, LiveDash, LiveDelivery, Platform, Play, Problems, Settings,
} from './types';

/* ---------- constants ---------- */
export const PLATS: Platform[] = ['flex', 'doordash', 'ubereats'];
export const PLAT_NAME: Record<ExpPlatform, string> = {
  flex: 'Flex', doordash: 'DoorDash', ubereats: 'Uber Eats', all: 'Shared',
};
export const EXP_CATS = ['Gas', 'Maintenance', 'Car wash', 'Phone', 'Parking / Tolls', 'Supplies', 'Other'];
export const VEHICLE_CATS = ['Gas', 'Maintenance', 'Car wash'];
export const DEFAULT_SETTINGS: Settings = {
  nameA: '', nameB: '', goal: 800, setAside: 25, station: '', rate: '',
};
export const GENERAL_WINDOWS = [
  { a: 5, b: 7, l: 'Early morning' },
  { a: 9, b: 13.5, l: 'Mid-day (afternoon + next-day drops)' },
  { a: 18, b: 21, l: 'Evening (next-day drops)' },
];

/* ---------- number / text helpers ---------- */
export const pad = (n: number) => String(n).padStart(2, '0');
export const c2 = (n: number) => Math.round((+n || 0) * 100) / 100;

export function money(n: number | undefined | null): string {
  const v = Number(n) || 0;
  return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function money0(n: number | undefined | null): string {
  const v = Number(n) || 0;
  return (v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US');
}
export function num(n: number | undefined | null, d = 1): string {
  return (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: d });
}
export function newId(): string {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------- date / time ---------- */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());

export function parseLocal(ds: string, ts?: string): Date {
  const p = String(ds || '').split('-').map(Number);
  const t = String(ts || '00:00').split(':').map(Number);
  return new Date(p[0] || 1970, (p[1] || 1) - 1, p[2] || 1, t[0] || 0, t[1] || 0);
}
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
export function fmtClock(h: number): string {
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) { hh += 1; mm = 0; }
  const ap = hh % 24 >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return h12 + (mm ? ':' + pad(mm) : '') + ' ' + ap;
}
export function fmtTime(t?: string): string {
  if (!t) return '';
  const p = t.split(':').map(Number);
  return fmtClock(p[0] + (p[1] || 0) / 60);
}
export function fmtDate(ds: string): string {
  return parseLocal(ds).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
}
export function fmtStamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }) + ' ' + fmtClock(d.getHours() + d.getMinutes() / 60);
}
export function dur(ms: number): string {
  let m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  m = m % 60;
  if (h >= 48) return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
  return h ? h + 'h ' + m + 'm' : m + 'm';
}
export function clk(ms: number): string {
  const q = Math.floor(ms / 1000);
  return Math.floor(q / 3600) + ':' + pad(Math.floor((q % 3600) / 60)) + ':' + pad(q % 60);
}
export const hourLabel = (h: number) => fmtClock(h).replace(':00', '');

export const startOf = (e: Block) => parseLocal(e.date, e.start);
export const endOf = (e: Block) => new Date(startOf(e).getTime() + (+e.hours || 0) * 3600000);

export function dayLabel(ds: string): string {
  const t = new Date();
  const f = (n: number) => ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + n));
  return ds === f(0) ? 'Today' : ds === f(1) ? 'Tomorrow' : ds === f(-1) ? 'Yesterday' : fmtDate(ds);
}

/* ---------- input parsing (forms) ---------- */
export function cleanNum(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(/[$,\s]/g, ''));
  return isFinite(n) && n >= 0 ? n : 0;
}
export function parseHours(v: string): number {
  const s = String(v || '').toLowerCase().replace(/,/g, '.').trim();
  if (!s) return 0;
  let m = s.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d+)\s*(?:m|min|mins)?)?$/);
  if (m) return c2(+m[1] + (m[2] ? +m[2] / 60 : 0));
  m = s.match(/^(\d+):(\d{1,2})$/);
  if (m) return c2(+m[1] + +m[2] / 60);
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minutes)$/);
  if (m) return c2(+m[1] / 60);
  const n = parseFloat(s.replace(/[^\d.]/g, ''));
  return isFinite(n) && n > 0 ? c2(n) : 0;
}
export const isPerHr = (v: string) => /(\/\s*(h|hr|hour)|per\s*(h|hr|hour)|an\s*hour|hourly)/i.test(String(v || ''));
export function parsePay(v: string, hours: number): number {
  const m = String(v || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  const n = m ? +m[0] : 0;
  return isPerHr(v) ? c2(n * (hours || 0)) : c2(n);
}
/** Accepts 6, 6:30, 6am, 6:30pm, 18:00. Returns HH:MM or '' */
export function parseTimeInput(v: string): string {
  const s = String(v || '').trim().toLowerCase().replace(/\s+/g, '');
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?(a|p|am|pm)?$/);
  if (!m) return '';
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  if (min > 59) return '';
  if (m[3]) {
    if (h < 1 || h > 12) return '';
    if (m[3][0] === 'p' && h < 12) h += 12;
    if (m[3][0] === 'a' && h === 12) h = 0;
  } else if (h > 23) return '';
  return pad(h) + ':' + pad(min);
}
/** Accepts YYYY-MM-DD, M/D, M/D/YY, M/D/YYYY, "today", "tomorrow". Returns YYYY-MM-DD or '' */
export function parseDateInput(v: string): string {
  const s = String(v || '').trim().toLowerCase();
  const now = new Date();
  if (s === 'today') return ymd(now);
  if (s === 'tomorrow') return ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y: number, mo: number, d: number;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; } else {
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/);
    if (!m) return '';
    mo = +m[1]; d = +m[2]; y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
  }
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return '';
  return ymd(dt);
}
export const tmin = (t: string) => {
  const p = String(t || '').split(':');
  return (+p[0] || 0) * 60 + (+p[1] || 0);
};
export const minT = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return pad(Math.floor(x / 60)) + ':' + pad(x % 60);
};

/* ---------- mileage ---------- */
/** IRS standard business mileage rate ($/mile). 2025: 70c. 2026: 72.5c to Jun 30, 76c from Jul 1. */
export function irsRate(ds: string): number {
  if (ds >= '2026-07-01') return 0.76;
  if (ds >= '2026-01-01') return 0.725;
  if (ds >= '2025-01-01') return 0.7;
  return 0.67;
}
export function rateFor(ds: string, override: string): number {
  const o = parseFloat(override);
  return isFinite(o) && o > 0 ? o : irsRate(ds);
}

/* ---------- normalizers ---------- */
export function normPlat(v: unknown): Platform {
  return v === 'doordash' || v === 'ubereats' ? v : 'flex';
}
export function expPlat(e: { platform?: unknown }): ExpPlatform {
  return PLATS.includes(e.platform as Platform) ? (e.platform as Platform) : 'all';
}

/* ---------- selectors ---------- */
export const blocksOf = (es: Entry[]): Block[] => es.filter((e): e is Block => e.type === 'block');
export const dropsOf = (es: Entry[]): Drop[] => es.filter((e): e is Drop => e.type === 'drop').sort((a, b) => b.ts - a.ts);
export const expensesOf = (es: Entry[]): Expense[] => es.filter((e): e is Expense => e.type === 'expense');

export function doneBlocks(es: Entry[], now = new Date()): Block[] {
  return blocksOf(es).filter((e) => e.status !== 'planned' && e.status !== 'cancelled' && startOf(e) <= now);
}
export function futureDone(es: Entry[], now = new Date()): Block[] {
  return blocksOf(es).filter((e) => e.status !== 'planned' && e.status !== 'cancelled' && startOf(e) > now);
}
export function plannedBlocks(es: Entry[]): Block[] {
  return blocksOf(es).filter((e) => e.status === 'planned').sort((a, b) => +startOf(a) - +startOf(b));
}
export function upcomingBlocks(es: Entry[], now = new Date()): Block[] {
  return blocksOf(es)
    .filter((e) => e.status === 'planned' || (e.status !== 'cancelled' && startOf(e) > now))
    .sort((a, b) => +startOf(a) - +startOf(b));
}

/* ---------- sums ---------- */
export function sumBlocks(list: Block[], override = ''): BlockSum {
  const r = { gross: 0, pay: 0, tips: 0, hours: 0, miles: 0, orders: 0, n: list.length, deduct: 0, perHr: 0, perOrder: 0 };
  let og = 0;
  list.forEach((e) => {
    if ((+e.orders || 0) > 0) og += (+e.pay || 0) + (+e.tips || 0);
    r.pay += +e.pay || 0; r.tips += +e.tips || 0; r.hours += +e.hours || 0; r.miles += +e.miles || 0; r.orders += +e.orders || 0;
    r.deduct += (+e.miles || 0) * rateFor(e.date, override);
  });
  r.pay = c2(r.pay); r.tips = c2(r.tips); r.hours = c2(r.hours); r.miles = c2(r.miles); r.deduct = c2(r.deduct);
  r.gross = c2(r.pay + r.tips);
  r.perHr = r.hours > 0 ? r.gross / r.hours : 0;
  r.perOrder = r.orders > 0 ? og / r.orders : 0;
  return r;
}
export function sumExpenses(list: Expense[]): ExpSum {
  const r: ExpSum = { n: list.length, total: 0, veh: 0, other: 0, byCat: {} };
  list.forEach((e) => {
    const a = +e.amt || 0;
    r.total += a;
    if (VEHICLE_CATS.includes(e.cat)) r.veh += a; else r.other += a;
    r.byCat[e.cat] = (r.byCat[e.cat] || 0) + a;
  });
  r.total = c2(r.total); r.veh = c2(r.veh); r.other = c2(r.other);
  Object.keys(r.byCat).forEach((k) => { r.byCat[k] = c2(r.byCat[k]); });
  return r;
}
export const expensesFor = (list: Expense[], plat: string) => (plat === 'all' ? list : list.filter((e) => expPlat(e) === plat));
export const profitOf = (gross: number, deduct: number, other: number) => c2(gross - deduct - other);

/** Splits what the person typed into base pay and tips. tipsIn: the typed amount is the total and tips are part of it. */
export function splitPay(entered: number, tips: number, tipsIn: boolean): { base: number; tips: number; total: number; bad: boolean } {
  const e = c2(Math.max(0, entered || 0));
  const t = c2(Math.max(0, tips || 0));
  if (tipsIn) {
    const bad = t > e + 0.004;
    const base = bad ? 0 : c2(e - t);
    return { base, tips: t, total: c2(base + t), bad };
  }
  return { base: e, tips: t, total: c2(e + t), bad: false };
}

export function rateText(e: Block): string {
  const g = (+e.pay || 0) + (+e.tips || 0);
  let t = (+e.hours > 0 ? money(g / e.hours) : '$0.00') + '/hr' + (+e.tips > 0 ? ' with tips' : '');
  if (+e.orders > 0) t += ` · ${num(e.orders, 0)} orders · ${money(g / e.orders)}/order`;
  return t;
}

/* ---------- live dash: plays ---------- */
const HR = 3600000;

export const playMs = (p: Play, now: number) => Math.max(0, (p.end ?? now) - p.start);

export interface DashStats {
  plays: number;
  /** plays that have a Play made total */
  done: number;
  deliveries: number;
  /** sum of every finished play's total (tips are inside) */
  total: number;
  /** what the base rates say the plays should have paid: rate x that play's active time */
  base: number;
  /** total minus base: promos, peak pay and tips on top of the base rates */
  above: number;
  dashMs: number;
  activeMs: number;
  deadMs: number;
  /** total over the whole dash clock */
  perHrDash: number;
  /** total over time spent on finished plays only */
  perHrActive: number;
  perPlay: number;
  /** dollars per mile, 0 when no miles */
  perMile: number;
}

/** Everything the home card, the End dash sheet, the editor and the schedule show comes from this one function. */
export function dashStats(plays: Play[], dashMs: number, miles = 0, now = Date.now()): DashStats {
  let total = 0, base = 0, active = 0, doneMs = 0, doneN = 0, dels = 0;
  plays.forEach((p) => {
    const ms = playMs(p, now);
    active += ms;
    base += (p.rate || 0) * (ms / HR);
    dels += p.deliveries || 0;
    if (p.end !== undefined) { total += p.total || 0; doneMs += ms; doneN++; }
  });
  total = c2(total); base = c2(base);
  const dm = Math.max(0, dashMs);
  return {
    plays: plays.length, done: doneN, deliveries: dels, total, base, above: c2(total - base),
    dashMs: dm, activeMs: active, deadMs: Math.max(0, dm - active),
    perHrDash: dm >= 300000 ? total / (dm / HR) : 0,
    perHrActive: doneMs >= 60000 ? total / (doneMs / HR) : 0,
    perPlay: doneN > 0 ? total / doneN : 0,
    perMile: miles > 0 ? total / miles : 0,
  };
}

/** Dash clock: from Live dash to now (or to the pause), minus paused time. */
export const liveDashMs = (L: LiveDash, now = Date.now()) => Math.max(0, (L.paused || now) - L.start - (L.pausedMs || 0));
export const openPlay = (L: LiveDash): Play | undefined => L.plays.find((p) => p.end === undefined);
export const liveStats = (L: LiveDash, now = Date.now()) => dashStats(L.plays, liveDashMs(L, now), 0, now);

/** Upgrades a live dash saved by the old version (one row per delivery) to plays. Returns null if it is not a live dash. */
export function migrateLive(raw: unknown): LiveDash | null {
  const r = raw as (Partial<LiveDash> & { deliveries?: LiveDelivery[]; rate?: number }) | null;
  if (!r || typeof r !== 'object' || !r.start || (r.plat !== 'doordash' && r.plat !== 'ubereats' && r.plat !== 'flex')) return null;
  if (Array.isArray(r.plays)) return { ...(r as LiveDash), paused: r.paused || 0, pausedMs: r.pausedMs || 0 };
  if (!Array.isArray(r.deliveries)) return null;
  let mi = 0, tips = 0;
  const plays: Play[] = r.deliveries.map((d, i) => {
    mi += d.mi || 0; tips += d.tip || 0;
    return { id: 'old' + i, start: d.ts, end: d.ts, rate: r.rate || 0, deliveries: 1, total: c2((d.pay || 0) + (d.tip || 0)) };
  });
  return { plat: r.plat, start: r.start, paused: r.paused || 0, pausedMs: r.pausedMs || 0, rate: r.rate, plays, miles: c2(mi) || undefined, tips: c2(tips) || undefined };
}

export interface DashFields { date: string; start: string; hours: number; pay: number; tips: number; miles: number; orders: number }

/** The saved block's numbers, always derived from the plays: total = sum of play totals, tips are inside it. */
export function dashFields(d: DashDetail, tips: number, miles: number): DashFields {
  const ms = Math.max(0, d.end - d.start - (d.pausedMs || 0));
  let total = 0, orders = 0;
  d.plays.forEach((p) => { total += p.total || 0; orders += p.deliveries || 0; });
  total = c2(total);
  const t = Math.min(c2(Math.max(0, tips)), total);
  const st = new Date(d.start);
  return {
    date: ymd(st), start: pad(st.getHours()) + ':' + pad(st.getMinutes()),
    hours: Math.max(0.02, c2(ms / HR)), pay: c2(total - t), tips: t, miles: c2(Math.max(0, miles)), orders,
  };
}

/** A clock time on a date, moved forward past midnight if it would land before notBefore. */
export function msFromHM(date: string, hm: string, notBefore: number): number {
  let t = parseLocal(date, hm).getTime();
  while (t < notBefore - 60000) t += 86400000;
  return t;
}

export interface DashRow { id: string; rate: number; deliveries: number; startHM: string; endHM: string; total: number }
export interface DashInput { date: string; startHM: string; endHM: string; pausedMs: number; tips: number; miles: number; rows: DashRow[] }

/** Turns what the editor holds into a saved dash. Checks times, overlaps and tips. */
export function buildDash(i: DashInput): { ok: true; dash: DashDetail; fields: DashFields } | { ok: false; error: string } {
  const sh = parseTimeInput(i.startHM), eh = parseTimeInput(i.endHM);
  if (!sh || !eh) return { ok: false, error: 'Add a start and end time for the dash, like 5:41 PM.' };
  const ds = parseLocal(i.date, sh).getTime();
  const de = msFromHM(i.date, eh, ds + 1);
  if (de - ds - (i.pausedMs || 0) < 60000) return { ok: false, error: 'The dash needs to be at least a minute long.' };
  if (de - ds > 20 * HR) return { ok: false, error: 'That dash is over 20 hours. Check the start and end times.' };
  const plays: Play[] = [];
  for (let k = 0; k < i.rows.length; k++) {
    const r = i.rows[k];
    const a = parseTimeInput(r.startHM), b = parseTimeInput(r.endHM);
    if (!a || !b) return { ok: false, error: `Play ${k + 1} needs a start and end time.` };
    const ps = msFromHM(i.date, a, ds);
    const pe = msFromHM(i.date, b, ps + 1);
    if (pe < ps) return { ok: false, error: `Play ${k + 1} ends before it starts.` };
    if (ps < ds - 60000 || pe > de + 60000) return { ok: false, error: `Play ${k + 1} runs outside the dash time. Check its times.` };
    if (!(r.deliveries >= 1)) return { ok: false, error: `Play ${k + 1} needs at least 1 order.` };
    plays.push({ id: r.id, start: ps, end: pe, rate: Math.max(0, r.rate || 0), deliveries: Math.round(r.deliveries), total: c2(Math.max(0, r.total || 0)) });
  }
  plays.sort((x, y) => x.start - y.start);
  for (let k = 1; k < plays.length; k++) {
    if (plays[k].start < (plays[k - 1].end as number) - 1000) return { ok: false, error: `Two plays overlap around ${fmtStamp(plays[k].start)}. Fix the times.` };
  }
  const dash: DashDetail = { start: ds, end: de, pausedMs: i.pausedMs || 0, plays };
  const f = dashFields(dash, i.tips, i.miles);
  if (c2(i.tips) > c2(f.pay + f.tips) + 0.004) return { ok: false, error: 'Tips are more than the total. The total already includes the tips.' };
  return { ok: true, dash, fields: f };
}

/** A plain block (no play detail) shown as one play, so an old dash can be broken into plays. */
export function dashFromBlock(b: Block): DashDetail {
  const st = parseLocal(b.date, b.start).getTime();
  const en = st + Math.max(0.02, +b.hours || 0) * HR;
  return { start: st, end: en, pausedMs: 0, plays: [{ id: newId(), start: st, end: en, rate: 0, deliveries: Math.max(1, Math.round(+b.orders || 1)), total: c2((+b.pay || 0) + (+b.tips || 0)) }] };
}

/* ---------- notes assistant: applying what it proposes ---------- */
export type AssistKind = 'add_miles' | 'set_miles' | 'add_total' | 'add_expense' | 'play_total';
export interface AssistChange { kind: AssistKind; value: number; tip?: boolean; play?: number; cat?: string; note?: string }
export interface ExpDraft { amt: number; cat: string; note: string }
export interface AssistState { miles: number; tips: number; total: number; plays: Play[]; expenses: ExpDraft[] }

export const assistTotal = (s: AssistState) => (s.plays.length ? c2(s.plays.reduce((a, p) => a + (p.total || 0), 0)) : c2(s.total));

/**
 * The model only reads the note and names the numbers. This does the adding and subtracting, so the math cannot drift.
 * Refuses anything that would push money or miles below zero or tips above the total.
 */
export function applyAssist(s: AssistState, changes: AssistChange[]): { next: AssistState; lines: string[]; errors: string[] } {
  const next: AssistState = { miles: s.miles, tips: s.tips, total: s.total, plays: s.plays.map((p) => ({ ...p })), expenses: s.expenses.slice() };
  const lines: string[] = [], errors: string[] = [];
  const sgn = (v: number) => (v >= 0 ? '+' : '-');
  for (const ch of changes) {
    const v = Number(ch.value);
    if (!isFinite(v)) { errors.push('One change had no number, so it was skipped.'); continue; }
    if (ch.kind === 'add_miles' || ch.kind === 'set_miles') {
      const to = c2(ch.kind === 'add_miles' ? next.miles + v : v);
      if (to < 0) { errors.push('Miles would go below zero, so that change was skipped.'); continue; }
      lines.push(`Miles ${num(next.miles, 1)} → ${num(to, 1)}${ch.kind === 'add_miles' ? ` (${sgn(v)}${num(Math.abs(v), 1)})` : ''}`);
      next.miles = to;
    } else if (ch.kind === 'add_total' || ch.kind === 'play_total') {
      const before = assistTotal(next);
      if (ch.kind === 'play_total') {
        const idx = Math.round(Number(ch.play)) - 1;
        const p = next.plays[idx];
        if (!p) { errors.push(`There is no play ${ch.play}, so that change was skipped.`); continue; }
        const to = c2(p.total + v);
        if (to < 0) { errors.push(`Play ${idx + 1} would go below zero, so that change was skipped.`); continue; }
        p.total = to;
      } else if (next.plays.length) {
        const p = next.plays[next.plays.length - 1];
        const to = c2(p.total + v);
        if (to < 0) { errors.push('The total would go below zero, so that change was skipped.'); continue; }
        p.total = to;
      } else {
        const to = c2(next.total + v);
        if (to < 0) { errors.push('The total would go below zero, so that change was skipped.'); continue; }
        next.total = to;
      }
      if (ch.tip && ch.kind === 'add_total') next.tips = c2(Math.max(0, next.tips + v));
      const after = assistTotal(next);
      if (next.tips > after + 0.004) next.tips = after;
      lines.push(`Total ${money(before)} → ${money(after)} (${sgn(v)}${money(Math.abs(v))}${ch.kind === 'play_total' ? `, play ${ch.play}` : ''}${ch.tip ? ', tip' : ''})`);
    } else if (ch.kind === 'add_expense') {
      if (v <= 0) { errors.push('An expense had no amount, so it was skipped.'); continue; }
      const cat = EXP_CATS.includes(String(ch.cat)) ? String(ch.cat) : 'Other';
      next.expenses.push({ amt: c2(v), cat, note: String(ch.note || '').slice(0, 120) });
      lines.push(`Expense ${cat} ${money(v)}`);
    }
  }
  next.total = assistTotal(next);
  return { next, lines, errors };
}

/* ---------- schedule problems ---------- */
export function dupIds(es: Entry[]): string[] {
  const seen: Record<string, 1> = {};
  const out: string[] = [];
  plannedBlocks(es).forEach((e) => {
    const k = [normPlat(e.platform), e.date, e.start, e.hours, e.pay, e.station || ''].join('|');
    if (seen[k]) out.push(e.id); else seen[k] = 1;
  });
  return out;
}
export function overlapWith(es: Entry[], id: string | undefined, plat: Platform, when: Date, hrs: number): Block | undefined {
  const en = new Date(when.getTime() + hrs * 3600000);
  return blocksOf(es).find((x) => {
    if (x.id === id || x.status === 'cancelled' || normPlat(x.platform) !== plat || (+x.hours || 0) > 12) return false;
    return when < endOf(x) && startOf(x) < en;
  });
}
export function problems(es: Entry[], now = new Date()): Problems {
  const out: Problems = { future: futureDone(es, now), dups: dupIds(es), odd: [], overlap: [], n: 0 };
  const cutoff = ymd(new Date(Date.now() - 14 * 86400000));
  const byP: Record<string, Block[]> = {};
  blocksOf(es).forEach((e) => {
    if (e.status === 'cancelled') return;
    if ((+e.hours || 0) > 12) { out.odd.push(e); return; }
    if (e.date >= cutoff) (byP[normPlat(e.platform)] = byP[normPlat(e.platform)] || []).push(e);
  });
  Object.keys(byP).forEach((p) => {
    const l = byP[p].sort((a, b) => +startOf(a) - +startOf(b));
    for (let i = 1; i < l.length; i++) {
      if (startOf(l[i]) < endOf(l[i - 1]) && !out.dups.includes(l[i].id)) out.overlap.push(l[i]);
    }
  });
  out.n = out.future.length + out.dups.length + out.odd.length + out.overlap.length;
  return out;
}

/* ---------- drop windows ---------- */
export function hourCounts(list: Drop[]): number[] {
  const c = new Array<number>(24).fill(0);
  list.forEach((d) => { c[new Date(d.ts).getHours()]++; });
  return c;
}
export function topHours(c: number[], n: number) {
  return c.map((v, h) => ({ h, v })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v || a.h - b.h).slice(0, n);
}
export interface Win { a: number; b: number; l: string }
export function nextWindow(wins: Win[], now: Date) {
  let best: { live: boolean; w: Win; s: Date; e: Date } | null = null;
  for (let off = 0; off < 2; off++) {
    for (const w of wins) {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off, Math.floor(w.a), Math.round((w.a % 1) * 60));
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off, Math.floor(w.b), Math.round((w.b % 1) * 60));
      if (now >= s && now < e) return { live: true, w, s, e };
      if (s > now && (!best || s < best.s)) best = { live: false, w, s, e };
    }
  }
  return best;
}

/* ---------- money / year ---------- */
export function yearData(es: Entry[], y: number, now = new Date()) {
  const a = `${y}-01-01`, b = `${y}-12-31`;
  return {
    blocks: doneBlocks(es, now).filter((e) => e.date >= a && e.date <= b),
    ex: expensesOf(es).filter((e) => e.date >= a && e.date <= b),
  };
}
export interface ExpFilter { cat: string; plat: string; period: 'week' | 'month' | 'year' | 'all' | 'custom'; from: string; to: string }
export function periodRange(f: ExpFilter, now = new Date()): [string, string] {
  const y = now.getFullYear(), m = now.getMonth();
  if (f.period === 'week') {
    const s = weekStart(now);
    return [ymd(s), ymd(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6))];
  }
  if (f.period === 'month') return [ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))];
  if (f.period === 'year') return [`${y}-01-01`, `${y}-12-31`];
  if (f.period === 'custom') return [f.from || '0000-01-01', f.to || '9999-12-31'];
  return ['0000-01-01', '9999-12-31'];
}
export function filterExpenses(es: Entry[], f: ExpFilter, now = new Date()): Expense[] {
  const rg = periodRange(f, now);
  return expensesOf(es).filter((e) => {
    if (e.date < rg[0] || e.date > rg[1]) return false;
    if (f.cat !== 'all' && e.cat !== f.cat) return false;
    if (f.plat === 'shared') return expPlat(e) === 'all';
    if (f.plat !== 'all') return expPlat(e) === f.plat;
    return true;
  });
}

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export function buildCsv(es: Entry[], y: number, who: (id: string) => string, override: string, now = new Date()): string {
  const d = yearData(es, y, now);
  const rows: unknown[][] = [['type', 'platform', 'date', 'start', 'hours', 'base_pay', 'tips', 'total', 'miles', 'orders', 'mileage_rate', 'station', 'who', 'category', 'amount', 'note']];
  [...d.blocks].sort((a, b) => ((a.date + a.start) > (b.date + b.start) ? 1 : -1)).forEach((e) => {
    rows.push(['block', normPlat(e.platform), e.date, e.start, e.hours, e.pay, e.tips, c2((+e.pay || 0) + (+e.tips || 0)), e.miles, e.orders || '', rateFor(e.date, override), e.station || '', who(e.who), '', '', e.note || '']);
  });
  [...d.ex].sort((a, b) => (a.date > b.date ? 1 : -1)).forEach((e) => {
    rows.push(['expense', expPlat(e), e.date, '', '', '', '', '', '', '', '', '', who(e.who), e.cat, e.amt, e.note || '']);
  });
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}
