import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, ApiError, LoadResp, MeResp, setApiBase, writeCount, writesInFlight } from './api';
import { DEFAULT_SETTINGS, newId } from './calc';
import type { Entry, LiveDash, Platform, Settings, User } from './types';

const CACHE_KEY = 'df_cache_v1';
const LIVE_KEY = 'df_live_v1';
const PLAT_KEY = 'df_lastplat';

export interface AuthInfo { setup: boolean; canJoin: boolean }

interface Store {
  ready: boolean;
  me: User | null;
  entries: Entry[];
  settings: Settings;
  users: Record<string, User>;
  invite: string;
  online: boolean;
  authInfo: AuthInfo;
  bootError: string;
  live: LiveDash | null;
  lastPlat: Platform;
  who: (id?: string) => string;
  refresh: () => Promise<void>;
  boot: () => Promise<void>;
  login: (name: string, password: string) => Promise<void>;
  signup: (name: string, password: string, invite?: string) => Promise<void>;
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
  const [invite, setInvite] = useState('');
  const [online, setOnline] = useState(true);
  const [authInfo, setAuthInfo] = useState<AuthInfo>({ setup: false, canJoin: false });
  const [bootError, setBootError] = useState('');
  const [live, setLiveState] = useState<LiveDash | null>(null);
  const [lastPlat, setLastPlatState] = useState<Platform>('flex');
  const [toast, setToast] = useState('');
  const sig = useRef('');
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meRef = useRef<User | null>(null);
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
    setInvite(j.invite || '');
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ entries: ents, settings: sets, users: j.users || [], me: who, invite: j.invite || '' })).catch(() => {});
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
      if (!j.me) {
        setMe(null);
        setAuthInfo({ setup: !!j.setup, canJoin: !!j.canJoin });
      } else {
        setMe(j.me);
        meRef.current = j.me;
        sig.current = '';
        await refresh();
      }
    } catch (e) {
      const err = e as ApiError;
      const raw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
      const c = raw ? JSON.parse(raw) : null;
      if (err.offline && c && c.me) {
        setOnline(false);
        setMe(c.me);
        meRef.current = c.me;
        setEntries(c.entries || []);
        setSettings({ ...DEFAULT_SETTINGS, ...(c.settings || {}) });
        const us: Record<string, User> = {};
        (c.users || []).forEach((u: User) => { us[u.id] = u; });
        setUsers(us);
        setInvite(c.invite || '');
        flash('Offline. Showing your last saved data.');
      } else {
        setMe(null);
        setBootError(err.message || 'Could not reach the server.');
      }
    }
  }, [refresh, flash]);

  /* first launch */
  useEffect(() => {
    const extra = (Constants.expoConfig?.extra || {}) as { apiBase?: string };
    if (extra.apiBase) setApiBase(extra.apiBase);
    (async () => {
      try {
        const l = await AsyncStorage.getItem(LIVE_KEY);
        if (l) {
          const p = JSON.parse(l) as LiveDash;
          if (p && p.start && Array.isArray(p.deliveries)) setLiveState(p);
        }
        const lp = await AsyncStorage.getItem(PLAT_KEY);
        if (lp === 'flex' || lp === 'doordash' || lp === 'ubereats') setLastPlatState(lp);
      } catch { /* ignore */ }
      await boot();
      setReady(true);
    })();
  }, [boot]);

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
    if (err.auth) { setMe(null); setEntries([]); await boot(); }
    return err.message || "Couldn't save. Try again.";
  }, [boot]);

  const login = useCallback(async (name: string, password: string) => {
    const j = await api<{ me: User }>('login', { name, password });
    setMe(j.me); meRef.current = j.me; sig.current = '';
    await refresh();
    flash('Welcome, ' + j.me.name);
  }, [refresh, flash]);

  const signup = useCallback(async (name: string, password: string, inviteCode?: string) => {
    const body: Record<string, unknown> = { name, password };
    if (inviteCode) body.invite = inviteCode;
    const j = await api<{ me: User }>('signup', body);
    setMe(j.me); meRef.current = j.me; sig.current = '';
    await refresh();
    flash('Welcome, ' + j.me.name);
  }, [refresh, flash]);

  const logout = useCallback(async () => {
    try { await api('logout'); } catch { /* ignore */ }
    setMe(null); setEntries([]); setUsers({}); setInvite(''); sig.current = '';
    await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
    await boot();
  }, [boot]);

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

  const who = useCallback((id?: string) => (id && users[id] ? users[id].name : 'Someone'), [users]);

  const value = useMemo<Store>(() => ({
    ready, me, entries, settings, users, invite, online, authInfo, bootError, live, lastPlat, who,
    refresh, boot, login, signup, logout, saveEntry, removeEntry, removeMany, saveSettings, setLive, setLastPlat, flash, toast,
  }), [ready, me, entries, settings, users, invite, online, authInfo, bootError, live, lastPlat, who,
    refresh, boot, login, signup, logout, saveEntry, removeEntry, removeMany, saveSettings, setLive, setLastPlat, flash, toast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { newId };
