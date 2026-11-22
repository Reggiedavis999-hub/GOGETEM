import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { Btn, Field, Note } from './ui';

export function AuthScreen() {
  const { authInfo, login, signup, bootError, boot } = useStore();
  const [mode, setMode] = useState<'login' | 'join'>('login');
  const m = authInfo.setup ? 'create' : mode;
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!name.trim() || !password) { setErr('Enter your name and password.'); return; }
    if (m !== 'login' && password.length < 8) { setErr('Use at least 8 characters for the password.'); return; }
    if (m === 'join' && !invite.trim()) { setErr('Enter the invite code.'); return; }
    setErr(''); setBusy(true);
    try {
      if (m === 'login') await login(name.trim(), password);
      else await signup(name.trim(), password, m === 'join' ? invite.trim() : undefined);
    } catch (e) { setErr((e as Error).message || 'Could not sign in.'); } finally { setBusy(false); }
  };

  const title = m === 'create' ? 'Create your account' : m === 'join' ? 'Join the household' : 'Welcome back';
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <Text style={{ color: C.gold, fontSize: 26, fontWeight: '800', letterSpacing: 0.5 }}>DASHIN & FLEXIN</Text>
          <Text style={{ color: C.mute, marginBottom: 8, marginTop: 2 }}>{title}</Text>
          <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="username" maxLength={24} />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={m === 'login' ? 'current-password' : 'new-password'} maxLength={200} />
          {m === 'join' && <Field label="Invite code" value={invite} onChangeText={setInvite} autoCapitalize="characters" autoCorrect={false} maxLength={12} />}
          <Text style={{ color: C.red, minHeight: 22, marginTop: 10 }} accessibilityLiveRegion="polite">{err || bootError}</Text>
          <Btn kind="gold" block label={busy ? 'One sec...' : m === 'login' ? 'Sign in' : m === 'join' ? 'Join' : 'Create account'} onPress={submit} disabled={busy} />
          {!authInfo.setup && (
            <View style={{ marginTop: 14, alignItems: 'center', gap: 8 }}>
              {m === 'login'
                ? authInfo.canJoin && <Btn sm label="I have an invite code" onPress={() => { setMode('join'); setErr(''); }} />
                : <Btn sm label="I already have an account" onPress={() => { setMode('login'); setErr(''); }} />}
              {!!bootError && <Btn sm label="Retry connection" onPress={boot} />}
            </View>
          )}
          {authInfo.setup && <Note>The first account sets up the household. Your partner joins next with the invite code from Settings. Use at least 8 characters for the password.</Note>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
