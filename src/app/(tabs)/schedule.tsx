import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { DayBlocks, BlockRow, LiveCard } from '../../components/blocks';
import { Actions, Alert, Btn, Card, Empty, Mut, Row, Screen, Seg, useArm } from '../../components/ui';
import {
  PLAT_NAME, doneBlocks, dupIds, endOf, fmtDate, fmtTime, blocksOf, money, normPlat, num, problems, startOf, sumBlocks, todayStr, upcomingBlocks, ymd,
} from '../../lib/calc';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';
import { router } from 'expo-router';

type Tab = 'up' | 'today' | 'past';

export default function Schedule() {
  const { entries, settings, saveEntry, removeMany, flash } = useStore();
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState<Tab>('up');
  const [showCx, setShowCx] = useState(false);
  const [pastN, setPastN] = useState(30);
  const { armed, tap } = useArm(4000);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const td = todayStr();
  const blocks = blocksOf(entries);
  const asc = (a: typeof blocks[0], b: typeof blocks[0]) => +startOf(a) - +startOf(b);
  const up = upcomingBlocks(entries, now);
  const tdl = blocks.filter((e) => e.date === td).sort(asc);
  const past = blocks.filter((e) => e.date < td && e.status !== 'planned').sort((a, b) => +startOf(b) - +startOf(a));
  const cxUp = blocks.filter((e) => e.status === 'cancelled' && e.date > td).sort(asc);
  const nb = up.filter((e) => endOf(e) > now)[0];
  const nextId = nb?.id;
  const p = problems(entries, now);

  const fixFuture = async () => {
    let ok = 0;
    for (const e of p.future) if (await saveEntry({ ...e, status: 'planned' })) ok++;
    if (ok) flash(`${ok} moved to Upcoming`);
  };
  const dedupe = () => tap('dd', async () => {
    const ids = dupIds(entries);
    if (ids.length && (await removeMany(ids))) flash(`Removed ${ids.length} duplicates`);
  });

  const alertCard = p.n > 0 && (
    <Alert>
      <Text style={{ color: C.amber, fontWeight: '800' }}>Needs a look ({p.n})</Text>
      {p.future.length > 0 && (
        <>
          <Text style={{ color: C.text, fontSize: 13, marginTop: 8 }}>
            {p.future.length} play{p.future.length === 1 ? ' is' : 's are'} marked completed but {p.future.length === 1 ? 'has' : 'have'} not happened yet: {p.future.map((e) => `${fmtDate(e.date)} ${fmtTime(e.start)}`).join(', ')}. {p.future.length === 1 ? 'It is' : 'They are'} counting as money earned.
          </Text>
          <Actions><Btn sm kind="gold" label="Move to Upcoming" onPress={fixFuture} /></Actions>
        </>
      )}
      {p.dups.length > 0 && (
        <>
          <Text style={{ color: C.text, fontSize: 13, marginTop: 10 }}>{p.dups.length} duplicate play{p.dups.length === 1 ? '' : 's'}: same platform, date, time and pay listed more than once.</Text>
          <Actions><Btn sm kind="danger" label={armed === 'dd' ? `Tap again to remove ${p.dups.length}` : 'Remove duplicates'} onPress={dedupe} /></Actions>
        </>
      )}
      {p.odd.map((e) => (
        <Row key={'o' + e.id} style={{ marginTop: 10 }}>
          <Text style={{ color: C.text, fontSize: 13, flex: 1 }}>{fmtDate(e.date)} {fmtTime(e.start)} shows <Text style={{ fontWeight: '800' }}>{num(e.hours)}h</Text>. Check the hours.</Text>
          <Btn sm label="Fix" onPress={() => router.push({ pathname: '/block', params: { id: e.id } })} />
        </Row>
      ))}
      {p.overlap.map((e) => (
        <Row key={'v' + e.id} style={{ marginTop: 10 }}>
          <Text style={{ color: C.text, fontSize: 13, flex: 1 }}>{fmtDate(e.date)} {fmtTime(e.start)} overlaps another {PLAT_NAME[normPlat(e.platform)]} play.</Text>
          <Btn sm label="Fix" onPress={() => router.push({ pathname: '/block', params: { id: e.id } })} />
        </Row>
      ))}
    </Alert>
  );

  let body: React.ReactNode;
  if (tab === 'up') {
    const hrs = up.reduce((s, e) => s + (+e.hours || 0), 0);
    const exp = up.reduce((s, e) => s + (+e.pay || 0) + (+e.tips || 0), 0);
    body = (
      <>
        {!up.length ? <Card><Empty>Nothing scheduled.{'\n'}Tap + and choose Upcoming play I grabbed.</Empty></Card> : (
          <>
            <Mut style={{ marginHorizontal: 2 }}>{up.length} play{up.length === 1 ? '' : 's'} · {num(hrs)} hours · {money(exp)} expected</Mut>
            <DayBlocks list={up} now={now} nextId={nextId} />
          </>
        )}
        {cxUp.length > 0 && (
          <View style={{ alignItems: 'flex-start', marginTop: 6, marginBottom: 4 }}>
            <Btn sm label={`${showCx ? 'Hide' : 'Show'} cancelled (${cxUp.length})`} onPress={() => setShowCx((x) => !x)} />
          </View>
        )}
        {showCx && <DayBlocks list={cxUp} now={now} nextId={nextId} />}
        <Card style={{ marginTop: 14 }}>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 6 }}>Stay in good standing</Text>
          {[
            ['Cancel more than 45 minutes before a play starts.', ' Late cancels and no-shows are top reasons for deactivation.'],
            ['Turn on notifications', ' in the Flex app and keep your station radius wide.'],
            ['Check your Rewards level.', ' Level 2 and up unlocks preferred scheduling for chances at exclusive offers.'],
            ['Peak season is Black Friday through Christmas.', ' More plays and more surge. Check often, not just at drop times.'],
            ['Do not use auto-grab bots.', ' Amazon actively detects them and removes accounts.'],
          ].map(([b, r], i) => (
            <Text key={i} style={{ color: C.text, marginVertical: 4, fontSize: 14 }}>• <Text style={{ fontWeight: '800' }}>{b}</Text>{r}</Text>
          ))}
        </Card>
      </>
    );
  } else if (tab === 'today') {
    const dn = tdl.filter((e) => e.status !== 'planned' && e.status !== 'cancelled' && startOf(e) <= now);
    const ex = tdl.filter((e) => e.status === 'planned' || (e.status !== 'cancelled' && startOf(e) > now));
    body = (
      <>
        <Card>
          <Row>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: '700' }}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              <Mut>{dn.length} done · {ex.length} still to go</Mut>
            </View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800' }}>{money(sumBlocks(dn, settings.rate).gross)}</Text>
          </Row>
        </Card>
        {!tdl.length && <Card><Empty>Nothing on today.</Empty></Card>}
        {tdl.map((e) => <BlockRow key={e.id} e={e} now={now} nextId={nextId} />)}
      </>
    );
  } else {
    const rc = sumBlocks(doneBlocks(entries, now).filter((e) => e.date < td && e.date >= ymd(new Date(Date.now() - 30 * 86400000))), settings.rate);
    body = (
      <>
        <Mut style={{ marginHorizontal: 2 }}>Last 30 days: {rc.n} play{rc.n === 1 ? '' : 's'} · {money(rc.gross)}{rc.hours > 0 ? ` · ${money(rc.perHr)}/hr` : ''}</Mut>
        {!past.length && <Card><Empty>No past plays yet.</Empty></Card>}
        <DayBlocks list={past.slice(0, pastN)} now={now} nextId={nextId} />
        {past.length > pastN && <Btn block label={`Show more (${past.length - pastN})`} onPress={() => setPastN((n) => n + 30)} style={{ marginTop: 8 }} />}
      </>
    );
  }

  return (
    <Screen>
      <Seg<Tab> value={tab} onChange={setTab} options={[
        { k: 'up', label: 'Upcoming', count: up.length },
        { k: 'today', label: 'Today', count: tdl.length },
        { k: 'past', label: 'Past', count: past.length },
      ]} />
      <LiveCard />
      {alertCard}
      {body}
    </Screen>
  );
}
