import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../lib/theme';

/* ---------- keyboard ---------- */
type Measurable = { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void };
const RevealCtx = createContext<() => void>(() => {});
/** Call from a field's onFocus so the field scrolls above the keyboard. */
export const useReveal = () => useContext(RevealCtx);

/**
 * ScrollView that keeps the field you are typing in visible above the keyboard.
 * Android draws edge to edge and does not resize for the keyboard, so we pad the bottom by the keyboard height
 * and scroll the focused field into view. iPhone keeps its native insets handling.
 */
/** The instance type behind <ScrollView ref>, which React Native 0.88 does not export by name. */
type ScrollInstance = React.ComponentProps<typeof ScrollView> extends { ref?: React.Ref<infer I> } ? I : never;

export function KeyboardScroll({
  children, contentContainerStyle, showsVerticalScrollIndicator,
}: { children: React.ReactNode; contentContainerStyle?: StyleProp<ViewStyle>; showsVerticalScrollIndicator?: boolean }) {
  const ref = useRef<ScrollInstance>(null);
  const offset = useRef(0);
  const kbH = useRef(0);
  const kbTop = useRef(0);
  const [pad, setPad] = useState(0);
  const android = Platform.OS === 'android';

  const reveal = useCallback(() => {
    if (!android) return;
    const run = () => {
      if (!kbH.current) return;
      const input = (TextInput as unknown as { State?: { currentlyFocusedInput?: () => unknown } }).State?.currentlyFocusedInput?.() as Measurable | null | undefined;
      if (!input || !input.measureInWindow) return;
      input.measureInWindow((_x, y, _w, h) => {
        const top = kbTop.current || Dimensions.get('window').height - kbH.current;
        const over = y + h + 32 - top;
        if (over > 0) ref.current?.scrollTo({ y: offset.current + over, animated: true });
      });
    };
    setTimeout(run, 120);
    setTimeout(run, 320);
  }, [android]);

  useEffect(() => {
    if (!android) return;
    const a = Keyboard.addListener('keyboardDidShow', (e) => {
      kbH.current = e.endCoordinates.height;
      kbTop.current = e.endCoordinates.screenY || 0;
      setPad(kbH.current);
      reveal();
    });
    const b = Keyboard.addListener('keyboardDidHide', () => { kbH.current = 0; kbTop.current = 0; setPad(0); });
    return () => { a.remove(); b.remove(); };
  }, [android, reveal]);

  const flat = StyleSheet.flatten(contentContainerStyle) || {};
  const base = typeof flat.paddingBottom === 'number' ? flat.paddingBottom : 0;
  return (
    <RevealCtx.Provider value={reveal}>
      <ScrollView
        ref={ref}
        onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={[flat, { paddingBottom: base + pad }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      >
        {children}
      </ScrollView>
    </RevealCtx.Provider>
  );
}

/* ---------- layout ---------- */
export function Screen({ children, pad = 14, bottom = 24 }: { children: React.ReactNode; pad?: number; bottom?: number }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <KeyboardScroll contentContainerStyle={{ padding: pad, paddingBottom: bottom, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        {children}
      </KeyboardScroll>
    </KeyboardAvoidingView>
  );
}

export function SheetScreen({ title, children }: { title: string; children: React.ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.card }}>
      <Screen bottom={ins.bottom + 28}>
        <Text style={[s.h3, { marginBottom: 12 }]}>{title}</Text>
        {children}
      </Screen>
    </View>
  );
}

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);
export const H2 = ({ children }: { children: React.ReactNode }) => <Text style={s.h2}>{children}</Text>;
export const Mut = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <Text style={[s.mut, style]}>{children}</Text>
);
export const Note = ({ children, center }: { children: React.ReactNode; center?: boolean }) => (
  <Text style={[s.note, center && { textAlign: 'center' }]}>{children}</Text>
);
export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, style]}>{children}</View>
);
export const Actions = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{children}</View>
);
export const Big = ({ children, size = 38, color }: { children: React.ReactNode; size?: number; color?: string }) => (
  <Text style={{ color: color || C.text, fontSize: size, fontWeight: '800', lineHeight: size * 1.12 }}>{children}</Text>
);
export const Empty = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ color: C.mute, textAlign: 'center', paddingVertical: 18 }}>{children}</Text>
);

/* ---------- controls ---------- */
type BtnKind = 'gold' | 'danger' | 'plain';
export function Btn({
  label, onPress, kind = 'plain', sm, block, disabled, style, hero,
}: {
  label: string; onPress: () => void; kind?: BtnKind; sm?: boolean; block?: boolean; disabled?: boolean; style?: ViewStyle; hero?: boolean;
}) {
  const bg = kind === 'gold' ? C.gold : C.card2;
  const bd = kind === 'gold' ? C.gold : kind === 'danger' ? C.redLine : C.line;
  const fg = kind === 'gold' ? C.goldInk : kind === 'danger' ? C.red : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, borderColor: bd, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        sm && { minHeight: 40, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
        hero && { minHeight: 64, borderRadius: 18 },
        block && { alignSelf: 'stretch' },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: hero ? 20 : sm ? 14 : 16, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function Seg<T extends string>({
  options, value, onChange,
}: { options: { k: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
  return (
    <View style={s.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.k === value;
        return (
          <Pressable
            key={o.k}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.k)}
            style={[s.segBtn, on && { backgroundColor: C.gold }]}
          >
            <Text style={{ color: on ? C.goldInk : C.mute, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{o.label}</Text>
            {!!o.count && (
              <View style={[s.cnt, on && { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
                <Text style={{ color: on ? C.goldInk : C.text, fontSize: 12 }}>{o.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stat({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <View style={[s.stat, { flex: 1 }]}>
      <Text style={{ color: C.text, fontSize: small ? 16 : 20, fontWeight: '800' }} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={{ color: C.mute, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
export const StatRow = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>
);

export function Tag({ label, gold }: { label: string; gold?: boolean }) {
  return (
    <View style={[s.tag, gold && { backgroundColor: C.goldDim }]}>
      <Text style={{ color: gold ? C.gold : C.mute, fontSize: 11, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

export function Bar({ pct }: { pct: number }) {
  return (
    <View style={s.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: C.gold, borderRadius: 99 }} />
    </View>
  );
}

export function Field({
  label, value, onChangeText, hint, ...rest
}: { label: string; value: string; onChangeText: (t: string) => void; hint?: string } & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  const reveal = useReveal();
  return (
    <View style={{ marginTop: 12, flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#6d6a63"
        style={[s.input, rest.multiline && { minHeight: 76, textAlignVertical: 'top' }]}
        accessibilityLabel={label}
        {...rest}
        onFocus={(e) => { rest.onFocus?.(e); reveal(); }}
      />
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}
export const Two = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>
);

export function Picker<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { k: T; label: string }[]; onChange: (k: T) => void }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = o.k === value;
          return (
            <Pressable
              key={o.k}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.k)}
              style={[s.chip, on && { backgroundColor: C.gold, borderColor: C.gold }]}
            >
              <Text style={{ color: on ? C.goldInk : C.text, fontWeight: '700' }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Alert({ children }: { children: React.ReactNode }) {
  return <View style={s.alert}>{children}</View>;
}

/** Two-tap confirm: first tap arms, second tap runs. Auto-disarms. */
export function useArm(ms = 3500) {
  const [armed, setArmed] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  const tap = useCallback((key: string, run: () => void) => {
    if (armed === key) { setArmed(null); if (t.current) clearTimeout(t.current); run(); return; }
    setArmed(key);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setArmed(null), ms);
  }, [armed, ms]);
  return { armed, tap };
}

export function Toast({ msg }: { msg: string }) {
  const ins = useSafeAreaInsets();
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={[s.toast, { bottom: ins.bottom + 92 }]} accessibilityLiveRegion="polite">
      <Text style={{ color: '#111', fontWeight: '700' }}>{msg}</Text>
    </View>
  );
}

export function TableRow({
  cells, head, bold, tone,
}: { cells: string[]; head?: boolean; bold?: boolean; tone?: 'good' | 'warn' | 'mute' }) {
  const color = tone === 'good' ? C.green : tone === 'warn' ? C.amber : tone === 'mute' ? C.mute : head ? C.mute : C.text;
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: head ? 0 : 1, borderTopColor: C.line }}>
      {cells.map((c, i) => (
        <Text
          key={i}
          style={{ flex: i === 0 ? 2.4 : 1, textAlign: i === 0 ? 'left' : 'right', color, fontSize: head ? 12 : 14, fontWeight: head || bold ? '700' : '400' }}
        >{c}</Text>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  h3: { color: C.text, fontSize: 20, fontWeight: '800' },
  h2: { color: C.mute, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700', marginTop: 20, marginBottom: 8, marginHorizontal: 2 },
  card: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  mut: { color: C.mute, fontSize: 13 },
  note: { color: C.mute, fontSize: 13, marginTop: 8 },
  btn: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 4, gap: 4, marginBottom: 12 },
  segBtn: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: 4 },
  cnt: { minWidth: 20, paddingHorizontal: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  stat: { backgroundColor: C.card2, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  tag: { backgroundColor: C.card2, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 },
  bar: { height: 10, borderRadius: 99, backgroundColor: C.card2, overflow: 'hidden', marginTop: 10 },
  label: { color: C.mute, fontSize: 13, fontWeight: '700', marginBottom: 5 },
  hint: { color: C.mute, fontSize: 12, marginTop: 4 },
  input: { backgroundColor: C.bg, borderColor: '#3a3a44', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, color: C.text, fontSize: 16 },
  chip: { minHeight: 42, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: C.line, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  alert: { backgroundColor: C.alertBg, borderColor: C.amberLine, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: '#f4f2ea', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 14, maxWidth: '92%', elevation: 8 },
});
