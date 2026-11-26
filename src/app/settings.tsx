import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Switch, Text } from 'react-native';
import { NOTIFS_SUPPORTED } from '../lib/reminders';
import { siteOrigin } from '../lib/api';
import { Actions, Btn, Field, H2, Mut, Note, Row, SheetScreen, useArm } from '../components/ui';
import { cleanNum } from '../lib/calc';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';

export default function Settings() {
  const { me, settings, saveSettings, logout, changePassword, deleteAccount, reminders, setReminders, assistant, flash } = useStore();
  const [goal, setGoal] = useState(settings.goal ? String(settings.goal) : '');
  const [setAside, setSetAside] = useState(String(settings.setAside ?? 25));
  const [station, setStation] = useState(settings.station || '');
  const [rate, setRate] = useState(settings.rate || '');
  const [openPw, setOpenPw] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delErr, setDelErr] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const { armed, tap } = useArm(4000);
  const site = siteOrigin(((Constants.expoConfig?.extra || {}) as { apiBase?: string }).apiBase);

  const save = async () => {
    const patch = { goal: cleanNum(goal), setAside: Math.min(60, cleanNum(setAside)), station: station.trim(), rate: rate.trim() === '' ? '' : String(cleanNum(rate)) };
    if (await saveSettings(patch)) { router.back(); flash('Settings saved'); }
  };
  const toggleReminders = async (v: boolean) => {
    const ok = await setReminders(v);
    if (v && !ok) {
      flash('Notifications are blocked for this app. Turn them on in your phone settings.');
      Linking.openSettings().catch(() => {});
    }
  };

  const savePw = async () => {
    if (pwBusy) return;
    if (!curPw) { setPwErr('Enter your current password.'); return; }
    if (newPw.length < 8) { setPwErr('Use at least 8 characters for the new password.'); return; }
    if (newPw !== newPw2) { setPwErr('The two new passwords do not match.'); return; }
    setPwErr(''); setPwBusy(true);
    try {
      await changePassword(curPw, newPw);
      setOpenPw(false); setCurPw(''); setNewPw(''); setNewPw2('');
      flash('Password changed');
    } catch (e) { setPwErr((e as Error).message || 'Could not change the password.'); } finally { setPwBusy(false); }
  };

  const delAcct = async () => {
    if (delBusy) return;
    if (!delPw) { setDelErr('Enter your password to confirm.'); return; }
    setDelErr(''); setDelBusy(true);
    try {
      router.back();
      await deleteAccount(delPw);
    } catch (e) { setDelErr((e as Error).message || 'Could not delete the account.'); setDelBusy(false); }
  };

  return (
    <SheetScreen title="Settings">
      <Mut>Signed in as <Text style={{ fontWeight: '800', color: C.text }}>{me?.name}</Text></Mut>
      <Field label="Weekly goal $ (0 = off)" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" placeholder="0" />
      <Field label="Tax set-aside % of profit" value={setAside} onChangeText={setSetAside} keyboardType="decimal-pad" />
      <Field label="Default station / area" value={station} onChangeText={setStation} />
      <Field label="Mileage rate override $/mile (blank = IRS rate)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
      <Actions>
        <Btn kind="gold" label="Fuck wit somin" onPress={save} />
        <Btn label="Cancel" onPress={() => router.back()} />
      </Actions>
      <H2>Reminders</H2>
      {NOTIFS_SUPPORTED ? (
        <>
          <Row>
            <Text style={{ color: C.text, fontWeight: '700', flex: 1 }}>Play reminders</Text>
            <Switch value={reminders} onValueChange={toggleReminders} trackColor={{ false: '#3a3a44', true: C.goldLine }} thumbColor={reminders ? C.gold : '#9a978f'} accessibilityLabel="Play reminders" />
          </Row>
          <Note>A heads-up 1 hour before each upcoming play, when it starts, and when it ends so you can log your results.</Note>
        </>
      ) : (
        <Note>Play reminders need the phone app. This web version can't send them, so set your own phone alarm for plays.</Note>
      )}
      <H2>Account</H2>
      <Mut>{me?.email || ''}</Mut>
      {!openPw ? (
        <Actions>
          <Btn sm label="Change password" onPress={() => setOpenPw(true)} />
          <Btn sm label="Sign out" onPress={async () => { router.back(); await logout(); }} />
        </Actions>
      ) : (
        <>
          <Field label="Current password" value={curPw} onChangeText={setCurPw} secureTextEntry autoCapitalize="none" autoComplete="current-password" maxLength={200} />
          <Field label="New password" value={newPw} onChangeText={setNewPw} secureTextEntry autoCapitalize="none" autoComplete="new-password" maxLength={200} hint="At least 8 characters." />
          <Field label="Confirm new password" value={newPw2} onChangeText={setNewPw2} secureTextEntry autoCapitalize="none" autoComplete="new-password" maxLength={200} />
          {!!pwErr && <Text style={{ color: C.red, marginTop: 8 }} accessibilityLiveRegion="polite">{pwErr}</Text>}
          <Actions>
            <Btn kind="gold" label={pwBusy ? 'One sec...' : 'Update password'} onPress={savePw} disabled={pwBusy} />
            <Btn label="Cancel" onPress={() => { setOpenPw(false); setPwErr(''); setCurPw(''); setNewPw(''); setNewPw2(''); }} />
          </Actions>
        </>
      )}
      <H2>Legal</H2>
      <Actions>
        <Btn sm label="Privacy Policy" onPress={() => Linking.openURL(`${site}/privacy.html`).catch(() => {})} />
        <Btn sm label="Terms" onPress={() => Linking.openURL(`${site}/terms.html`).catch(() => {})} />
        {assistant && <Btn sm label="AI assistant notice" onPress={() => Linking.openURL(`${site}/ai.html`).catch(() => {})} />}
      </Actions>
      <H2>Delete account</H2>
      <Mut>This permanently deletes your account and every play, drop and expense in it. It cannot be undone.</Mut>
      <Field label="Password" value={delPw} onChangeText={setDelPw} secureTextEntry autoCapitalize="none" autoComplete="current-password" maxLength={200} />
      {!!delErr && <Text style={{ color: C.red, marginTop: 8 }} accessibilityLiveRegion="polite">{delErr}</Text>}
      <Actions>
        <Btn kind="danger" label={delBusy ? 'Deleting...' : armed === 'del' ? 'Tap again to delete forever' : 'Delete my account'} disabled={delBusy} onPress={() => tap('del', delAcct)} />
      </Actions>
      <Note>Version {Constants.expoConfig?.version ?? '1.0.0'}</Note>
    </SheetScreen>
  );
}
