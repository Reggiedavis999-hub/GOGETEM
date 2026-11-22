import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, ApiError, hasToken, LoadResp, loadToken, MeResp, setApiBase, setToken, siteOrigin, writeCount, writesInFlight } from './api';
import { DEFAULT_SETTINGS, newId } from './calc';
import { askPermission, ASKED_KEY, NOTIFS_SUPPORTED, REMIND_KEY, syncReminders } from './reminders';
import type { Entry, LiveDash, Platform, Settings, User } from './types';

const CACHE_KEY = 'df_cache_v2';
const OLD_CACHE_KEY = 'df_cache_v1';
const LIVE_KEY = 'df_live_v1';
const PLAT_KEY = 'df_lastplat';

interface Store {
  ready: boolean;
  me: User | null;
  entries: Entry[];
  settings: Settings;
  users: Record<string, User>;
  online: boolean;
  reminders: boolean;
  setReminders: (on: boolean) => Promise<boolean>;
  emailReset: boolean;
  bootError: string;
  live: LiveDash | null;
  lastPlat: Platform;
  who: (id?: string) => string;
  refresh: () => Promise<void>;
  boot: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  /** Creates the account. Returns the recovery code; call completeSignup() once the person has saved it. */
  signup: (name: string, email: string, password: string) => Promise<string>;
  completeSignup: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  /** Returns a fresh recovery code when a recovery code was used to reset, otherwise ''. */
  resetPassword: (email: string, code: string, password: string) => Promise<string>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  saveEntry: (e: Entry) => Promise<Entry | null>;
  removeEntry: (id: string) => Promise<boolean>;
  removeMany: (ids: string[]) => Promise<boolean>;
  saveSettings: (patch: Partial<Settings>) => Promise<boolean>;
  setLive: (l: LiveDash | null) => void;
  setLastPlat: (p: Platform) => void;
  flash: (msg: string) => void;
  toast: string;
}

const Ctx = createContext<Store | null>(null);
export const useStore = (): Store => {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<User | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [online, setOnline] = useState(true);
  const [emailReset, setEmailReset] = useState(false);
  const [reminders, setRemindersState] = useState(true);
  const [permVer, setPermVer] = useState(0);
  const [bootError, setBootError] = useState('');
  const [live, setLiveState] = useState<LiveDash | null>(null);
  const [lastPlat, setLastPlatState] = useState<Platform>('flex');
  const [toast, setToast] = useState('');
  const sig = useRef('');
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meRef = useRef<User | null>(null);
  const pending = useRef<{ me: User; token: string } | null>(null);
  useEffect(() => { meRef.current = me; }, [me]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 3800);
  }, []);

  const apply = useCallback((j: LoadResp, who: User | null) => {
    const ents = j.entries || [];
    const sets = { ...DEFAULT_SETTINGS, ...(j.settings || {}) } as Settings;
    const us: Record<string, User> = {};
    (j.users || []).forEach((u) => { us[u.id] = u; });
    setEntries(ents);
    setSettings(sets);
    setUsers(us);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ entries: ents, settings: sets, users: j.users || [], me: who })).catch(() => {});
  }, []);

  const wipeLocal = useCallback(async () => {
    await setToken('');
    setMe(null); meRef.current = null;
    setEntries([]); setUsers({}); setSettings(DEFAULT_SETTINGS); setLiveState(null);
    sig.current = '';
    await AsyncStorage.multiRemove([CACHE_KEY, OLD_CACHE_KEY, LIVE_KEY]).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const w0 = writeCount();
    const j = await api<LoadResp>('load');
    if (writesInFlight() > 0 || writeCount() !== w0) return; // stale: a save happened while loading
    const s = JSON.stringify([j.entries, j.settings, j.users]);
    if (s === sig.current) { setOnline(true); return; }
    sig.current = s;
    setOnline(true);
    apply(j, meRef.current);
  }, [apply]);

  const boot = useCallback(async () => {
    setBootError('');
    try {
      const j = await api<MeResp>('me');
      setOnline(true);
      setEmailReset(!!j.emailReset);
      if (!j.me) {
        if (hasToken()) await wipeLocal();
        setMe(null);
      } else {
        setMe(j.me);
        meRef.current = j.me;
        sig.current = '';
        await refresh();
      }
    } catch (e) {
      const err = e as ApiError;
      const raw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
      let c: { me?: User; entries?: Entry[]; settings?: Partial<Settings>; users?: User[] } | null = null;
      try { c = raw ? JSON.parse(raw) : null; } catch { c = null; }
      if (err.offline && c && c.me && hasToken()) {
        setOnline(false);
        setMe(c.me);
        meRef.current = c.me;
        setEntries(c.entries || []);
        setSettings({ ...DEFAULT_SETTINGS, ...(c.settings || {}) } as Settings);
        const us: Record<string, User> = {};
        (c.users || []).forEach((u: User) => { us[u.id] = u; });
        setUsers(us);
        flash('Offline. Showing your last saved data.');
      } else {
        setMe(null);
        setBootError(err.message || 'Could not reach the server.');
      }
    }
  }, [refresh, flash, wipeLocal]);

  /* first launch */
  useEffect(() => {
    const extra = (Constants.expoConfig?.extra || {}) as { apiBase?: string };
    setApiBase(siteOrigin(extra.apiBase));
    (async () => {
      try {
        await loadToken();
        AsyncStorage.removeItem(OLD_CACHE_KEY).catch(() => {});
        const l = await AsyncStorage.getItem(LIVE_KEY);
        if (l) {
          const p = JSON.parse(l) as LiveDash;
          if (p && p.start && Array.isArray(p.deliveries)) setLiveState(p);
        }
        const rm = await AsyncStorage.getItem(REMIND_KEY);
        if (rm === 'off') setRemindersState(false);
        const lp = await AsyncStorage.getItem(PLAT_KEY);
        if (lp === 'flex' || lp === 'doordash' || lp === 'ubereats') setLastPlatState(lp);
      } catch { /* ignore */ }
      await boot();
      setReady(true);
    })();
  }, [boot]);

  /* ask for notification permission once, right after the first sign-in */
  useEffect(() => {
    if (!NOTIFS_SUPPORTED || !ready || !me) return;
    (async () => {
      const asked = await AsyncStorage.getItem(ASKED_KEY).catch(() => null);
      if (asked) return;
      await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => {});
      await askPermission();
      setPermVer((v) => v + 1);
    })();
  }, [ready, me]);

  /* keep phone reminders in step with the schedule */
  useEffect(() => {
    if (!ready) return;
    syncReminders(me ? entries : [], !!me && reminders);
  }, [ready, me, entries, reminders, permVer]);

  /* poll every 30s while foregrounded + refresh on resume */
  useEffect(() => {
    if (!me) return;
    const tick = () => { if (!writesInFlight()) refresh().catch(() => setOnline(false)); };
    const t = setInterval(tick, 30000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') tick(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [me, refresh]);

  const wrapAuth = useCallback(async (e: unknown) => {
    const err = e as ApiError;
    if (err.auth) { await wipeLocal(); await boot(); }
    return err.message || "Couldn't save. Try again.";
  }, [boot, wipeLocal]);

  const login = useCallback(async (email: string, password: string) => {
    const j = await api<{ me: User; token: string }>('login', { email, password });
    await setToken(j.token);
    setMe(j.me); meRef.current = j.me; sig.current = '';
    await refresh();
    flash('Welcome, ' + j.me.name);
  }, [refresh, flash]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const j = await api<{ me: User; token: string; recoveryCode: string }>('signup', { name, email, password });
    pending.current = { me: j.me, token: j.token };
    return j.recoveryCode;
  }, []);

  const completeSignup = useCallback(async () => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    await setToken(p.token);
    setMe(p.me); meRef.current = p.me; sig.current = '';
    await refresh().catch(() => {});
    flash('Welcome, ' + p.me.name);
  }, [refresh, flash]);

  const forgotPassword = useCallback(async (email: string) => {
    const j = await api<{ emailed?: boolean }>('forgot', { email });
    return !!j.emailed;
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, password: string) => {
    const j = await api<{ recoveryCode?: string }>('reset', { email, code, password });
    return j.recoveryCode || '';
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    const j = await api<{ token?: string }>('changepw', { current, next });
    if (j.token) await setToken(j.token);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await api('deleteacct', { password });
    await wipeLocal();
    await boot();
  }, [wipeLocal, boot]);

  const logout = useCallback(async () => {
    try { await api('logout'); } catch { /* ignore */ }
    await wipeLocal();
    await boot();
  }, [wipeLocal, boot]);

  const saveEntry = useCallback(async (e: Entry): Promise<Entry | null> => {
    try {
      const j = await api<{ entry?: Entry }>('put', { entry: e });
      const saved = j.entry || e;
      setEntries((prev) => {
        const i = prev.findIndex((x) => x.id === saved.id);
        if (i >= 0) { const n = prev.slice(); n[i] = saved; return n; }
        return [...prev, saved];
      });
      sig.current = '';
      return saved;
    } catch (err) { flash(await wrapAuth(err)); return null; }
  }, [flash, wrapAuth]);

  const removeEntry = useCallback(async (id: string) => {
    try {
      await api('del', { id });
      setEntries((p) => p.filter((x) => x.id !== id));
      sig.current = '';
      return true;
    } catch (err) { flash(await wrapAuth(err)); return false; }
  }, [flash, wrapAuth]);

  const removeMany = useCallback(async (ids: string[]) => {
    try {
      await api('delmany', { ids });
      setEntries((p) => p.filter((x) => !ids.includes(x.id)));
      sig.current = '';
      return true;
    } catch (err) { flash(await wrapAuth(err)); return false; }
  }, [flash, wrapAuth]);

  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    try {
      const j = await api<{ settings?: Partial<Settings> }>('settings', { settings: next });
      setSettings({ ...DEFAULT_SETTINGS, ...(j.settings || next) } as Settings);
      sig.current = '';
      return true;
    } catch (err) { flash(await wrapAuth(err)); return false; }
  }, [settings, flash, wrapAuth]);

  const setLive = useCallback((l: LiveDash | null) => {
    setLiveState(l);
    if (l) AsyncStorage.setItem(LIVE_KEY, JSON.stringify(l)).catch(() => {});
    else AsyncStorage.removeItem(LIVE_KEY).catch(() => {});
  }, []);

  const setLastPlat = useCallback((p: Platform) => {
    setLastPlatState(p);
    AsyncStorage.setItem(PLAT_KEY, p).catch(() => {});
  }, []);

  const setReminders = useCallback(async (on: boolean) => {
    if (on) {
      const ok = await askPermission();
      setPermVer((v) => v + 1);
      if (!ok) return false;
    }
    setRemindersState(on);
    AsyncStorage.setItem(REMIND_KEY, on ? 'on' : 'off').catch(() => {});
    return true;
  }, []);

  const who = useCallback((id?: string) => (id && users[id] ? users[id].name : 'Someone'), [users]);

  const value = useMemo<Store>(() => ({
    ready, me, entries, settings, users, online, reminders, setReminders, emailReset, bootError, live, lastPlat, who,
    refresh, boot, login, signup, completeSignup, forgotPassword, resetPassword, changePassword, deleteAccount, logout,
    saveEntry, removeEntry, removeMany, saveSettings, setLive, setLastPlat, flash, toast,
  }), [ready, me, entries, settings, users, online, reminders, setReminders, emailReset, bootError, live, lastPlat, who,
    refresh, boot, login, signup, completeSignup, forgotPassword, resetPassword, changePassword, deleteAccount, logout,
    saveEntry, removeEntry, removeMany, saveSettings, setLive, setLastPlat, flash, toast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { newId };
