import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Actions, Btn, Field, Picker, SheetScreen, Two } from '../components/ui';
import { EXP_CATS, cleanNum, expPlat, money, newId, parseDateInput, todayStr } from '../lib/calc';
import { useStore } from '../lib/store';
import type { ExpPlatform, Expense } from '../lib/types';

export default function ExpenseForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { entries, me, saveEntry, flash } = useStore();
  const existing = params.id ? (entries.find((x) => x.id === params.id && x.type === 'expense') as Expense | undefined) : undefined;
  const [date, setDate] = useState(existing?.date || todayStr());
  const [amt, setAmt] = useState(existing?.amt ? String(existing.amt) : '');
  const [cat, setCat] = useState(existing?.cat || 'Gas');
  const [plat, setPlat] = useState<ExpPlatform>(existing ? expPlat(existing) : 'all');
  const [note, setNote] = useState(existing?.note || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    const d = parseDateInput(date), a = cleanNum(amt);
    if (!d || a <= 0) { flash('Add a date and an amount.'); return; }
    setBusy(true);
    const x: Expense = {
      ...(existing || {}), id: existing?.id || newId(), type: 'expense', platform: plat, date: d, amt: a, cat, note: note.trim(),
      who: existing?.who || me?.id || '', created: existing?.created || Date.now(),
    };
    const ok = await saveEntry(x);
    setBusy(false);
    if (ok) { router.back(); flash('Expense saved ' + money(a)); }
  };

  return (
    <SheetScreen title={existing ? 'Edit expense' : 'Expense'}>
      <Two>
        <Field label="Date" value={date} onChangeText={setDate} placeholder="11/22" autoCapitalize="none" />
        <Field label="Amount $" value={amt} onChangeText={setAmt} keyboardType="decimal-pad" placeholder="0" />
      </Two>
      <Picker label="Category" value={cat} onChange={setCat} options={EXP_CATS.map((c) => ({ k: c, label: c }))} />
      <Picker<ExpPlatform> label="Applies to" value={plat} onChange={setPlat} options={[{ k: 'all', label: 'All / shared' }, { k: 'flex', label: 'Flex only' }, { k: 'doordash', label: 'DoorDash only' }, { k: 'ubereats', label: 'Uber Eats only' }]} />
      <Field label="Note" value={note} onChangeText={setNote} />
      <Actions>
        <Btn kind="gold" label={busy ? 'Saving...' : 'Save'} onPress={save} disabled={busy} />
        <Btn label="Cancel" onPress={() => router.back()} />
      </Actions>
    </SheetScreen>
  );
}
