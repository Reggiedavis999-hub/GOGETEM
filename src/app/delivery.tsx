import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Actions, Btn, Field, Note, SheetScreen, Two } from '../components/ui';
import { cleanNum, isPerHr, money, num } from '../lib/calc';
import { useStore } from '../lib/store';

export default function DeliveryForm() {
  const { i } = useLocalSearchParams<{ i?: string }>();
  const { live, setLive, flash } = useStore();
  const idx = i !== undefined && i !== '' ? parseInt(i, 10) : -1;
  const ed = live && idx >= 0 ? live.deliveries[idx] : undefined;
  const [pay, setPay] = useState(ed?.pay ? String(ed.pay) : '');
  const [tip, setTip] = useState(ed?.tip ? String(ed.tip) : '');
  const [mi, setMi] = useState(ed?.mi ? String(ed.mi) : '');
  if (!live) return <SheetScreen title="Delivery"><Btn label="Close" onPress={() => router.back()} /></SheetScreen>;
  const n = ed ? idx + 1 : live.deliveries.length + 1;

  const save = () => {
    if (isPerHr(tip)) { flash('Tip is dollars for this one order, not per hour.'); return; }
    if (isPerHr(pay)) {
      setLive({ ...live, rate: cleanNum(pay) });
      setPay('');
      flash(`Hourly base set to $${num(cleanNum(pay), 2)}/hr. Now enter the actual pay for this order.`);
      return;
    }
    const dp = cleanNum(pay), dt = cleanNum(tip), dm = cleanNum(mi);
    if (dp <= 0 && dt <= 0) { flash('Add the pay or the tip for this delivery.'); return; }
    if (ed) {
      const ds = live.deliveries.slice();
      ds[idx] = { ...ed, pay: dp, tip: dt, mi: dm };
      setLive({ ...live, deliveries: ds });
      flash(`Delivery ${n} updated ${money(dp + dt)}`);
    } else {
      setLive({ ...live, deliveries: [...live.deliveries, { ts: Date.now(), pay: dp, tip: dt, mi: dm }] });
      flash(`Delivery ${n} logged ${money(dp + dt)}`);
    }
    router.back();
  };
  const remove = () => {
    setLive({ ...live, deliveries: live.deliveries.filter((_, k) => k !== idx) });
    router.back();
    flash('Delivery removed');
  };

  return (
    <SheetScreen title={`Delivery #${n}`}>
      <Two>
        <Field label="Pay $ (this order)" value={pay} onChangeText={setPay} autoCapitalize="none" autoCorrect={false} placeholder="0" />
        <Field label="Tip $" value={tip} onChangeText={setTip} autoCapitalize="none" autoCorrect={false} placeholder="0" />
      </Two>
      <Field label="Miles" value={mi} onChangeText={setMi} keyboardType="decimal-pad" placeholder="0" />
      <Note>Actual dollars for this one order. To set your hourly base, type it like 13.25/hr in Pay, or use the Hourly base button. Do not know the tip or miles yet? Save the pay now, then tap Edit on this delivery after you drop off.</Note>
      <Actions>
        <Btn kind="gold" label={ed ? 'Save delivery' : 'Log delivery'} onPress={save} />
        <Btn label="Cancel" onPress={() => router.back()} />
        {ed && <Btn kind="danger" label="Remove" onPress={remove} />}
      </Actions>
    </SheetScreen>
  );
}
