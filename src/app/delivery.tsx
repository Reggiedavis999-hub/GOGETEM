import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Actions, Btn, Field, Note, SheetScreen, Two } from '../components/ui';
import { c2, cleanNum, isPerHr, money, num, splitPay } from '../lib/calc';
import { C } from '../lib/theme';
import { useStore } from '../lib/store';

export default function DeliveryForm() {
  const { i } = useLocalSearchParams<{ i?: string }>();
  const { live, setLive, flash } = useStore();
  const idx = i !== undefined && i !== '' ? parseInt(i, 10) : -1;
  const ed = live && idx >= 0 ? live.deliveries[idx] : undefined;
  const [pay, setPay] = useState(ed && (ed.pay || ed.tip) ? String(c2((ed.pay || 0) + (ed.tip || 0))) : '');
  const [tip, setTip] = useState(ed?.tip ? String(ed.tip) : '');
  const [mi, setMi] = useState(ed?.mi ? String(ed.mi) : '');
  if (!live) return <SheetScreen title="Delivery"><Btn label="Close" onPress={() => router.back()} /></SheetScreen>;
  const n = ed ? idx + 1 : live.deliveries.length + 1;
  const sp0 = splitPay(cleanNum(pay), cleanNum(tip), true);

  const save = () => {
    if (isPerHr(tip)) { flash('Tip is dollars for this one order, not per hour.'); return; }
    if (isPerHr(pay)) {
      setLive({ ...live, rate: cleanNum(pay) });
      setPay('');
      flash(`Hourly base set to $${num(cleanNum(pay), 2)}/hr. Now enter the actual pay for this order.`);
      return;
    }
    const total = cleanNum(pay), dm = cleanNum(mi);
    if (total <= 0) { flash('Add the total you got for this delivery.'); return; }
    const sp = splitPay(total, cleanNum(tip), true);
    if (sp.bad) { flash('The tip is more than the total. The total already includes the tip.'); return; }
    const dp = sp.base, dt = sp.tips;
    if (ed) {
      const ds = live.deliveries.slice();
      ds[idx] = { ...ed, pay: dp, tip: dt, mi: dm };
      setLive({ ...live, deliveries: ds });
      flash(`Delivery ${n} updated ${money(total)}`);
    } else {
      setLive({ ...live, deliveries: [...live.deliveries, { ts: Date.now(), pay: dp, tip: dt, mi: dm }] });
      flash(`Delivery ${n} logged ${money(total)}`);
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
        <Field label="Total $ (tip included)" value={pay} onChangeText={setPay} autoCapitalize="none" autoCorrect={false} placeholder="0" />
        <Field label="Tip $ (part of total)" value={tip} onChangeText={setTip} autoCapitalize="none" autoCorrect={false} placeholder="0" />
      </Two>
      {cleanNum(pay) > 0 && !isPerHr(pay) && (
        <Text style={{ color: sp0.bad ? C.red : C.text, fontSize: 13, marginTop: 10 }}>
          {sp0.bad ? 'The tip is more than the total.' : `${money(sp0.total)} total = ${money(sp0.base)} base + ${money(sp0.tips)} tip`}
        </Text>
      )}
      <Field label="Miles" value={mi} onChangeText={setMi} keyboardType="decimal-pad" placeholder="0" />
      <Note>Type the total the app shows for this one order. If it includes a tip, put the tip in the second box. It is counted once, inside the total. To set your hourly base, type it like 13.25/hr in the first box, or use the Hourly base button. Do not know the tip or miles yet? Save the total now, then tap Edit after you drop off.</Note>
      <Actions>
        <Btn kind="gold" label={ed ? 'Save delivery' : 'Log delivery'} onPress={save} />
        <Btn label="Cancel" onPress={() => router.back()} />
        {ed && <Btn kind="danger" label="Remove" onPress={remove} />}
      </Actions>
    </SheetScreen>
  );
}
