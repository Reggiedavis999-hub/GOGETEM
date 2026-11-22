import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { BlockRow, DropButton, LiveCard, LiveStartCard } from '../../components/blocks';
import { Alert, Bar, Btn, Card, H2, Mut, Row, Screen, Stat, StatRow } from '../../components/ui';
import {
  PLATS, PLAT_NAME, doneBlocks, endOf, expensesOf, money, money0, normPlat, num, problems, sumBlocks, todayStr, upcomingBlocks, VEHICLE_CATS, weekStart, ymd,
} from '../../lib/calc';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

export default function Home() {
  const { me, entries, settings, who } = useStore();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const ws = ymd(weekStart(now)), td = todayStr(), ov = settings.rate;
  const done = doneBlocks(entries, now);
  const wk = sumBlocks(done.filter((e) => e.date >= ws), ov);
  const day = sumBlocks(done.filter((e) => e.date === td), ov);
  const wkP = PLATS.map((p) => ({ n: PLAT_NAME[p], v: sumBlocks(done.filter((e) => e.date >= ws && normPlat(e.platform) === p), ov).gross })).filter((x) => x.v > 0);
  const goal = +settings.goal || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((wk.gross / goal) * 100)) : 0;
  let wkExp = 0;
  expensesOf(entries).forEach((e) => { if (e.date >= ws && !VEHICLE_CATS.includes(e.cat)) wkExp += +e.amt || 0; });
  const profit = Math.max(0, wk.gross - wk.deduct - wkExp);
  const setAside = (profit * (+settings.setAside || 0)) / 100;
  const avg = wk.perHr > 0 ? wk.perHr : sumBlocks(done, ov).perHr;
  const p = problems(entries, now);
  const up = upcomingBlocks(entries, now);
  const nxt = up.filter((e) => endOf(e) > now)[0] || up[0];

  return (
    <Screen>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginTop: 4, marginHorizontal: 2 }}>What it is, {who(me?.id)}.</Text>
      <Mut style={{ marginHorizontal: 2, marginBottom: 12 }}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Mut>
      <LiveCard />
      <DropButton />
      <LiveStartCard />

      <H2>This week</H2>
      <Card>
        <Text style={{ color: C.text, fontSize: 38, fontWeight: '800' }}>{money(wk.gross)}</Text>
        <Mut>Today {money(day.gross)} · {wk.n} block{wk.n === 1 ? '' : 's'} this week{wk.orders > 0 ? ` · ${money(wk.perOrder)}/order` : ''}</Mut>
        {wkP.length > 1 && <Mut>{wkP.map((x) => `${x.n} ${money(x.v)}`).join(' · ')}</Mut>}
        {goal > 0 && (
          <>
            <Bar pct={pct} />
            <Mut style={{ marginTop: 6 }}>
              {pct}% of {money0(goal)}
              {goal - wk.gross > 0 && avg > 0 ? ` · about ${num((goal - wk.gross) / avg)} more hours at ${money(avg)}/hr` : goal - wk.gross <= 0 ? ' · goal hit' : ''}
            </Mut>
          </>
        )}
        <View style={{ marginTop: 12 }}>
          <StatRow>
            <Stat value={num(wk.hours)} label="hours" />
            <Stat value={money(wk.perHr)} label="per hour w/ tips" />
            <Stat value={num(wk.miles, 0)} label="miles" />
          </StatRow>
        </View>
        <Mut style={{ marginTop: 10 }}>
          Mileage write-off <Text style={{ color: C.text, fontWeight: '800' }}>{money(wk.deduct)}</Text> · Set aside <Text style={{ color: C.amber, fontWeight: '800' }}>{money(setAside)}</Text> for taxes
        </Mut>
      </Card>

      {p.n > 0 && (
        <Alert>
          <Row>
            <Text style={{ color: C.amber, fontWeight: '800', flex: 1 }}>{p.n} thing{p.n === 1 ? '' : 's'} need a look</Text>
            <Btn sm label="Open schedule" onPress={() => router.navigate('/schedule')} />
          </Row>
        </Alert>
      )}

      <H2>Next up</H2>
      {nxt ? (
        <>
          <BlockRow e={nxt} now={now} nextId={nxt.id} />
          <Row style={{ marginHorizontal: 2 }}>
            <Mut>{up.length} on your schedule</Mut>
            <Btn sm label="See schedule" onPress={() => router.navigate('/schedule')} />
          </Row>
        </>
      ) : (
        <Card><Text style={{ color: C.mute, textAlign: 'center', paddingVertical: 18 }}>Nothing scheduled.{'\n'}Tap + and choose Upcoming block I grabbed.</Text></Card>
      )}
    </Screen>
  );
}
