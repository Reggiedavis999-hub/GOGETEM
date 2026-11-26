import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Text } from 'react-native';
import { AssistPanel } from '../components/assist';
import { Actions, Btn, Field, Note, Picker, SheetScreen, Two } from '../components/ui';
import {
  PLAT_NAME, c2, cleanNum, splitPay, fmtDate, fmtTime, isPerHr, minT, money, newId, normPlat, num, overlapWith, parseDateInput, parseHours, parseLocal, parsePay,
  parseTimeInput, tmin, todayStr,
} from '../lib/calc';
import type { ExpDraft } from '../lib/calc';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import type { Block, BlockStatus, Expense, Platform } from '../lib/types';

const p1 = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

export default function BlockForm() {
  const params = useLocalSearchParams();
  const { entries, me, settings, lastPlat, setLastPlat, saveEntry, setLive, flash } = useStore();
  const id = p1(params.id);
  const existing = id ? (entries.find((x) => x.id === id && x.type === 'block') as Block | undefined) : undefined;
  const isLive = p1(params.live) === '1';
  const stParam = p1(params.status);

  const initStatus: BlockStatus = (existing?.status ?? (stParam === 'planned' || stParam === 'cancelled' ? stParam : 'done')) as BlockStatus;
  // "Log results" on a planned block passes status=done with an id: respect the param
  const statusInit: BlockStatus = id && stParam === 'done' ? 'done' : initStatus;
  const [status, setStatus] = useState<BlockStatus>(statusInit);
  const [plat, setPlat] = useState<Platform>(existing ? normPlat(existing.platform) : (p1(params.platform) ? normPlat(p1(params.platform)) : lastPlat));
  const [date, setDate] = useState(existing?.date || p1(params.date) || todayStr());
  const [start, setStart] = useState(existing?.start ? fmtTime(existing.start) : p1(params.start) ? fmtTime(p1(params.start)) : '6:00 AM');
  const initHours = existing?.hours ?? (p1(params.hours) ? +p1(params.hours) : 0);
  const [hours, setHours] = useState(initHours ? String(initHours) : '');
  const initEnd = (() => {
    const st = existing?.start || p1(params.start);
    return st && initHours > 0 && initHours < 24 ? fmtTime(minT(tmin(st) + Math.round(initHours * 60))) : '';
  })();
  const [end, setEnd] = useState(initEnd);
  const rawPay = existing ? +existing.pay || 0 : +p1(params.pay) || 0;
  const rawTips = existing ? +existing.tips || 0 : +p1(params.tips) || 0;
  // The money field is your TOTAL. Tips are part of it, never added on top.
  const [pay, setPay] = useState(() => { const v = statusInit === 'done' ? c2(rawPay + rawTips) : rawPay; return v ? String(v) : ''; });
  const [tips, setTips] = useState(rawTips ? String(rawTips) : '');
  const [miles, setMiles] = useState(existing?.miles ? String(existing.miles) : p1(params.miles) && p1(params.miles) !== '0' ? p1(params.miles) : '');
  const [orders, setOrders] = useState(existing?.orders ? String(existing.orders) : p1(params.orders) && p1(params.orders) !== '0' ? p1(params.orders) : '');
  const [station, setStation] = useState(existing ? existing.station : settings.station || '');
  const [note, setNote] = useState(existing?.note || p1(params.note) || '');
  const [busy, setBusy] = useState(false);
  const [expenses, setExpenses] = useState<ExpDraft[]>([]);
  const ack = useRef('');

  const startHM = parseTimeInput(start);
  const hv = parseHours(hours);
  const onHours = (t: string) => {
    setHours(t);
    const h = parseHours(t);
    if (startHM && h > 0 && h < 24) setEnd(fmtTime(minT(tmin(startHM) + h * 60)));
  };
  const onStart = (t: string) => {
    setStart(t);
    const hm = parseTimeInput(t);
    if (hm && hv > 0 && hv < 24) setEnd(fmtTime(minT(tmin(hm) + hv * 60)));
  };
  const onEnd = (t: string) => {
    setEnd(t);
    const eh = parseTimeInput(t);
    if (startHM && eh) {
      let d = tmin(eh) - tmin(startHM);
      if (d <= 0) d += 1440;
      setHours(String(c2(d / 60)));
    }
  };
  const confirmOnce = (key: string, msg: string) => {
    if (ack.current === key) return true;
    ack.current = key;
    flash(msg + ' Tap Save again to keep it.');
    return false;
  };

  const save = async () => {
    if (busy) return;
    const dateS = parseDateInput(date);
    const startS = parseTimeInput(start);
    if (!dateS || !startS) { flash('Add a valid date (like 11/22) and start time (like 6am).'); return; }
    let hrs = hv;
    const endS = parseTimeInput(end);
    if (hrs <= 0 && endS) { let d = tmin(endS) - tmin(startS); if (d <= 0) d += 1440; hrs = c2(d / 60); }
    if (hrs <= 0) { flash('Add an end time, or the play length in hours like 3.5 or 3h30.'); return; }
    if (hrs > 16) { flash(`${num(hrs, 0)} hours is too long. Plays run 1 to 12 hours. Did a time or price land in the Hours box?`); return; }
    if (plat !== 'flex' && status === 'done' && Math.round(cleanNum(orders)) <= 0) { flash('Add the number of orders so pay per order works.'); return; }
    const sp = splitPay(parsePay(pay, hrs), cleanNum(tips), true);
    if (sp.bad) { flash('Your tips are more than your total. The total already includes the tips, so check the two numbers.'); return; }
    let st: BlockStatus = status;
    let moved = false;
    const when = parseLocal(dateS, startS);
    if (st === 'done' && when > new Date()) { st = 'planned'; moved = true; }
    if (hrs > 12 && !confirmOnce('h' + hrs, `${hrs} hours is long for one play.`)) return;
    if (st !== 'cancelled') {
      const ov = overlapWith(entries, existing?.id, plat, when, hrs);
      if (ov && !confirmOnce('o' + ov.id + startS + hrs, `You already have a ${PLAT_NAME[plat]} play that overlaps (${fmtDate(ov.date)} ${fmtTime(ov.start)}).`)) return;
    }
    setLastPlat(plat);
    setBusy(true);
    const e: Block = {
      ...(existing || {}),
      id: existing?.id || newId(), type: 'block', platform: plat, status: st, date: dateS, start: startS, hours: hrs,
      pay: sp.base, tips: sp.tips, miles: cleanNum(miles), orders: Math.round(cleanNum(orders)),
      station: station.trim(), note: note.trim(),
      who: existing?.who || me?.id || '', created: existing?.created || Date.now(),
    };
    if (existing?.dash) {
      const same = c2(existing.hours) === c2(e.hours) && c2(existing.pay) === c2(e.pay) && c2(existing.tips) === c2(e.tips) && c2(existing.miles) === c2(e.miles) && existing.orders === e.orders;
      if (!same) delete e.dash; // numbers were changed by hand, so the play detail no longer matches
    }
    const saved = await saveEntry(e);
    if (saved && expenses.length && st === 'done') {
      for (const x of expenses) {
        const ex: Expense = { id: newId(), type: 'expense', platform: plat, date: dateS, amt: x.amt, cat: x.cat, note: x.note, who: me?.id || '' };
        await saveEntry(ex);
      }
    }
    setBusy(false);
    if (saved) {
      if (isLive) setLive(null);
      router.back();
      flash(moved ? 'That start time is still ahead, so it is on your schedule as Upcoming.' : st === 'planned' ? 'Upcoming play saved' : st === 'cancelled' ? 'Play cancelled' : 'Play logged ' + money(e.pay + e.tips));
    }
  };

  const perHrHint = isPerHr(pay) ? (hv > 0 ? `= ${money(parsePay(pay, hv))} total for ${num(hv, 2)}h` : 'Add the hours to see the total.') : '';
  const showDone = status === 'done';
  const pv = splitPay(parsePay(pay, hv), cleanNum(tips), true);
  const tipsTooBig = pv.bad;
  const baseNum = pv.base;
  const tipNum = pv.tips;
  const totalNum = pv.total;

  return (
    <SheetScreen title={existing ? 'Edit play' : status === 'planned' ? 'Upcoming play' : 'Completed play'}>
      {!!existing?.dash && (
        <>
          <Note>This dash has plays. Change the play details, times, rates and totals in the dash editor. If you change the hours, pay, tips, miles or orders here by hand, the play detail is dropped.</Note>
          <Btn kind="gold" label="Edit dash & plays" onPress={() => router.replace({ pathname: '/dashedit', params: { id: existing.id } })} />
        </>
      )}
      <Picker<BlockStatus> label="Status" value={status} onChange={setStatus} options={[{ k: 'planned', label: 'Upcoming' }, { k: 'done', label: 'Completed' }, { k: 'cancelled', label: 'Cancelled' }]} />
      <Picker<Platform> label="Platform" value={plat} onChange={setPlat} options={[{ k: 'flex', label: 'Amazon Flex' }, { k: 'doordash', label: 'DoorDash' }, { k: 'ubereats', label: 'Uber Eats' }]} />
      <Two>
        <Field label="Date" value={date} onChangeText={setDate} placeholder="11/22 or 2026-11-22" autoCapitalize="none" autoCorrect={false} />
        <Field label="Start time" value={start} onChangeText={onStart} placeholder="6:00 AM" autoCapitalize="none" autoCorrect={false} />
      </Two>
      <Two>
        <Field label="End time" value={end} onChangeText={onEnd} placeholder="9:30 AM" autoCapitalize="none" autoCorrect={false} />
        <Field label="Hours (3.5 or 3h30)" value={hours} onChangeText={onHours} placeholder="3.5" autoCapitalize="none" autoCorrect={false} />
      </Two>
      <Field label={showDone ? 'Total earned $ (tips included)' : 'Expected pay $'} value={pay} onChangeText={setPay} placeholder="84 or 14/hr" autoCapitalize="none" autoCorrect={false} hint={perHrHint} />
      {showDone && (
        <>
          <Two>
            <Field label="Miles" value={miles} onChangeText={setMiles} keyboardType="decimal-pad" placeholder="0" />
            <Field label="Tips $ (part of total)" value={tips} onChangeText={setTips} keyboardType="decimal-pad" placeholder="0" />
          </Two>
          <Field label="Orders / deliveries" value={orders} onChangeText={setOrders} keyboardType="number-pad" placeholder="0" />
          {tipsTooBig && <Text style={{ color: C.red, fontSize: 13, marginTop: 10 }}>Tips are more than the total. The total should include the tips.</Text>}
          {!tipsTooBig && totalNum > 0 && (
            <Text style={{ color: C.text, fontSize: 13, marginTop: 10, lineHeight: 19 }}>
              {money(totalNum)} total = {money(baseNum)} base + {money(tipNum)} tips{hv > 0 ? `\n${money(totalNum / hv)}/hr with tips · ${money(baseNum / hv)}/hr base only` : ''}
            </Text>
          )}
        </>
      )}
      <Field label="Station / zone / area" value={station} onChangeText={setStation} autoCorrect={false} />
      <Field label="Note" value={note} onChangeText={setNote} multiline maxLength={300} />
      {showDone && (
        <AssistPanel
          note={note}
          state={{ miles: cleanNum(miles), tips: tipNum, total: totalNum, plays: [], expenses }}
          context={{ platform: plat, kind: plat === 'flex' ? 'Amazon Flex block' : 'block', date, hours: hv, orders: Math.round(cleanNum(orders)) }}
          onApply={(n) => { setMiles(n.miles ? String(n.miles) : ''); setTips(n.tips ? String(n.tips) : ''); setPay(n.total ? String(n.total) : ''); setExpenses(n.expenses); }}
        />
      )}
      {showDone && expenses.length > 0 && <Text style={{ color: C.text, fontSize: 13, marginTop: 10 }}>Expenses that will be added: {expenses.map((x) => `${x.cat} ${money(x.amt)}`).join(', ')}</Text>}
      <Actions>
        <Btn kind="gold" label={busy ? 'Saving...' : 'Save'} onPress={save} disabled={busy} />
        <Btn label="Cancel" onPress={() => router.back()} />
      </Actions>
      <Text style={{ color: C.mute, fontSize: 12, marginTop: 10 }}>Times accept 6am, 6:30 pm or 18:00. Dates accept 11/22 or 2026-11-22.</Text>
    </SheetScreen>
  );
}
