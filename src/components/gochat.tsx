import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { askChat, type ChatAttachment, type ChatFile } from '../lib/api';
import { PickError, pickFile, pickPhoto, type Picked } from '../lib/chatfiles';
import { ASSISTANT_NAME, STORE_BUILD } from '../lib/flavor';
import { C } from '../lib/theme';
import { Btn, Card, Mut } from './ui';

interface Msg { id: number; role: 'user' | 'assistant'; text: string; files?: string[] }

const MAX_FILES = 3;
const DEFAULT_ASK = 'Look at this and tell me what matters.';

/** Ask Go Get anything, any time. Photos, PDFs and text files ride on the message you send. It never changes saved numbers. */
export function GoChat({ enabled }: { enabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const seq = useRef(1);
  const scroller = useRef<ScrollView>(null);

  const add = async (fn: () => Promise<Picked | null>) => {
    setMenu(false); setErr('');
    if (picked.length >= MAX_FILES) { setErr(`Up to ${MAX_FILES} files per message.`); return; }
    try {
      const p = await fn();
      if (p) setPicked((cur) => [...cur, p]);
    } catch (e) {
      setErr(e instanceof PickError ? e.message : 'That file could not be added.');
    }
  };

  const send = async () => {
    const q = text.trim();
    if (busy || (!q && !picked.length)) return;
    setErr(''); setBusy(true);
    const ask = q || DEFAULT_ASK;
    const mine: Msg = { id: seq.current++, role: 'user', text: ask, files: picked.map((p) => p.name) };
    const history = [...msgs, mine];
    const attachments: ChatAttachment[] = picked.filter((p) => p.data).map((p) => ({ mime: p.mime, data: p.data as string }));
    const files: ChatFile[] = picked.filter((p) => p.text != null).map((p) => ({ name: p.name, text: p.text as string }));
    setMsgs(history); setText(''); setPicked([]);
    try {
      const r = await askChat(history.map((m) => ({ role: m.role, text: m.text })), attachments, files, STORE_BUILD);
      setMsgs((cur) => [...cur, { id: seq.current++, role: 'assistant', text: r.reply }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setText(q); setPicked(picked); setMsgs(msgs);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    }
  };

  const chip = { borderWidth: 1, borderColor: C.line, backgroundColor: C.card2, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginTop: 8 } as const;

  return (
    <Card style={{ borderColor: C.goldLine }}>
      <Text style={{ color: C.gold, fontSize: 20, fontWeight: '800' }}>Ask {ASSISTANT_NAME}</Text>
      <Mut style={{ marginTop: 4 }}>Ask anything about your plays, money, miles or a screenshot. Tap + to add a photo or file.</Mut>

      {!enabled && <Text style={{ color: C.amber, fontSize: 13, marginTop: 8 }}>The assistant is switched off on the server right now.</Text>}

      {msgs.length > 0 && (
        <ScrollView ref={scroller} nestedScrollEnabled style={{ maxHeight: 360, marginTop: 10 }} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
          {msgs.map((m) => (
            <View key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%', marginBottom: 8, backgroundColor: m.role === 'user' ? C.goldDim : C.card2, borderWidth: 1, borderColor: m.role === 'user' ? C.goldLine : C.line, borderRadius: 14, padding: 10 }}>
              {!!m.files?.length && <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>📎 {m.files.join(', ')}</Text>}
              <Text selectable style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
            </View>
          ))}
          {busy && <Text style={{ color: C.mute, fontSize: 14, marginBottom: 6 }}>Thinking...</Text>}
        </ScrollView>
      )}

      {picked.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {picked.map((p, i) => (
            <Pressable key={`${p.name}-${i}`} accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} onPress={() => setPicked((cur) => cur.filter((_, j) => j !== i))} style={chip}>
              <Text style={{ color: C.text, fontSize: 13 }}>📎 {p.name.length > 22 ? p.name.slice(0, 20) + '...' : p.name}  ✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      {menu && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          <Btn sm label="Photo library" onPress={() => add(() => pickPhoto(false))} style={{ marginRight: 8, marginTop: 4 }} />
          <Btn sm label="Take photo" onPress={() => add(() => pickPhoto(true))} style={{ marginRight: 8, marginTop: 4 }} />
          <Btn sm label="PDF / file" onPress={() => add(pickFile)} style={{ marginTop: 4 }} />
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a photo or file"
          onPress={() => setMenu((v) => !v)}
          style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: menu ? C.gold : C.card2, borderWidth: 1, borderColor: menu ? C.gold : C.line, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
        >
          <Text style={{ color: menu ? C.goldInk : C.gold, fontSize: 28, fontWeight: '700', marginTop: -2 }}>+</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask Go Get anything"
          placeholderTextColor={C.mute}
          multiline
          maxLength={3000}
          accessibilityLabel="Message"
          style={{ flex: 1, minHeight: 46, maxHeight: 130, color: C.text, fontSize: 16, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 }}
        />
        <Btn kind="gold" label={busy ? '...' : 'Send'} onPress={send} disabled={busy || !enabled || (!text.trim() && !picked.length)} style={{ marginLeft: 8, minHeight: 46 }} />
      </View>

      {!!err && <Text style={{ color: C.red, fontSize: 14, fontWeight: '700', marginTop: 8 }}>{err}</Text>}
      <Text style={{ color: C.mute, fontSize: 12, marginTop: 10, lineHeight: 17 }}>
        Your message and anything you attach go to Anthropic only when you tap Send. Chat never changes your saved numbers.
      </Text>
    </Card>
  );
}
