import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Actions, Btn, Field, Note, SheetScreen } from '../components/ui';
import { c2, cleanNum, dur, money, num, openPlay, playMs } from '../lib/calc';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';

/** Play made: the drop-off is done. Stops the play's clock and records what that play paid in total. */
export default function PlayMade() {
  const { end } = useLocalSearchParams<{ end?: string }>();
  const { live, setLive, flash } = useStore();
  const [total, setTotal] = useState('');
  const op = live ? openPlay(live) : undefined;
  if (!live || !op) return <SheetScreen title="Play complete"><Text style={{ color: C.mute }}>No play is running.</Text><Btn label="Close" onPress={() => router.back()} /></SheetScreen>;
  const n = live.plays.indexOf(op) + 1;
  const ms = playMs(op, Date.now());
  const t = cleanNum(total);

  const save = () => {
    if (t <= 0) { flash('Enter the total this play paid, tips included.'); return; }
    setLive({ ...live, plays: live.plays.map((p) => (p.id === op.id ? { ...p, end: Date.now(), total: c2(t) } : p)) });
    router.back();
    if (end === '1') setTimeout(() => router.push('/enddash'), 60);
    flash(`Play ${n} made ${money(t)}`);
  };

  return (
    <SheetScreen title={`Play ${n} complete`}>
      <Text style={{ color: C.text, fontSize: 14 }}>
        {dur(ms)} on this play · {op.deliveries} {op.deliveries === 1 ? 'delivery' : 'deliveries'}{op.rate > 0 ? ` · base ${money(op.rate)}/hr = ${money(op.rate * (ms / 3600000))} so far` : ''}
      </Text>
      <Field label="Total $ this play paid (tips included)" value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="0" autoFocus hint={t > 0 && ms >= 60000 ? `${money(t / (ms / 3600000))}/hr on this play` : undefined} />
      <Note>Type what DoorDash shows you earned for this play. You can fix it later from the Schedule tab if the payout changes.{end === '1' ? ' Then you go straight to End dash.' : ''}</Note>
      <Actions>
        <Btn kind="gold" label="✔ Play complete" onPress={save} />
        <Btn label="Cancel" onPress={() => router.back()} />
      </Actions>
      {op.rate <= 0 && <Text style={{ color: C.mute, fontSize: 12, marginTop: 10 }}>No base rate was set on this play, so it adds nothing to the base total. Tap Play {num(n, 0)} in the list to add one.</Text>}
    </SheetScreen>
  );
}
