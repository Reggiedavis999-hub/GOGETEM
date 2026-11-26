import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { AssistPanel } from '../components/assist';
import { Actions, Btn, Card, Field, Note, SheetScreen, Two, useArm } from '../components/ui';
import { buildDash, cleanNum, dashFromBlock, dashStats, dur, fmtClock, fmtDate, money, newId, num, PLAT_NAME, normPlat } from '../lib/calc';
import type { AssistState, ExpDraft } from '../lib/calc';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import type { Block, Expense } from '../lib/types';

interface Row { id: string; rate: string; del: string; start: string; end: string; total: string }

const hm = (ms: number) => { const d = new Date(ms); return fmtClock(d.getHours() + d.getMinutes() / 60); };

/** Schedule tab: open any finished dash and edit anything. Everything recalculates as you type. */
export default function DashEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { entries, me, saveEntry, flash } = useStore();
  const { armed, tap } = useArm();
  const b = entries.find((x) => x.id === id && x.type === 'block') as Block | undefined;
  const init = b ? (b.dash || dashFromBlock(b)) : undefined;
  const [startHM, setStartHM] = useState(init ? hm(init.start) : '');
  const [endHM, setEndHM] = useState(init ? hm(init.end) : '');
  const [tips, setTips] = useState(b && b.tips ? String(b.tips) : '');
  const [miles, setMiles] = useState(b && b.miles ? String(b.miles) : '');
  const [note, setNote] = useState(b?.note || '');
  const [rows, setRows] = useState<Row[]>(() => (init ? init.plays.map((p) => ({
    id: p.id, rate: p.rate ? String(p.rate) : '', del: String(p.deliveries), start: hm(p.start), end: hm(p.end ?? init.end), total: p.total ? String(p.total) : '',
  })) : []));
  const [expenses, setExpenses] = useState<ExpDraft[]>([]);
  const [busy, setBusy] = useState(false);

  if (!b || !init) return <SheetScreen title="Dash"><Btn label="Close" onPress={() => router.back()} /></SheetScreen>;

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => {
    const last = rs[rs.length - 1];
    return [...rs, { id: newId(), rate: last ? last.rate : '', del: '1', start: last ? last.end : startHM, end: last ? last.end : startHM, total: '' }];
  });

  const built = buildDash({
    date: b.date, startHM, endHM, pausedMs: init.pausedMs || 0, tips: cleanNum(tips), miles: cleanNum(miles),
    rows: rows.map((r) => ({ id: r.id, rate: cleanNum(r.rate), deliveries: Math.round(cleanNum(r.del)), startHM: r.start, endHM: r.end, total: cleanNum(r.total) })),
  });
  const stats = built.ok ? dashStats(built.dash.plays, built.dash.end - built.dash.start - built.dash.pausedMs, built.fields.miles) : null;

  const state: AssistState = {
    miles: cleanNum(miles), tips: cleanNum(tips), total: 0, expenses,
    plays: rows.map((r) => ({ id: r.id, start: 0, end: 0, rate: cleanNum(r.rate), deliveries: Math.round(cleanNum(r.del)) || 1, total: cleanNum(r.total) })),
  };

  const save = async () => {
    if (busy) return;
    if (!built.ok) { flash(built.error); return; }
    if (!built.dash.plays.length) { flash('Add at least one play, or tap Back to a single play.'); return; }
    setBusy(true);
    const e: Block = { ...b, ...built.fields, platform: normPlat(b.platform), status: 'done', note: note.trim().slice(0, 300), dash: built.dash };
    const saved = await saveEntry(e);
    if (saved) {
      for (const x of expenses) {
        const ex: Expense = { id: newId(), type: 'expense', platform: normPlat(b.platform), date: e.date, amt: x.amt, cat: x.cat, note: x.note, who: me?.id || '' };
        await saveEntry(ex);
      }
      router.back();
      flash(`Dash updated ${money(e.pay + e.tips)}`);
    }
    setBusy(false);
  };
  const plain = async () => {
    const { dash: _drop, ...rest } = b;
    if (await saveEntry(rest as Block)) { router.back(); flash('Back to a single play. The play detail was removed.'); }
  };

  return (
    <SheetScreen title={`${PLAT_NAME[normPlat(b.platform)]} dash · ${fmtDate(b.date)}`}>
      <Two>
        <Field label="Dash start" value={startHM} onChangeText={setStartHM} placeholder="5:41 PM" autoCapitalize="none" autoCorrect={false} />
        <Field label="Dash end" value={endHM} onChangeText={setEndHM} placeholder="8:30 PM" autoCapitalize="none" autoCorrect={false} />
      </Two>
      <Two>
        <Field label="Total miles" value={miles} onChangeText={setMiles} keyboardType="decimal-pad" placeholder="0" />
        <Field label="Tips $ (record only)" value={tips} onChangeText={setTips} keyboardType="decimal-pad" placeholder="0" />
      </Two>

      {rows.map((r, i) => {
        const play = built.ok ? built.dash.plays.find((p) => p.id === r.id) : undefined;
        const ms = play && play.end !== undefined ? play.end - play.start : 0;
        return (
          <Card key={r.id} style={{ marginTop: 12, backgroundColor: C.card2 }}>
            <Text style={{ color: C.text, fontWeight: '800' }}>Play {i + 1}{play && ms >= 60000 && cleanNum(r.total) > 0 ? ` · ${money(cleanNum(r.total) / (ms / 3600000))}/hr` : ''}</Text>
            <Two>
              <Field label="Base rate $/hr" value={r.rate} onChangeText={(t) => set(i, { rate: t })} keyboardType="decimal-pad" placeholder="18.75" />
              <Field label="Deliveries" value={r.del} onChangeText={(t) => set(i, { del: t })} keyboardType="number-pad" placeholder="1" />
            </Two>
            <Two>
              <Field label="Play start" value={r.start} onChangeText={(t) => set(i, { start: t })} autoCapitalize="none" autoCorrect={false} />
              <Field label="Play end" value={r.end} onChangeText={(t) => set(i, { end: t })} autoCapitalize="none" autoCorrect={false} />
            </Two>
            <Field label="Total $ this play paid" value={r.total} onChangeText={(t) => set(i, { total: t })} keyboardType="decimal-pad" placeholder="0" />
            <Actions>
              <Btn sm kind="danger" label={armed === 'rm' + i ? 'Tap again to remove' : 'Remove play'} onPress={() => tap('rm' + i, () => setRows((rs) => rs.filter((_, k) => k !== i)))} />
            </Actions>
          </Card>
        );
      })}
      <View style={{ marginTop: 10 }}><Btn block label="+ Add a play" onPress={add} /></View>

      <Card style={{ marginTop: 14 }}>
        {built.ok && stats ? (
          <View style={{ gap: 3 }}>
            <Text style={{ color: C.text, fontSize: 24, fontWeight: '800' }}>{money(built.fields.pay + built.fields.tips)}</Text>
            <Text style={{ color: C.text, fontSize: 14 }}>Dash <Text style={{ fontWeight: '800' }}>{dur(stats.dashMs)}</Text> · Active <Text style={{ fontWeight: '800' }}>{dur(stats.activeMs)}</Text> · Dead <Text style={{ fontWeight: '800' }}>{dur(stats.deadMs)}</Text></Text>
            <Text style={{ color: C.text, fontSize: 14 }}>{money(stats.perHrDash)}/hr dash time · {money(stats.perHrActive)}/hr active</Text>
            {stats.base > 0 && <Text style={{ color: C.text, fontSize: 14 }}>Base rates {money(stats.base)} · {money(Math.abs(stats.above))} {stats.above >= 0 ? 'above' : 'under'} base</Text>}
            {stats.perMile > 0 && <Text style={{ color: C.text, fontSize: 14 }}>{money(stats.perMile)} per mile · {num(built.fields.miles, 1)} mi · {stats.deliveries} deliveries</Text>}
          </View>
        ) : (
          <Text style={{ color: C.red, fontSize: 14 }}>{built.ok ? '' : built.error}</Text>
        )}
      </Card>

      <Field label="Notes" value={note} onChangeText={setNote} multiline maxLength={300} />
      <AssistPanel
        note={note}
        state={state}
        context={{ platform: normPlat(b.platform), kind: 'finished dash', date: b.date }}
        onApply={(n) => {
          setMiles(n.miles ? String(n.miles) : '');
          setTips(n.tips ? String(n.tips) : '');
          setRows((rs) => rs.map((r, i) => (n.plays[i] ? { ...r, total: n.plays[i].total ? String(n.plays[i].total) : '' } : r)));
          setExpenses(n.expenses);
        }}
      />
      {expenses.length > 0 && <Text style={{ color: C.text, fontSize: 13, marginTop: 10 }}>Expenses that will be added: {expenses.map((x) => `${x.cat} ${money(x.amt)}`).join(', ')}</Text>}
      <Note>Times accept 6am, 6:30 pm or 18:00. The saved dash total is always the sum of the play totals, with tips inside it.</Note>
      <Actions>
        <Btn kind="gold" label={busy ? 'Saving...' : 'Save dash'} onPress={save} disabled={busy} />
        <Btn label="Cancel" onPress={() => router.back()} />
        {!!b.dash && <Btn kind="danger" label={armed === 'plain' ? 'Tap again to confirm' : 'Back to a single play'} onPress={() => tap('plain', plain)} />}
      </Actions>
    </SheetScreen>
  );
}
