import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Actions, Btn, Field, Mut, Picker, SheetScreen } from '../components/ui';
import { cleanNum, fmtStamp } from '../lib/calc';
import { useStore } from '../lib/store';
import type { Drop } from '../lib/types';

export default function DropForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { entries, settings, saveEntry, flash } = useStore();
  const e = entries.find((x) => x.id === id && x.type === 'drop') as Drop | undefined;
  const [got, setGot] = useState<'' | 'yes' | 'no'>(e?.got === true ? 'yes' : e?.got === false ? 'no' : '');
  const [station, setStation] = useState(e?.station || settings.station || '');
  const [pay, setPay] = useState(e?.pay ? String(e.pay) : '');
  if (!e) return <SheetScreen title="Drop"><Btn label="Close" onPress={() => router.back()} /></SheetScreen>;
  const save = async () => {
    if (await saveEntry({ ...e, got: got === 'yes' ? true : got === 'no' ? false : null, station: station.trim(), pay: cleanNum(pay) })) { router.back(); flash('Saved'); }
  };
  return (
    <SheetScreen title={`Drop logged ${fmtStamp(e.ts)}`}>
      <Mut>Optional details. Skip if you are busy.</Mut>
      <Picker<'' | 'yes' | 'no'> label="Did you catch one?" value={got} onChange={setGot} options={[{ k: '', label: 'Not sure' }, { k: 'yes', label: 'Yes, caught one' }, { k: 'no', label: 'No, missed it' }]} />
      <Field label="Station / area" value={station} onChangeText={setStation} />
      <Field label="Best offer seen $" value={pay} onChangeText={setPay} keyboardType="decimal-pad" placeholder="0" />
      <Actions>
        <Btn kind="gold" label="Save" onPress={save} />
        <Btn label="Done" onPress={() => router.back()} />
      </Actions>
    </SheetScreen>
  );
}
