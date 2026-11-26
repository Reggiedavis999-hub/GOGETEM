import { router } from 'expo-router';
import React from 'react';
import { Linking, Text, View } from 'react-native';
import { GoChat } from '../../components/gochat';
import { Actions, Btn, Card, Empty, H2, Mut, Note, Row, Screen, Tag } from '../../components/ui';
import { fmtDate, money, PLAT_NAME, normPlat } from '../../lib/calc';
import { ASSISTANT_NAME } from '../../lib/flavor';
import Constants from 'expo-constants';
import { siteOrigin } from '../../lib/api';
import { useStore } from '../../lib/store';
import { C } from '../../lib/theme';
import type { Block } from '../../lib/types';

/** The assistant's own tab. Pick a dash, write the note, tap check. Nothing changes until you tap Apply and then Save. */
export default function AssistTab() {
  const { assistant, entries, live } = useStore();
  const site = siteOrigin(((Constants.expoConfig?.extra || {}) as { apiBase?: string }).apiBase);
  const done = (entries.filter((e) => e.type === 'block' && e.status === 'done') as Block[])
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.created || 0) - (a.created || 0)))
    .slice(0, 8);

  return (
    <Screen>
      <GoChat enabled={assistant} />

      <Card style={{ borderColor: C.goldLine }}>
        <Row>
          <Text style={{ color: C.gold, fontSize: 20, fontWeight: '800', flex: 1 }}>{ASSISTANT_NAME}</Text>
          <Tag label={assistant ? 'On' : 'Off'} gold={assistant} />
        </Row>
        <Text style={{ color: C.text, fontSize: 14, marginTop: 8 }}>
          Write a note on a dash like "route was 84 mi, house to the facility was 12 mi, did not count it". I read it, show you what would change, and you tap Apply. Nothing saves until you save the dash.
        </Text>
        {!assistant && <Text style={{ color: C.amber, fontSize: 13, marginTop: 8 }}>The assistant is switched off on the server right now. Reload the app. If it stays off, the API key is not set.</Text>}
      </Card>

      <H2>Live dash</H2>
      {live ? (
        <Card>
          <Text style={{ color: C.text, fontSize: 14 }}>Your dash is running. Write the note when you end it and tap "{ASSISTANT_NAME}: check my note" under the note.</Text>
          <Actions><Btn kind="gold" label="End dash and check my note" onPress={() => router.push('/enddash')} /></Actions>
        </Card>
      ) : (
        <Card><Mut>No dash running. Start one from Home with "Make a play".</Mut></Card>
      )}

      <H2>Finished dashes</H2>
      {done.length === 0 ? (
        <Empty>No finished dashes yet. Finish one and it shows up here.</Empty>
      ) : (
        done.map((b) => (
          <Card key={b.id} style={{ marginBottom: 10 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '800' }}>{PLAT_NAME[normPlat(b.platform)]} · {fmtDate(b.date)}</Text>
                <Mut>{money(b.pay + b.tips)}{b.miles ? ` · ${b.miles} mi` : ''}</Mut>
                {!!b.note && <Text style={{ color: C.mute, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{b.note}</Text>}
              </View>
              <Btn sm kind="gold" label="Check note" onPress={() => router.push({ pathname: '/dashedit', params: { id: b.id } })} />
            </Row>
          </Card>
        ))
      )}

      {assistant && (
        <Actions>
          <Btn sm label="AI assistant notice" onPress={() => Linking.openURL(`${site}/ai.html`).catch(() => {})} />
        </Actions>
      )}
      <Note>Your note and that dash's numbers, or your chat message and attachments, go to Anthropic only when you tap check or Send. See the notice for details.</Note>
    </Screen>
  );
}
