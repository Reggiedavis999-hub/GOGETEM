import { router, Tabs } from 'expo-router';
import React from 'react';
import { ColorValue, Pressable, Text, View } from 'react-native';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ fontSize: 20, color }}>{glyph}</Text>;

function HeaderRight() {
  const { online } = useStore();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 12 }}>
      <View style={{ borderWidth: 1, borderColor: online ? C.greenLine : C.amberLine, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 }}>
        <Text style={{ color: online ? C.green : C.amber, fontSize: 12, fontWeight: '700' }}>{online ? '● Synced' : 'Offline'}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')}
        style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.text, fontSize: 18 }}>⚙</Text>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        headerTitle: 'DASHIN & FLEXIN',
        headerTitleAlign: 'left',
        headerTitleStyle: { color: C.gold, fontWeight: '800', fontSize: 15, letterSpacing: 0.6 },
        headerRight: () => <HeaderRight />,
        tabBarStyle: { backgroundColor: '#0f0f12', borderTopColor: C.line, height: 66, paddingTop: 4 },
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.mute,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: icon('📅') }} />
      <Tabs.Screen
        name="plus"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Add entry',
          tabBarIcon: () => (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', marginTop: -16 }}>
              <Text style={{ color: C.goldInk, fontSize: 30, fontWeight: '800', marginTop: -2 }}>+</Text>
            </View>
          ),
        }}
        listeners={{ tabPress: (e) => { e.preventDefault(); router.push('/add'); } }}
      />
      <Tabs.Screen name="drops" options={{ title: 'Drops', tabBarIcon: icon('⚡') }} />
      <Tabs.Screen name="money" options={{ title: 'Money', tabBarIcon: icon('💰') }} />
    </Tabs>
  );
}
