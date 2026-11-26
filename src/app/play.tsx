import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Actions, Btn, Field, Note, SheetScreen, Two, useArm } from '../components/ui';
import { c2, cleanNum, money, newId, openPlay } from '../lib/calc';
import { useStore } from '../lib/store';
import type { Play } from '../lib/types';

/** Play: an order (or a stack) just came in. Starts that play's clock. With ?id= it edits a play already on this dash. */
export default function PlayForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { live, setLive, flash } = useStore();
  const { armed, tap } = useArm();
  const ed = live && id ? live.plays.find((p) => p.id === id) : undefined;
  const closed = !!ed && ed.end !== undefined;
  const [rate, setRate] = useState(ed ? (ed.rate ? String(ed.rate) : '') : live?.rate ? String(live.rate) : '');
  const [dels, setDels] = useState(ed ? String(ed.deliveries) : '1');
  const [total, setTotal] = useState(ed && closed && ed.total ? String(ed.total) : '');
  if (!live) return <SheetScreen title="Play"><Btn label="Close" onPress={() => router.back()} /></SheetScreen>;
  const n = ed ? live.plays.indexOf(ed) + 1 : live.plays.length + 1;

  const save = () => {
    const r = cleanNum(rate);
    const d = Math.round(cleanNum(dels));
    if (d < 1) { flash('Tell me how many plays. Use 1 for a single, 2 for a stack.'); return; }
    if (d > 20) { flash('That is a lot of orders for one play. Check the number.'); return; }
    if (ed) {
      const t = cleanNum(total);
      if (closed && t <= 0) { flash('A finished play needs the total it paid.'); return; }
      const plays = live.plays.map((p): Play => (p.id === ed.id ? { ...p, rate: r, deliveries: d, total: closed ? c2(t) : p.total } : p));
      setLive({ ...live, rate: r > 0 ? r : live.rate, plays });
      router.back();
      flash(`Play ${n} updated`);
      return;
    }
    if (openPlay(live)) { flash('You already have a play running. Tap Play complete first.'); return; }
    const now = Date.now();
    const resumed = live.paused ? { paused: 0, pausedMs: (live.pausedMs || 0) + (now - live.paused) } : {};
    setLive({ ...live, ...resumed, rate: r > 0 ? r : live.rate, plays: [...live.plays, { id: newId(), start: now, rate: r, deliveries: d, total: 0 }] });
    router.back();
    flash(`Play ${n} started${d > 1 ? ` (${d} orders)` : ''}`);
  };
  const remove = () => tap('rm', () => {
    setLive({ ...live, plays: live.plays.filter((p) => p.id !== id) });
    router.back();
    flash('Play removed');
  });

  return (
    <SheetScreen title={`Play ${n}`}>
      <Two>
        <Field label="Base rate $/hr" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="18.75" />
        <Field label="How many plays?" value={dels} onChangeText={setDels} keyboardType="number-pad" placeholder="1" />
      </Two>
      {closed && <Field label="Total $ this play paid" value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="0" hint={cleanNum(total) > 0 ? money(cleanNum(total)) + ' total' : undefined} />}
      <Note>
        {ed
          ? `Fix the rate, the number of orders${closed ? ' or the total' : ''} for this play.`
          : `Base rate is the hourly rate DoorDash shows for this order right now${live.rate ? ` (last one was ${money(live.rate)}/hr)` : ''}. Peak pay or a promo changed it? Type the new rate. It only counts for this play. Orders: 1 for a single, 2 or more for a stack. The play's clock starts when you tap Start play.`}
      </Note>
      <Actions>
        <Btn kind="gold" label={ed ? 'Fuck wit somin' : '▶ Make the play'} onPress={save} />
        <Btn label="Cancel" onPress={() => router.back()} />
        {ed && <Btn kind="danger" label={armed === 'rm' ? 'Tap again to remove' : 'Remove play'} onPress={remove} />}
      </Actions>
    </SheetScreen>
  );
}
