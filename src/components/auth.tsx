import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ImageBackground, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { Btn, s } from './ui';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const COVER = require('../../assets/cover.jpg');

type Mode = 'signin' | 'signup' | 'forgot' | 'reset' | 'code';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const siteBase = () => {
  const extra = (Constants.expoConfig?.extra || {}) as { apiBase?: string };
  return (extra.apiBase || 'https://dashin-flexin-api.vercel.app').replace(/\/+$/, '');
};

function PwField({
  label, value, onChangeText, show, onToggle, autoComplete, textContentType, hint, onSubmit,
}: {
  label: string; value: string; onChangeText: (t: string) => void; show: boolean; onToggle: () => void;
  autoComplete: 'current-password' | 'new-password'; textContentType: 'password' | 'newPassword'; hint?: string; onSubmit?: () => void;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          maxLength={200}
          accessibilityLabel={label}
          onSubmitEditing={onSubmit}
          returnKeyType={onSubmit ? 'go' : 'next'}
          placeholderTextColor="#6d6a63"
          style={[s.input, { flex: 1, paddingRight: 64 }]}
        />
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
          hitSlop={8}
          style={{ position: 'absolute', right: 0, height: 48, paddingHorizontal: 14, justifyContent: 'center' }}
        >
          <Text style={{ color: C.gold, fontWeight: '700', fontSize: 14 }}>{show ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

function TextField({
  label, value, onChangeText, hint, ...rest
}: { label: string; value: string; onChangeText: (t: string) => void; hint?: string } & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText'>) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#6d6a63"
        style={s.input}
        accessibilityLabel={label}
        {...rest}
      />
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

function LinkBtn({ label, onPress, bold }: { label: string; onPress: () => void; bold?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={label} hitSlop={8} style={{ paddingVertical: 10, paddingHorizontal: 6 }}>
      <Text style={{ color: bold ? C.gold : C.mute, fontWeight: bold ? '800' : '600', fontSize: 15, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

function RecoveryPanel({ code, intro, cta, onDone }: { code: string; intro: string; cta: string; onDone: () => void }) {
  const [shared, setShared] = useState(false);
  const share = async () => {
    try { await Share.share({ message: `Dashin & Flexin recovery code: ${code}` }); setShared(true); } catch { /* cancelled */ }
  };
  return (
    <View>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '800' }}>Save your recovery code</Text>
      <Text style={{ color: C.mute, marginTop: 6, lineHeight: 21 }}>{intro}</Text>
      <View style={{ marginTop: 16, borderWidth: 1, borderColor: C.goldLine, backgroundColor: C.goldDim, borderRadius: 16, paddingVertical: 20, alignItems: 'center' }}>
        <Text selectable style={{ color: C.gold, fontSize: 28, fontWeight: '800', letterSpacing: 2, fontVariant: ['tabular-nums'] }} accessibilityLabel={`Recovery code ${code.split('').join(' ')}`}>
          {code}
        </Text>
      </View>
      <Text style={{ color: C.mute, marginTop: 12, fontSize: 13, lineHeight: 19 }}>
        Screenshot it or send it to your notes. It will not be shown again. Each time you use it, you get a new one.
      </Text>
      <View style={{ marginTop: 16, gap: 10 }}>
        <Btn block label={shared ? 'Shared. Share again' : 'Save / share code'} onPress={share} />
        <Btn kind="gold" block label={cta} onPress={onDone} />
      </View>
    </View>
  );
}

export function AuthScreen() {
  const { login, signup, completeSignup, forgotPassword, resetPassword, emailReset, bootError, boot } = useStore();
  const ins = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState('');
  const [afterCode, setAfterCode] = useState<'signup' | 'reset'>('signup');

  const go = (m: Mode) => { setMode(m); setErr(''); setInfo(''); setPassword(''); setConfirm(''); setShowPw(false); };
  const cleanEmail = () => email.trim().toLowerCase();

  const run = async (fn: () => Promise<void>, fallback: string) => {
    if (busy) return;
    setErr(''); setInfo(''); setBusy(true);
    try { await fn(); } catch (e) { setErr((e as Error).message || fallback); } finally { setBusy(false); }
  };

  const doSignin = () => {
    if (!EMAIL_RE.test(cleanEmail()) || !password) { setErr('Enter your email and password.'); return; }
    return run(() => login(cleanEmail(), password), 'Could not sign in.');
  };

  const doSignup = () => {
    if (name.trim().length < 2) { setErr('Enter your name.'); return; }
    if (!EMAIL_RE.test(cleanEmail())) { setErr('Enter a valid email address.'); return; }
    if (password.length < 8) { setErr('Use at least 8 characters for the password.'); return; }
    if (password !== confirm) { setErr('The two passwords do not match.'); return; }
    return run(async () => {
      const rc = await signup(name.trim(), cleanEmail(), password);
      setRecovery(rc); setAfterCode('signup'); setMode('code');
    }, 'Could not create the account.');
  };

  const doForgot = () => {
    if (!EMAIL_RE.test(cleanEmail())) { setErr('Enter the email you signed up with.'); return; }
    return run(async () => {
      const sent = await forgotPassword(cleanEmail());
      setMode('reset'); setCode(''); setPassword(''); setConfirm('');
      setInfo(sent ? 'If that email has an account, a 6-digit code is on its way. It works for 15 minutes.' : 'Enter your recovery code below.');
    }, 'Could not send the code.');
  };

  const doReset = () => {
    if (!EMAIL_RE.test(cleanEmail())) { setErr('Enter your email.'); return; }
    if (!code.trim()) { setErr('Enter the code.'); return; }
    if (password.length < 8) { setErr('Use at least 8 characters for the new password.'); return; }
    if (password !== confirm) { setErr('The two passwords do not match.'); return; }
    return run(async () => {
      const rc = await resetPassword(cleanEmail(), code.trim(), password);
      if (rc) { setRecovery(rc); setAfterCode('reset'); setMode('code'); }
      else { go('signin'); setInfo('Password updated. Sign in with your new password.'); }
    }, 'Could not reset the password.');
  };

  const finishCode = () => {
    if (afterCode === 'signup') { run(completeSignup, 'Could not finish.'); return; }
    setRecovery(''); go('signin'); setInfo('Password updated. Sign in with your new password.');
  };

  const title = mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Enter your code' : 'Sign in';
  const submit = mode === 'signin' ? doSignin : mode === 'signup' ? doSignup : mode === 'forgot' ? doForgot : doReset;
  const label = busy ? 'One sec...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? (emailReset ? 'Email me a code' : 'Continue') : 'Update password';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ImageBackground source={COVER} resizeMode="cover" style={StyleSheet.absoluteFill} accessible={false} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(11,11,13,0)', 'rgba(11,11,13,0)', 'rgba(11,11,13,0.78)', 'rgba(11,11,13,0.95)', C.bg]}
        locations={[0, 0.3, 0.5, 0.66, 0.82]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ minHeight: height - ins.top, justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: ins.top + 12, paddingBottom: ins.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
            <Text
              accessibilityRole="header"
              style={{ color: C.gold, fontSize: 30, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center', textShadowColor: 'rgba(240,190,47,0.55)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } }}
            >
              DASHIN & FLEXIN
            </Text>
            <Text style={{ color: C.mute, textAlign: 'center', marginTop: 4, marginBottom: 14, letterSpacing: 0.4 }}>Track the blocks. Keep the money.</Text>

            {mode === 'code' ? (
              <RecoveryPanel
                code={recovery}
                intro={afterCode === 'signup'
                  ? 'This is your backup key. If you ever forget your password and cannot get an email, this code gets you back into your account.'
                  : 'You used your recovery code, so here is a new one. The old code no longer works.'}
                cta={afterCode === 'signup' ? (busy ? 'One sec...' : 'I saved it. Let me in') : 'I saved it. Go to sign in'}
                onDone={finishCode}
              />
            ) : (
              <View>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: '800' }}>{title}</Text>

                {mode === 'signup' && (
                  <TextField label="Your name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" textContentType="name" maxLength={40} />
                )}
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  maxLength={160}
                />
                {mode === 'reset' && (
                  <TextField
                    label={emailReset ? 'Code (6 digits from email, or recovery code)' : 'Recovery code'}
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    textContentType="oneTimeCode"
                    maxLength={20}
                    hint="Recovery codes look like ABCD-EFGH-JKLM."
                  />
                )}
                {mode !== 'forgot' && (
                  <PwField
                    label={mode === 'reset' ? 'New password' : 'Password'}
                    value={password}
                    onChangeText={setPassword}
                    show={showPw}
                    onToggle={() => setShowPw((v) => !v)}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    textContentType={mode === 'signin' ? 'password' : 'newPassword'}
                    hint={mode === 'signup' || mode === 'reset' ? 'At least 8 characters.' : undefined}
                    onSubmit={mode === 'signin' ? submit : undefined}
                  />
                )}
                {(mode === 'signup' || mode === 'reset') && (
                  <PwField
                    label="Confirm password"
                    value={confirm}
                    onChangeText={setConfirm}
                    show={showPw}
                    onToggle={() => setShowPw((v) => !v)}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    onSubmit={submit}
                  />
                )}

                {mode === 'forgot' && (
                  <Text style={{ color: C.mute, marginTop: 10, lineHeight: 20 }}>
                    {emailReset
                      ? 'Enter your email and we will send a 6-digit code to reset your password.'
                      : 'Enter your email, then use the recovery code you saved when you made your account.'}
                  </Text>
                )}

                <Text style={{ color: C.red, minHeight: 22, marginTop: 10 }} accessibilityLiveRegion="polite">{err || (mode === 'signin' ? bootError : '')}</Text>
                {!!info && <Text style={{ color: C.green, marginBottom: 8, lineHeight: 20 }} accessibilityLiveRegion="polite">{info}</Text>}

                <Btn kind="gold" block label={label} onPress={() => { submit(); }} disabled={busy} />

                {mode === 'signup' && (
                  <Text style={{ color: C.mute, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
                    By creating an account you agree to the{' '}
                    <Text style={{ color: C.gold, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(`${siteBase()}/terms.html`).catch(() => {})}>Terms</Text>
                    {' '}and{' '}
                    <Text style={{ color: C.gold, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(`${siteBase()}/privacy.html`).catch(() => {})}>Privacy Policy</Text>.
                  </Text>
                )}

                <View style={{ marginTop: 10, alignItems: 'center' }}>
                  {mode === 'signin' && (
                    <>
                      <LinkBtn label="Forgot password?" onPress={() => go('forgot')} />
                      <LinkBtn bold label="New here? Create an account" onPress={() => go('signup')} />
                      {!!bootError && <LinkBtn label="Retry connection" onPress={boot} />}
                    </>
                  )}
                  {mode === 'signup' && <LinkBtn label="I already have an account" onPress={() => go('signin')} />}
                  {mode === 'forgot' && (
                    <>
                      <LinkBtn label="I already have a code" onPress={() => { go('reset'); }} />
                      <LinkBtn label="Back to sign in" onPress={() => go('signin')} />
                    </>
                  )}
                  {mode === 'reset' && (
                    <>
                      {emailReset && <LinkBtn label="Send a new code" onPress={() => go('forgot')} />}
                      <LinkBtn label="Back to sign in" onPress={() => go('signin')} />
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
