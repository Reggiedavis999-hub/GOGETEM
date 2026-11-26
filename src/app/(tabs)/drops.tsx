import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { DropButton } from '../../components/blocks';
import { Actions, Btn, Card, Empty, H2, Mut, Note, Row, Screen, Stat, StatRow, Tag, useArm } from '../../components/ui';
import { GENERAL_WINDOWS, Win, dropsOf, dur, fmtClock, fmtStamp, hourCounts, hourLabel, money, nextWindow, topHours } from '../../lib/calc';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

export default function Drops() {
  const { entries, removeEntry, flash, who } = useStore();
  const [now, setNow] = useState(new Date());
  const { armed, tap } = useArm();
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const list = dropsOf(entries);
  const c = hourCounts(list);
  const mx = Math.max(...c, 1);
  const tops = topHours(c, 3).map((x) => x.h);
  const own = list.length >= 8;
  const wins: Win[] = own ? topHours(c, 3).map((x) => ({ a: x.h, b: x.h + 1, l: `Your pattern (${x.v} drops)` })) : GENERAL_WINDOWS;
  const nw = nextWindow(wins, now);
  const got = list.filter((d) => d.got === true).length;
  const answered = list.filter((d) => d.got === true || d.got === false).length;
  const wd = [0, 0, 0, 0, 0, 0, 0];
  list.forEach((d) => { wd[(new Date(d.ts).getDay() + 6) % 7]++; });
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Screen>
      <DropButton />

      <H2>Next check window</H2>
      <Card>
        {nw && (
          <>
            <Text style={{ fontSize: 28, fontWeight: '800', color: nw.live ? C.green : C.text }}>{nw.live ? 'Open now' : 'In ' + dur(nw.s.getTime() - now.getTime())}</Text>
            <Mut style={{ fontSize: 15 }}>{nw.w.l}: {fmtClock(nw.w.a)} to {fmtClock(nw.w.b)}</Mut>
          </>
        )}
        <View style={{ marginTop: 8 }}>
          {wins.map((w, i) => (
            <Text key={i} style={{ color: C.text, marginVertical: 4 }}>• <Text style={{ fontWeight: '800' }}>{fmtClock(w.a)} to {fmtClock(w.b)}</Text> <Text style={{ color: C.mute }}>{w.l}</Text></Text>
          ))}
        </View>
        <Note>{own ? 'Built from your own logged drops.' : 'These are general driver-reported windows. Amazon does not publish drop times and they vary by station. Log your drops and this switches to your own pattern.'}</Note>
      </Card>

      <H2>Your drop pattern</H2>
      <Card>
        {!own ? (
          <Text style={{ color: C.text }}><Text style={{ fontWeight: '800' }}>{list.length} of 8 drops logged.</Text> Log 8 or more and this shows the hours your station actually drops plays.</Text>
        ) : (
          <Text style={{ color: C.text }}>Your best hours: <Text style={{ color: C.green, fontWeight: '800' }}>{tops.map(hourLabel).join(', ')}</Text></Text>
        )}
        <View
          accessible
          accessibilityLabel={`Drops logged by hour of day. ${list.length ? 'Most at ' + tops.map(hourLabel).join(', ') + '.' : 'None yet.'}`}
          style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 96, marginTop: 10 }}
        >
          {c.map((v, i) => (
            <View key={i} style={{ flex: 1, height: `${Math.max(2, Math.round((v / mx) * 100))}%`, backgroundColor: tops.includes(i) && own ? C.gold : '#4a4220', borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
          {c.map((_, i) => <Text key={i} style={{ flex: 1, fontSize: 9, color: C.mute, textAlign: 'center' }} numberOfLines={1}>{i % 6 === 0 ? hourLabel(i).replace(' ', '') : ''}</Text>)}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
          {names.map((n, i) => <Stat key={n} small value={String(wd[i])} label={n} />)}
        </View>
        <View style={{ marginTop: 12 }}>
          <StatRow>
            <Stat value={String(list.length)} label="drops logged" />
            <Stat value={answered ? Math.round((got / answered) * 100) + '%' : '-'} label="caught (marked)" />
          </StatRow>
        </View>
      </Card>

      <H2>Recent drops</H2>
      <Card>
        {!list.length && <Empty>Nothing yet. Hit the gold button the moment you see plays appear.</Empty>}
        {list.slice(0, 15).map((d) => (
          <View key={d.id} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line }}>
            <Row>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{fmtStamp(d.ts)}</Text>
                  {d.got === true && <Tag gold label="Caught" />}
                  {d.got === false && <Tag label="Missed" />}
                </View>
                <Mut>{who(d.who)}{d.station ? ' · ' + d.station : ''}{d.pay ? ' · ' + money(d.pay) : ''}</Mut>
              </View>
            </Row>
            <Actions>
              <Btn sm label="Details" onPress={() => router.push({ pathname: '/drop', params: { id: d.id } })} />
              <Btn sm kind="danger" label={armed === d.id ? 'Tap again to delete' : 'Delete'} onPress={() => tap(d.id, async () => { if (await removeEntry(d.id)) flash('Deleted'); })} />
            </Actions>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
