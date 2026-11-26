import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  PLAT_NAME, clk, dashStats, dayLabel, dur, endOf, fmtClock, fmtDate, fmtTime, liveDashMs, money, money0, normPlat, num, openPlay, parseLocal, playMs, rateText, startOf,
} from '../lib/calc';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import type { Block } from '../lib/types';
import { Actions, Btn, Card, Mut, Row, Stat, StatRow, Tag, useArm } from './ui';

function clockRange(e: Block): string {
  const s = startOf(e), en = endOf(e);
  const dd = Math.round((new Date(en.getFullYear(), en.getMonth(), en.getDate()).getTime() - new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime()) / 86400000);
  return `${fmtTime(e.start)} – ${fmtClock(en.getHours() + en.getMinutes() / 60)}${dd > 0 ? ` +${dd}d` : ''}`;
}

export function BlockRow({ e, now, nextId }: { e: Block; now: Date; nextId?: string }) {
  const { saveEntry, removeEntry, flash, who } = useStore();
  const [open, setOpen] = useState(false);
  const { armed, tap } = useArm();
  const cx = e.status === 'cancelled', pl = e.status === 'planned', early = !cx && !pl && startOf(e) > now;
  const s = startOf(e), en = endOf(e), g = (+e.pay || 0) + (+e.tips || 0);
  const plat = normPlat(e.platform);

  let border = C.line, line = '', lineColor = C.mute, amt = '';
  let sub2 = '';
  if (cx) { line = 'Cancelled'; amt = '—'; }
  else if (pl || early) {
    if (early) { line = 'Marked completed, not started yet'; lineColor = C.amber; border = C.amberLine; }
    else if (now >= en) { line = 'Finished? Log your results'; lineColor = C.amber; border = C.amberLine; }
    else if (now >= s) { line = 'In progress'; lineColor = C.green; border = C.greenLine; }
    else { line = 'Starts in ' + dur(s.getTime() - now.getTime()); if (e.id === nextId) border = C.goldLine; }
    amt = g > 0 ? money(g) : '—'; sub2 = 'expected';
  } else {
    line = (e.hours > 0 && g > 0 ? money(g / e.hours) + '/hr' + (e.tips > 0 ? ' with tips' : '') : '') + (e.miles > 0 ? ' · ' + num(e.miles, 0) + ' mi' : '');
    amt = money(g);
  }

  const cancel = () => tap('cx', async () => {
    const st = parseLocal(e.date, e.start);
    const late = plat === 'flex' && new Date() > new Date(st.getTime() - 45 * 60000);
    const stamp = new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const cn: Block = { ...e, status: 'cancelled', note: ((e.note ? e.note + ' | ' : '') + 'Cancelled ' + stamp).slice(0, 300) };
    if (await saveEntry(cn)) flash(late ? 'Cancelled. Heads up: this was inside the 45-min free-cancel window.' : 'Play cancelled');
  });

  const dl = new Date(s.getTime() - 45 * 60000);

  return (
    <View style={{ backgroundColor: C.card, borderColor: border, borderWidth: 1, borderRadius: 14, marginBottom: 8, overflow: 'hidden' }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: cx ? C.mute : C.text, fontWeight: '800', fontSize: 16 }}>{clockRange(e)}</Text>
          <Text style={{ color: C.mute, fontSize: 13 }}>{PLAT_NAME[plat]}{e.station ? ' · ' + e.station : ''} · {num(e.hours)}h</Text>
          {!!line && <Text style={{ color: lineColor, fontSize: 13 }}>{line}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: cx ? C.mute : C.text, fontWeight: '800', fontSize: 18 }}>{amt}</Text>
          {!!sub2 && <Text style={{ color: C.mute, fontSize: 11 }}>{sub2}</Text>}
        </View>
      </Pressable>
      {open && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.line }}>
          {pl && plat === 'flex' && now < s && (
            <Text style={{ marginTop: 8, fontSize: 13, color: now < dl ? C.green : C.red }}>
              {now < dl
                ? `Free cancel for ${dur(dl.getTime() - now.getTime())} (until ${fmtClock(dl.getHours() + dl.getMinutes() / 60)})`
                : 'Past the 45-min free-cancel point. Cancelling now counts against you.'}
            </Text>
          )}
          {!pl && !cx && !early && <Mut style={{ marginTop: 8 }}>{rateText(e)} · {num(e.miles, 0)} mi · {who(e.who)}</Mut>}
          {!pl && !cx && !early && !!e.dash && <DashLines e={e} />}
          {!!e.note && <Mut style={{ marginTop: 4 }}>{e.note}</Mut>}
          <Actions>
            {pl && now >= s && <Btn sm kind="gold" label="Log results" onPress={() => router.push({ pathname: '/block', params: { id: e.id, status: 'done' } })} />}
            {(cx || early) && (
              <Btn sm kind="gold" label={cx ? 'Restore' : 'Move to Upcoming'} onPress={async () => { if (await saveEntry({ ...e, status: 'planned' })) flash('Back on your schedule'); }} />
            )}
 {!pl && !cx && !early && plat !== 'flex' && (
              <Btn sm kind="gold" label={e.dash ? 'Edit dash & plays' : 'Add plays'} onPress={() => router.push({ pathname: '/dashedit', params: { id: e.id } })} />
            )}
            <Btn sm label="Edit" onPress={() => router.push({ pathname: '/block', params: { id: e.id } })} />
            {pl && <Btn sm kind="danger" label={armed === 'cx' ? 'Tap again to cancel' : 'Cancel play'} onPress={cancel} />}
            <Btn sm kind="danger" label={armed === 'del' ? 'Tap again to delete' : 'Delete'} onPress={() => tap('del', async () => { if (await removeEntry(e.id)) flash('Deleted'); })} />
          </Actions>
        </View>
      )}
    </View>
  );
}

function DashLines({ e }: { e: Block }) {
  const d = e.dash;
  if (!d) return null;
  const r = dashStats(d.plays, d.end - d.start - (d.pausedMs || 0), +e.miles || 0);
  return (
    <View style={{ marginTop: 6 }}>
      <Mut>Dash {dur(r.dashMs)} · Active {dur(r.activeMs)} · Dead {dur(r.deadMs)}</Mut>
      <Mut>{money(r.perHrDash)}/hr dash time · {money(r.perHrActive)}/hr active{r.perMile > 0 ? ` · ${money(r.perMile)}/mi` : ''}</Mut>
      {r.base > 0 && <Mut>Base rates {money(r.base)} · {money(Math.abs(r.above))} {r.above >= 0 ? 'above' : 'under'} base</Mut>}
      {d.plays.map((p, i) => {
        const ms = playMs(p, 0);
        return (
          <Mut key={p.id}>
            #{i + 1} {money(p.total)}{p.rate > 0 ? ` · ${money(p.rate)}/hr base` : ''} · {p.deliveries} {p.deliveries === 1 ? 'delivery' : 'deliveries'}{ms >= 60000 ? ` · ${dur(ms)} · ${money(p.total / (ms / 3600000))}/hr` : ''}
          </Mut>
        );
      })}
    </View>
  );
}

export function DayBlocks({ list, now, nextId }: { list: Block[]; now: Date; nextId?: string }) {
  const tot: Record<string, number> = {};
  list.forEach((e) => { if (e.status !== 'cancelled') tot[e.date] = (tot[e.date] || 0) + (+e.pay || 0) + (+e.tips || 0); });
  const out: React.ReactNode[] = [];
  let last: string | null = null;
  list.forEach((e) => {
    if (e.date !== last) {
      last = e.date;
      const lb = dayLabel(e.date);
      const rel = lb === 'Today' || lb === 'Tomorrow' || lb === 'Yesterday';
      out.push(
        <View key={'d' + e.date} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16, marginBottom: 8, marginHorizontal: 2 }}>
          <Text style={{ color: lb === 'Today' ? C.gold : C.text, fontWeight: '800', fontSize: 14 }}>{lb}</Text>
          <Text style={{ color: C.mute, fontSize: 12, fontWeight: '800' }}>
            {rel ? fmtDate(e.date) : ''}{rel && tot[e.date] > 0 ? ' · ' : ''}{tot[e.date] > 0 ? money0(tot[e.date]) : ''}
          </Text>
        </View>,
      );
    }
    out.push(<BlockRow key={e.id} e={e} now={now} nextId={nextId} />);
  });
  return <>{out}</>;
}

/* ---------- live dash ---------- */
export function LiveCard() {
  const { live, setLive, flash } = useStore();
  const [, setTick] = useState(0);
  const { armed, tap } = useArm();
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [live]);
  if (!live) return null;
  return <LiveBody key="live" armed={armed} tap={tap} flash={flash} setLive={setLive} />;
}

function LiveBody({ armed, tap, flash, setLive }: { armed: string | null; tap: (k: string, run: () => void) => void; flash: (m: string) => void; setLive: (l: import('../lib/types').LiveDash | null) => void }) {
  useKeepAwake();
  const { live } = useStore();
  if (!live) return null;
  const now = Date.now();
  const r = dashStats(live.plays, liveDashMs(live, now), 0, now);
  const op = openPlay(live), pz = !!live.paused, st = new Date(live.start);
  const pause = () => {
    if (op) { flash('Tap Play complete first, then pause.'); return; }
    const l = { ...live };
    if (l.paused) { l.pausedMs = (l.pausedMs || 0) + (Date.now() - l.paused); l.paused = 0; } else l.paused = Date.now();
    setLive(l);
  };
  const end = () => router.push(op ? { pathname: '/playmade', params: { end: '1' } } : '/enddash');
  return (
    <Card style={{ borderColor: C.greenLine, backgroundColor: C.liveBg }}>
      <Row>
        <Tag gold label={`${pz ? 'PAUSED' : 'LIVE'} · ${PLAT_NAME[live.plat]}`} />
        <Mut>started {fmtClock(st.getHours() + st.getMinutes() / 60)}</Mut>
      </Row>
      <Text style={{ color: C.text, fontSize: 38, fontWeight: '800', marginTop: 8, fontVariant: ['tabular-nums'] }}>{clk(r.dashMs)}</Text>
      <Mut style={{ marginBottom: 8 }}>dash time · active {dur(r.activeMs)} · dead {dur(r.deadMs)}</Mut>
      <StatRow>
        <Stat value={money(r.total)} label="earned" />
        <Stat value={r.perHrDash > 0 ? money(r.perHrDash) : '--'} label="per hour w/ tips" />
        <Stat value={String(r.plays)} label={r.plays === 1 ? 'play' : 'plays'} />
      </StatRow>
      {r.base > 0 && (
        <Text style={{ color: C.text, fontSize: 13, marginTop: 8 }}>Base rates say <Text style={{ fontWeight: '800' }}>{money(r.base)}</Text> so far · Actual <Text style={{ fontWeight: '800' }}>{money(r.total)}</Text></Text>
      )}
      {live.plays.map((p, i) => {
        const ms = playMs(p, now), running = p.end === undefined;
        return (
          <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginTop: i === 0 ? 8 : 0, borderTopWidth: 1, borderTopColor: C.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: running ? C.green : C.text, fontWeight: '700' }}>#{i + 1} · {running ? `in progress ${clk(ms)}` : money(p.total)}</Text>
              <Mut>{p.rate > 0 ? `${money(p.rate)}/hr base · ` : ''}{p.deliveries} {p.deliveries === 1 ? 'delivery' : 'deliveries'}{!running && ms >= 60000 ? ` · ${dur(ms)} · ${money(p.total / (ms / 3600000))}/hr` : ''}</Mut>
            </View>
            <Btn sm label="Edit" onPress={() => router.push({ pathname: '/play', params: { id: p.id } })} />
          </View>
        );
      })}
      <View style={{ marginTop: 10 }}>
        {op
          ? <Btn kind="gold" block label="✔ Play complete" style={{ minHeight: 56 }} onPress={() => router.push('/playmade')} />
          : <Btn kind="gold" block label="▶ Make a play" style={{ minHeight: 56 }} onPress={() => router.push('/play')} />}
      </View>
      <Actions>
        <Btn sm label={pz ? 'Resume' : 'Pause'} onPress={pause} />
        {r.plays > 0 && <Btn sm label="Undo last play" onPress={() => { setLive({ ...live, plays: live.plays.slice(0, -1) }); flash('Last play removed'); }} />}
        <Btn sm kind="gold" label="End dash" onPress={end} />
        <Btn sm kind="danger" label={armed === 'disc' ? 'Tap again to discard' : 'Discard'} onPress={() => tap('disc', () => { setLive(null); flash('Dash discarded'); })} />
      </Actions>
    </Card>
  );
}

export function LiveStartCard() {
  const { live, setLive, flash } = useStore();
  if (live) return null;
  const start = (plat: 'doordash' | 'ubereats') => {
    setLive({ plat, start: Date.now(), paused: 0, pausedMs: 0, plays: [] });
    flash('You are live. Hit Make a play when an order comes in.');
  };
  return (
    <>
      <Text style={{ color: C.mute, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700', marginTop: 20, marginBottom: 8, marginHorizontal: 2 }}>Live dash</Text>
      <Card>
        <Row>
          <View style={{ flex: 1 }}><Btn kind="gold" block label="▶ DoorDash" onPress={() => start('doordash')} /></View>
          <View style={{ flex: 1 }}><Btn kind="gold" block label="▶ Uber Eats" onPress={() => start('ubereats')} /></View>
        </Row>
        <Mut style={{ marginTop: 8 }}>Tap when you go online. The dash clock runs on its own. Hit Make a play when an order comes in and Play complete when you drop it. End dash asks for tips and total miles.</Mut>
      </Card>
    </>
  );
}

export function DropButton() {
  const { me, settings, saveEntry, flash } = useStore();
  const go = async () => {
    const d = { id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: 'drop' as const, ts: Date.now(), who: me?.id || '', station: settings.station || '', got: null, pay: 0 };
    const saved = await saveEntry(d);
    if (saved) { flash('Drop logged'); router.push({ pathname: '/drop', params: { id: d.id } }); }
  };
  return (
    <>
      <Btn hero kind="gold" block label="⚡ Plays just hit it" onPress={go} />
      <Text style={{ color: C.mute, fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 4 }}>One tap logs the time. Add details after if you want.</Text>
    </>
  );
}
