import { router } from 'expo-router';
import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { Actions, Btn, Card, Empty, H2, Mut, Note, Picker, Row, Screen, Seg, Tag, TableRow, Field, Two, useArm } from '../../components/ui';
import {
  EXP_CATS, ExpFilter, PLATS, PLAT_NAME, buildCsv, c2, doneBlocks, expPlat, expensesFor, expensesOf, fmtDate, fmtTime, filterExpenses, money, money0,
  normPlat, num, parseLocal, profitOf, rateText, sumBlocks, sumExpenses, todayStr, yearData, ymd, blocksOf,
} from '../../lib/calc';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';
import type { Block, Expense } from '../../lib/types';

type Sub = 'summary' | 'history' | 'expenses' | 'export';

export default function Money() {
  const [sub, setSub] = useState<Sub>('summary');
  const [year, setYear] = useState(new Date().getFullYear());
  return (
    <Screen>
      <Seg<Sub> value={sub} onChange={setSub} options={[
        { k: 'summary', label: 'Summary' }, { k: 'history', label: 'History' }, { k: 'expenses', label: 'Expenses' }, { k: 'export', label: 'Export' },
      ]} />
      {sub === 'summary' && <Summary year={year} setYear={setYear} />}
      {sub === 'history' && <History />}
      {sub === 'expenses' && <Expenses />}
      {sub === 'export' && <Export year={year} setYear={setYear} />}
    </Screen>
  );
}

function YearPick({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  return (
    <Row style={{ marginBottom: 10 }}>
      <Btn sm label="←" onPress={() => setYear(year - 1)} />
      <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>{year}</Text>
      <Btn sm label="→" onPress={() => setYear(year + 1)} />
    </Row>
  );
}

function Summary({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  const { entries, settings } = useStore();
  const [P, setP] = useState<string>('all');
  const ov = settings.rate;
  const d = yearData(entries, year);
  const bl = P === 'all' ? d.blocks : d.blocks.filter((e) => normPlat(e.platform) === P);
  const t = sumBlocks(bl, ov);
  const ex = sumExpenses(expensesFor(d.ex, P));
  const profit = profitOf(t.gross, t.deduct, ex.other);
  const pct = +settings.setAside || 0;
  const setAside = c2(Math.max(0, profit) * pct / 100);
  const sh = sumExpenses(d.ex.filter((e) => expPlat(e) === 'all'));

  const rows: React.ReactNode[] = [];
  for (let m = 1; m <= 12; m++) {
    const pre = `${year}-${String(m).padStart(2, '0')}`;
    const mb = bl.filter((e) => e.date.startsWith(pre));
    if (!mb.length) continue;
    const s = sumBlocks(mb, ov);
    rows.push(<TableRow key={m} cells={[new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'short' }), money0(s.gross), num(s.hours), num(s.miles, 0)]} />);
  }
  const prow = P === 'all'
    ? PLATS.map((p) => ({ p, s: sumBlocks(d.blocks.filter((e) => normPlat(e.platform) === p), ov) })).filter((x) => x.s.n)
    : [];

  return (
    <>
      <YearPick year={year} setYear={setYear} />
      <Seg<string> value={P} onChange={setP} options={[{ k: 'all', label: 'All' }, { k: 'flex', label: 'Flex' }, { k: 'doordash', label: 'DoorDash' }, { k: 'ubereats', label: 'Uber Eats' }]} />
      <Card>
        <Text style={{ color: C.text, fontSize: 38, fontWeight: '800' }}>{money(t.gross)}</Text>
        <Mut>Gross{P === 'all' ? ' from all platforms' : ' from ' + PLAT_NAME[P as 'flex']} · {t.n} block{t.n === 1 ? '' : 's'} · {num(t.hours)} hrs · {money(t.perHr)}/hr with tips</Mut>
        <View style={{ marginTop: 12 }}>
          <TableRow cells={['Pay', money(t.pay)]} />
          <TableRow cells={['Tips', money(t.tips)]} />
          <TableRow cells={['Per hour, base pay only', money(t.hours > 0 ? t.pay / t.hours : 0)]} />
          <TableRow cells={['Per hour, with tips', money(t.perHr)]} />
          {t.orders > 0 && <TableRow cells={['Orders logged', num(t.orders, 0)]} />}
          {t.orders > 0 && <TableRow cells={['Pay per order', money(t.perOrder)]} />}
          <TableRow cells={['Miles driven (logged)', num(t.miles, 0)]} />
          <TableRow cells={['Mileage write-off', '−' + money(t.deduct)]} tone="good" />
          <TableRow cells={['Other expenses (phone, parking, supplies, other)', '−' + money(ex.other)]} tone="good" />
          <TableRow cells={['Estimated profit', money(profit)]} bold />
          <TableRow cells={[`Set aside at ${pct}%`, money(setAside)]} bold tone="warn" />
        </View>
        <Note>Gas, maintenance and car washes you logged ({money(ex.veh)}) are tracked but not subtracted. The standard mileage rate already covers them, so you pick one method, not both.</Note>
        {P === 'all' ? (
          <>
            <Note>Check: {PLATS.map((p) => `${PLAT_NAME[p]} ${money(sumBlocks(d.blocks.filter((e) => normPlat(e.platform) === p), ov).gross)}`).join(' + ')} = {money(t.gross)}.</Note>
            {ex.total > 0 && <Note>Expenses check: {[...PLATS, 'all' as const].map((p) => `${PLAT_NAME[p]} ${money(sumExpenses(d.ex.filter((e) => expPlat(e) === p)).total)}`).join(' + ')} = {money(ex.total)}.</Note>}
          </>
        ) : sh.total > 0 ? <Note>Shared expenses ({money(sh.other)} deductible) are not in this view. Pick All to include them.</Note> : null}
        <Note>Mileage rate used: {parseFloat(ov) > 0 ? `your override of $${ov}/mi` : 'IRS standard rate by date (72.5¢ Jan to Jun 2026, 76¢ from Jul 1, 2026)'}. This is an estimate to help you plan. Confirm your method and numbers with a tax pro. Estimated tax payments for the last quarter are usually due in mid-January.</Note>
      </Card>
      {prow.length > 0 && (
        <>
          <H2>By platform</H2>
          <Card>
            <TableRow head cells={['Platform', 'Gross', '$/hr', '$/order']} />
            {prow.map(({ p, s }) => <TableRow key={p} cells={[PLAT_NAME[p], money0(s.gross), money(s.perHr), s.orders ? money(s.perOrder) : '-']} />)}
          </Card>
        </>
      )}
      <H2>By month</H2>
      <Card>
        {rows.length ? (<><TableRow head cells={['Month', 'Gross', 'Hours', 'Miles']} />{rows}</>) : <Empty>No completed blocks logged for {year}.</Empty>}
      </Card>
    </>
  );
}

function History() {
  const { entries, removeEntry, flash, who } = useStore();
  const [f, setF] = useState<'all' | 'blocks' | 'expenses'>('all');
  const { armed, tap } = useArm();
  const list = entries.filter((e): e is Block | Expense => {
    if (e.type === 'drop') return false;
    if (f === 'blocks') return e.type === 'block';
    if (f === 'expenses') return e.type === 'expense';
    return true;
  }).sort((a, b) => {
    const ka = a.date + (a.type === 'block' ? a.start : ''), kb = b.date + (b.type === 'block' ? b.start : '');
    return kb > ka ? 1 : -1;
  });
  return (
    <>
      <Seg<'all' | 'blocks' | 'expenses'> value={f} onChange={setF} options={[{ k: 'all', label: 'All' }, { k: 'blocks', label: 'Blocks' }, { k: 'expenses', label: 'Expenses' }]} />
      <Card>
        {!list.length && <Empty>Nothing here yet.</Empty>}
        {list.slice(0, 80).map((e) => (
          <View key={e.id} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line }}>
            {e.type === 'block' ? (
              <Row>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text style={{ color: C.text, fontWeight: '700' }}>{fmtDate(e.date)} · {fmtTime(e.start)}</Text>
                    <Tag gold={e.status === 'planned'} label={e.status === 'planned' ? 'Upcoming' : e.status === 'cancelled' ? 'Cancelled' : 'Completed'} />
                    <Tag label={PLAT_NAME[normPlat(e.platform)]} />
                  </View>
                  <Mut>{num(e.hours)}h · {num(e.miles, 0)} mi · {rateText(e)} · {who(e.who)}{e.station ? ' · ' + e.station : ''}</Mut>
                </View>
                <Text style={{ color: e.status === 'cancelled' ? C.mute : C.text, fontWeight: '700' }}>{e.status === 'cancelled' ? 'Cancelled' : money((+e.pay || 0) + (+e.tips || 0))}</Text>
              </Row>
            ) : (
              <Row>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text style={{ color: C.text, fontWeight: '700' }}>{fmtDate(e.date)} · {e.cat}</Text>
                    <Tag label="Expense" /><Tag label={PLAT_NAME[expPlat(e)]} />
                  </View>
                  <Mut>{who(e.who)}{e.note ? ' · ' + e.note : ''}</Mut>
                </View>
                <Text style={{ color: C.red, fontWeight: '700' }}>−{money(e.amt)}</Text>
              </Row>
            )}
            <Actions>
              <Btn sm label="Edit" onPress={() => router.push({ pathname: e.type === 'block' ? '/block' : '/expense', params: { id: e.id } })} />
              <Btn sm kind="danger" label={armed === e.id ? 'Tap again to delete' : 'Delete'} onPress={() => tap(e.id, async () => { if (await removeEntry(e.id)) flash('Deleted'); })} />
            </Actions>
          </View>
        ))}
      </Card>
    </>
  );
}

function Expenses() {
  const { entries, removeEntry, flash, who } = useStore();
  const [f, setF] = useState<ExpFilter>({ cat: 'all', plat: 'all', period: 'month', from: '', to: '' });
  const { armed, tap } = useArm();
  const list = filterExpenses(entries, f).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const s = sumExpenses(list);
  const cats = Object.keys(s.byCat).sort((a, b) => s.byCat[b] - s.byCat[a]);
  const set = (p: Partial<ExpFilter>) => setF((x) => ({ ...x, ...p }));
  return (
    <>
      <Card>
        <Picker label="Category" value={f.cat} onChange={(k) => set({ cat: k })} options={[{ k: 'all', label: 'All' }, ...EXP_CATS.map((c) => ({ k: c, label: c }))]} />
        <Picker label="Platform" value={f.plat} onChange={(k) => set({ plat: k })} options={[{ k: 'all', label: 'All' }, { k: 'flex', label: 'Flex' }, { k: 'doordash', label: 'DoorDash' }, { k: 'ubereats', label: 'Uber Eats' }, { k: 'shared', label: 'Shared' }]} />
        <Picker<ExpFilter['period']> label="Period" value={f.period} onChange={(k) => set(k === 'custom' && !f.from ? { period: k, from: ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), to: todayStr() } : { period: k })}
          options={[{ k: 'week', label: 'This week' }, { k: 'month', label: 'This month' }, { k: 'year', label: 'This year' }, { k: 'all', label: 'All time' }, { k: 'custom', label: 'Custom' }]} />
        {f.period === 'custom' && (
          <Two>
            <Field label="From (YYYY-MM-DD)" value={f.from} onChangeText={(t) => set({ from: t })} autoCapitalize="none" />
            <Field label="To (YYYY-MM-DD)" value={f.to} onChangeText={(t) => set({ to: t })} autoCapitalize="none" />
          </Two>
        )}
      </Card>
      <Card>
        <Text style={{ color: C.text, fontSize: 38, fontWeight: '800' }}>{money(s.total)}</Text>
        <Mut>{s.n} expense{s.n === 1 ? '' : 's'} in this filter</Mut>
        <View style={{ marginTop: 12 }}>
          <TableRow cells={['Subtracted from profit (phone, parking, supplies, other)', money(s.other)]} tone="good" />
          <TableRow cells={['Covered by mileage rate (gas, maintenance, car wash)', money(s.veh)]} tone="mute" />
          <TableRow cells={['Total', money(s.total)]} bold />
        </View>
        <Note>{c2(s.other + s.veh) === s.total ? '✓ ' : ''}Subtracted {money(s.other)} + covered {money(s.veh)} = {money(s.total)}. Gas, maintenance and car washes are tracked but not taken off your profit, because the mileage write-off already covers them.</Note>
      </Card>
      {cats.length > 0 && (
        <>
          <H2>By category</H2>
          <Card>
            <TableRow head cells={['Category', 'Amount', 'Share']} />
            {cats.map((c) => <TableRow key={c} cells={[c, money(s.byCat[c]), (s.total > 0 ? Math.round((s.byCat[c] / s.total) * 100) : 0) + '%']} />)}
            <TableRow bold cells={['Total', money(s.total), '']} />
          </Card>
        </>
      )}
      <View style={{ marginBottom: 12, alignItems: 'flex-start' }}><Btn kind="gold" label="+ Add expense" onPress={() => router.push('/expense')} /></View>
      <Card>
        {!list.length && <Empty>No expenses match this filter.</Empty>}
        {list.slice(0, 100).map((e) => (
          <View key={e.id} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line }}>
            <Row>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{fmtDate(e.date)} · {e.cat}</Text><Tag label={PLAT_NAME[expPlat(e)]} />
                </View>
                <Mut>{who(e.who)}{e.note ? ' · ' + e.note : ''}</Mut>
              </View>
              <Text style={{ color: C.red, fontWeight: '700' }}>−{money(e.amt)}</Text>
            </Row>
            <Actions>
              <Btn sm label="Edit" onPress={() => router.push({ pathname: '/expense', params: { id: e.id } })} />
              <Btn sm kind="danger" label={armed === e.id ? 'Tap again to delete' : 'Delete'} onPress={() => tap(e.id, async () => { if (await removeEntry(e.id)) flash('Deleted'); })} />
            </Actions>
          </View>
        ))}
      </Card>
    </>
  );
}

function Export({ year, setYear }: { year: number; setYear: (y: number) => void }) {
  const { entries, settings, who, flash } = useStore();
  const csv = () => buildCsv(entries, year, who, settings.rate);
  const share = async () => {
    try { await Share.share({ title: `Dashin & Flexin ${year}.csv`, message: csv() }); } catch { flash("Couldn't open the share sheet."); }
  };
  return (
    <Card>
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{year} export</Text>
      <Mut style={{ marginTop: 6 }}>Shares every completed block and expense for the year as CSV. Send it to Sheets, Excel, email or your tax preparer.</Mut>
      <Actions>
        <Btn kind="gold" label="Share CSV" onPress={share} />
        <Btn label="Prev year" onPress={() => setYear(year - 1)} />
        <Btn label="Next year" onPress={() => setYear(year + 1)} />
      </Actions>
    </Card>
  );
}
