import { router } from 'expo-router';
import React from 'react';
import { SheetScreen } from '../components/ui';
import { Btn } from '../components/ui';
import { View } from 'react-native';
import { useStore } from '../lib/store';

export default function Add() {
  const { live, setLive, flash } = useStore();
  const go = (pathname: string, params?: Record<string, string>) => { router.back(); setTimeout(() => router.push({ pathname: pathname as '/block', params }), 60); };
  const start = (plat: 'doordash' | 'ubereats') => {
    setLive({ plat, start: Date.now(), paused: 0, pausedMs: 0, plays: [] });
    flash('You are live. Hit Make a play when an order comes in.');
    router.back();
    setTimeout(() => router.navigate('/'), 60);
  };
  return (
    <SheetScreen title="Add">
      <View style={{ gap: 10 }}>
        <Btn kind="gold" block label="Completed play" onPress={() => go('/block', { status: 'done' })} />
        <Btn block label="Upcoming play I grabbed" onPress={() => go('/block', { status: 'planned' })} />
        {!live && <Btn block label="Start live DoorDash dash" onPress={() => start('doordash')} />}
        {!live && <Btn block label="Start live Uber Eats dash" onPress={() => start('ubereats')} />}
        <Btn block label="Expense (gas, parking, phone...)" onPress={() => go('/expense')} />
        <Btn block label="Cancel" onPress={() => router.back()} />
      </View>
    </SheetScreen>
  );
}
