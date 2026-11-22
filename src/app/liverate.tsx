import { router } from 'expo-router';
import React, { useState } from 'react';
import { Actions, Btn, Field, Note, SheetScreen } from '../components/ui';
import { cleanNum, num } from '../lib/calc';
import { useStore } from '../lib/store';

export default function LiveRate() {
  const { live, setLive, flash } = useStore();
  const [rate, setRate] = useState(live?.rate ? String(live.rate) : '');
  if (!live) return <SheetScreen title="Hourly base pay"><Btn label="Close" onPress={() => router.back()} /></SheetScreen>;
  const save = () => {
    const r = cleanNum(rate);
    setLive({ ...live, rate: r > 0 ? r : undefined });
    router.back();
    flash(r > 0 ? `Hourly base set to $${num(r, 2)}/hr` : 'Hourly base cleared');
  };
  return (
    <SheetScreen title="Hourly base pay">
      <Field label="Base $ per hour" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="13.25" />
      <Note>This is the hourly base rate for the dash, like 13.25. It shows next to what you actually earned. Actual pay still goes on each delivery. Leave blank to clear it.</Note>
      <Actions>
        <Btn kind="gold" label="Save base rate" onPress={save} />
        <Btn label="Cancel" onPress={() => router.back()} />
      </Actions>
    </SheetScreen>
  );
}
