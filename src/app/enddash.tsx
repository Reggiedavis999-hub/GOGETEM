import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { AssistPanel } from '../components/assist';
import { Actions, Btn, Card, Field, Note, SheetScreen, Two } from '../components/ui';
import { assistTotal, cleanNum, dashFields, dashStats, dur, liveDashMs, money, newId, num, openPlay, PLAT_NAME } from '../lib/calc';
import type { AssistState, ExpDraft } from '../lib/calc';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import type { Block, DashDetail, Expense, Play } from '../lib/types';

/** End dash: one sheet for tips (record only) and total miles for the whole session, with the results above. */
export default function EndDash() {
  const { live, me, saveEntry, setLive, setLastPlat, flash } = useStore();
  const [at] = useState(() => Date.now());
  const [plays, setPlays] = useState<Play[]>(() => (live ? live.plays : []));
  const [tips, setTips] = useState(live?.tips ? String(live.tips) : '');
  const [miles, setMiles] = useState(live?.miles ? String(live.miles) : '');
  const [note, setNote] = useState('');
  const [expenses, setExpenses] = useState<ExpDraft[]>([]);
  const [busy, setBusy] = useState(false);

  if (!live) return <SheetScreen title="End dash"><Btn label="Close" onPress={() => router.back()} /></SheetScreen>;
  const op = openPlay(live);
  if (op) {
    return (
      <SheetScreen title="End dash">
        <Text style={{ color: C.text, fontSize: 15 }}>You still have a play running. Tap Play complete first so its total is counted.</Text>
        <Actions>
          <Btn kind="gold" label="✔ Play complete, then end dash" onPress={() => { router.back(); setTimeout(() => router.push({ pathname: '/playmade', params: { end: '1' } }), 60); }} />
          <Btn label="Cancel" onPress={() => router.back()} />
        </Actions>
      </SheetScreen>
    );
  }

  const tipN = cleanNum(tips), miN = cleanNum(miles);
  const pausedMs = (live.pausedMs || 0) + (live.paused ? at - live.paused : 0);
  const dash: DashDetail = { start: live.start, end: at, pausedMs, plays };
  const dashMs = liveDashMs({ ...live, plays }, at);
  const r = dashStats(plays, dashMs, miN, at);
  const tipsBad = tipN > r.total + 0.004;
  const state: AssistState = { miles: miN, tips: tipN, total: 0, plays, expenses };

  const save = async () => {
    if (busy) return;
    if (!plays.length) { flash('No plays logged. Tap Cancel and Discard the dash, or add a play first.'); return; }
    if (tipsBad) { flash('Tips are more than the total. The total already includes the tips.'); return; }
    const f = dashFields(dash, tipN, miN);
    setBusy(true);
    const b: Block = {
      id: newId(), type: 'block', platform: live.plat, status: 'done', date: f.date, start: f.start, hours: f.hours,
      pay: f.pay, tips: f.tips, miles: f.miles, orders: f.orders, station: '', note: note.trim().slice(0, 300),
      who: me?.id || '', created: Date.now(), dash,
    };
    const saved = await saveEntry(b);
    if (saved) {
      for (const x of expenses) {
        const ex: Expense = { id: newId(), type: 'expense', platform: live.plat, date: f.date, amt: x.amt, cat: x.cat, note: x.note, who: me?.id || '' };
        await saveEntry(ex);
      }
      setLastPlat(live.plat);
      setLive(null);
      router.back();
      flash(`Dash saved ${money(f.pay + f.tips)}${expenses.length ? ` + ${expenses.length} expense${expenses.length === 1 ? '' : 's'}` : ''}`);
    }
    setBusy(false);
  };

  return (
    <SheetScreen title={`End ${PLAT_NAME[live.plat]} dash`}>
      <Card style={{ backgroundColor: C.card2 }}>
        <Text style={{ color: C.text, fontSize: 30, fontWeight: '800' }}>{money(assistTotal(state))}</Text>
        <Text style={{ color: C.mute, fontSize: 13 }}>{r.done} play{r.done === 1 ? '' : 's'} · {r.deliveries} order{r.deliveries === 1 ? '' : 's'} · tips are inside this total</Text>
        <View style={{ marginTop: 10, gap: 3 }}>
          <Text style={{ color: C.text, fontSize: 14 }}>Dash time <Text style={{ fontWeight: '800' }}>{dur(r.dashMs)}</Text> · Active <Text style={{ fontWeight: '800' }}>{dur(r.activeMs)}</Text> · Dead <Text style={{ fontWeight: '800' }}>{dur(r.deadMs)}</Text></Text>
          <Text style={{ color: C.text, fontSize: 14 }}><Text style={{ fontWeight: '800' }}>{money(r.perHrDash)}/hr</Text> over dash time · <Text style={{ fontWeight: '800' }}>{money(r.perHrActive)}/hr</Text> over active time</Text>
          {r.base > 0 && <Text style={{ color: C.text, fontSize: 14 }}>Base rates say {money(r.base)} · you made <Text style={{ fontWeight: '800', color: r.above >= 0 ? C.green : C.red }}>{money(r.above)}</Text> {r.above >= 0 ? 'above' : 'under'} base</Text>}
          {miN > 0 && <Text style={{ color: C.text, fontSize: 14 }}><Text style={{ fontWeight: '800' }}>{money(r.perMile)}</Text> per mile ({num(r.perMile * 100, 0)}¢) · {num(miN, 1)} mi</Text>}
        </View>
      </Card>
      <Two>
        <Field label="Total miles, whole dash" value={miles} onChangeText={setMiles} keyboardType="decimal-pad" placeholder="0" />
        <Field label="Tips made $ (record only)" value={tips} onChangeText={setTips} keyboardType="decimal-pad" placeholder="0" />
      </Two>
      {tipsBad && <Text style={{ color: C.red, fontSize: 13, marginTop: 10 }}>Tips are more than the total. The total already includes the tips.</Text>}
      <Field label="Notes" value={note} onChangeText={setNote} multiline maxLength={300} placeholder="Anything about this dash" />
      <AssistPanel
        note={note}
        state={state}
        context={{ platform: live.plat, kind: 'live dash', dashMinutes: Math.round(r.dashMs / 60000) }}
        onApply={(n) => { setMiles(n.miles ? String(n.miles) : ''); setTips(n.tips ? String(n.tips) : ''); setPlays(n.plays); setExpenses(n.expenses); }}
      />
      {expenses.length > 0 && (
        <Text style={{ color: C.text, fontSize: 13, marginTop: 10 }}>Expenses that will be added: {expenses.map((x) => `${x.cat} ${money(x.amt)}`).join(', ')}</Text>
      )}
      <Note>Tips here are just a record. The total is what every number above runs off. Miles are for the whole session, not each play.</Note>
      <Actions>
        <Btn kind="gold" label={busy ? 'Fuckin wit it...' : 'Fuck wit somin'} onPress={save} disabled={busy} />
        <Btn label="Cancel" onPress={() => router.back()} />
      </Actions>
      <Text style={{ color: C.mute, fontSize: 12, marginTop: 10 }}>You can open this dash later in the Schedule tab and edit any time, rate, total, tip or mile.</Text>
    </SheetScreen>
  );
}
