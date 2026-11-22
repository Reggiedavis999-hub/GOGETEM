import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Share, Text } from 'react-native';
import { Actions, Btn, Field, H2, Mut, Note, SheetScreen } from '../components/ui';
import { cleanNum } from '../lib/calc';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';

export default function Settings() {
  const { me, settings, users, invite, saveSettings, logout, flash } = useStore();
  const [goal, setGoal] = useState(settings.goal ? String(settings.goal) : '');
  const [setAside, setSetAside] = useState(String(settings.setAside ?? 25));
  const [station, setStation] = useState(settings.station || '');
  const [rate, setRate] = useState(settings.rate || '');
  const ids = Object.keys(users);

  const save = async () => {
    const patch = { goal: cleanNum(goal), setAside: Math.min(60, cleanNum(setAside)), station: station.trim(), rate: rate.trim() === '' ? '' : String(cleanNum(rate)) };
    if (await saveSettings(patch)) { router.back(); flash('Settings saved'); }
  };
  return (
    <SheetScreen title="Settings">
      <Mut>Signed in as <Text style={{ fontWeight: '800', color: C.text }}>{me?.name}</Text></Mut>
      <Field label="Weekly goal $ (0 = off)" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" placeholder="0" />
      <Field label="Tax set-aside % of profit" value={setAside} onChangeText={setSetAside} keyboardType="decimal-pad" />
      <Field label="Default station / area" value={station} onChangeText={setStation} />
      <Field label="Mileage rate override $/mile (blank = IRS rate)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
      <Actions>
        <Btn kind="gold" label="Save" onPress={save} />
        <Btn label="Cancel" onPress={() => router.back()} />
      </Actions>
      <H2>Household</H2>
      <Mut>{ids.map((k) => users[k].name).join(' and ')}</Mut>
      {ids.length < 2 && !!invite && (
        <>
          <Text style={{ color: C.text, marginTop: 10 }}>Invite code: <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: 2 }}>{invite}</Text></Text>
          <Actions><Btn sm label="Share code" onPress={() => Share.share({ message: `Dashin & Flexin invite code: ${invite}` }).catch(() => flash(`Code: ${invite}`))} /></Actions>
          <Note>Your partner opens this app, taps "I have an invite code", and creates their account. Only share the code with them.</Note>
        </>
      )}
      <Actions><Btn kind="danger" label="Sign out" onPress={async () => { router.back(); await logout(); }} /></Actions>
      <Note>Version {Constants.expoConfig?.version ?? '1.0.0'}</Note>
    </SheetScreen>
  );
}
