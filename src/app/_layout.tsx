import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen } from '../components/auth';
import { Toast } from '../components/ui';
import { StoreProvider, useStore } from '../lib/store';
import { C } from '../lib/theme';

function Gate() {
  const { ready, me, toast } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.gold} size="large" />
      </View>
    );
  }
  if (!me) {
    return (<><AuthScreen /><Toast msg={toast} /></>);
  }
  const modal = { presentation: 'modal' as const, headerShown: false, contentStyle: { backgroundColor: C.card } };
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add" options={modal} />
        <Stack.Screen name="block" options={modal} />
        <Stack.Screen name="expense" options={modal} />
        <Stack.Screen name="drop" options={modal} />
        <Stack.Screen name="delivery" options={modal} />
        <Stack.Screen name="liverate" options={modal} />
        <Stack.Screen name="settings" options={modal} />
      </Stack>
      <Toast msg={toast} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Gate />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
