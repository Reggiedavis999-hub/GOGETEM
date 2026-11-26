import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { askAssistant, ApiError } from '../lib/api';
import { applyAssist, assistTotal } from '../lib/calc';
import type { AssistState } from '../lib/calc';
import { ASSISTANT_NAME, STORE_BUILD } from '../lib/flavor';
import { useStore } from '../lib/store';
import { C } from '../lib/theme';
import { Actions, Btn, Card } from './ui';

interface Proposal {
  summary: string;
  question: string;
  lines: string[];
  errors: string[];
  next: AssistState | null;
}

/**
 * Reads the note with the assistant and shows what it would change. Nothing is saved or changed until the person taps Apply.
 * The assistant names the numbers; applyAssist does the adding and subtracting.
 */
export function AssistPanel({
  note, state, context, onApply,
}: { note: string; state: AssistState; context: Record<string, unknown>; onApply: (next: AssistState) => void }) {
  const { assistant, flash } = useStore();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Proposal | null>(null);
  const [err, setErr] = useState('');
  if (!assistant) return null;
  const ready = note.trim().length >= 3;

  const ask = async () => {
    setBusy(true);
    setRes(null);
    setErr('');
    try {
      const now = Date.now();
      const r = await askAssistant(
        note.trim(),
        {
          ...context,
          miles: state.miles,
          tips: state.tips,
          total: assistTotal(state),
          plays: state.plays.map((p, i) => ({ n: i + 1, rate: p.rate, deliveries: p.deliveries, minutes: Math.round(((p.end ?? now) - p.start) / 60000), total: p.total })),
        },
        STORE_BUILD,
      );
      const a = r.changes.length ? applyAssist(state, r.changes) : null;
      setRes({ summary: r.summary, question: r.question, lines: a ? a.lines : [], errors: a ? a.errors : [], next: a && a.lines.length ? a.next : null });
    } catch (e) {
      const m = (e as ApiError).message || 'The assistant could not read that. Try again.';
      setErr(m);
      flash(m);
    }
    setBusy(false);
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Btn sm kind="gold" label={busy ? 'Reading your note...' : `${ASSISTANT_NAME}: check my note`} onPress={ask} disabled={busy || !ready} />
      {!ready && <Text style={{ color: C.mute, fontSize: 12, marginTop: 6 }}>Write the note first, like "route was 84 mi, house to the facility was 12 mi, did not count it".</Text>}
      {!!err && <Text style={{ color: C.red, fontSize: 14, fontWeight: '700', marginTop: 8 }}>{err}</Text>}
      {res && (
        <Card style={{ marginTop: 10, borderColor: C.goldLine }}>
          <Text style={{ color: C.gold, fontWeight: '800', marginBottom: 4 }}>{ASSISTANT_NAME}</Text>
          {!!res.summary && <Text style={{ color: C.text, fontSize: 14 }}>{res.summary}</Text>}
          {!!res.question && <Text style={{ color: C.amber, fontSize: 14, marginTop: 6 }}>{res.question}</Text>}
          {res.lines.map((l, i) => <Text key={i} style={{ color: C.text, fontWeight: '700', fontSize: 14, marginTop: 6 }}>• {l}</Text>)}
          {res.errors.map((l, i) => <Text key={'e' + i} style={{ color: C.red, fontSize: 13, marginTop: 6 }}>{l}</Text>)}
          {!res.lines.length && !res.question && <Text style={{ color: C.mute, fontSize: 13, marginTop: 6 }}>Nothing in that note changes your money or miles. It stays a plain note.</Text>}
          <Actions>
            {res.next && <Btn sm kind="gold" label="Apply these" onPress={() => { onApply(res.next as AssistState); setRes(null); flash('Applied. Check the numbers, then save.'); }} />}
            <Btn sm label={res.next ? 'Not now' : 'Close'} onPress={() => setRes(null)} />
          </Actions>
        </Card>
      )}
    </View>
  );
}
