import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { PickError, pickAvatar } from '../lib/chatfiles';
import { avatarOf, forgetAvatar, soc, type FindResp, type MeSocial, type PollResp, type SocMsg } from '../lib/social';
import { C } from '../lib/theme';
import { Btn, Card, H2, Mut } from './ui';

const msgOf = (e: unknown, fallback = 'Something went wrong. Try again.') => (e instanceof Error && e.message ? e.message : fallback);

export function Avatar({ username, size = 40, bust }: { username: string; size?: number; bust?: number }) {
  const [data, setData] = useState('');
  useEffect(() => {
    let live = true;
    avatarOf(username).then((d) => { if (live) setData(d); });
    return () => { live = false; };
  }, [username, bust]);
  const box = { width: size, height: size, borderRadius: size / 2, backgroundColor: C.card2, borderWidth: 1, borderColor: C.goldLine, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } as const;
  if (data) return <Image accessibilityLabel={`${username} profile picture`} source={{ uri: `data:image/jpeg;base64,${data}` }} style={box} resizeMode="cover" />;
  return (
    <View style={box} accessibilityLabel={`${username} profile picture`}>
      <Text style={{ color: C.gold, fontWeight: '800', fontSize: size * 0.45 }}>{(username[0] || '?').toUpperCase()}</Text>
    </View>
  );
}

const input = { color: C.text, fontSize: 16, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12 } as const;

/** A live conversation: the drivers room ("room") or a direct chat with someone on your team. */
export function ChatPane({ target, onBack, onChanged }: { target: string; onBack?: () => void; onChanged?: () => void }) {
  const isRoom = target === 'room';
  const [msgs, setMsgs] = useState<SocMsg[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const scroller = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const r = await soc<PollResp>('poll', { with: target });
      setMsgs(r.messages); setOnline(r.online || []);
    } catch (e) { setErr(msgOf(e)); }
  }, [target]);

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [load]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setErr('');
    try {
      await soc('send', { to: target, text: t });
      setText('');
      await load();
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    } catch (e) { setErr(msgOf(e)); } finally { setBusy(false); }
  };

  const report = async (username: string, text2: string) => {
    try { await soc('report', { username, where: isRoom ? 'room' : 'direct', text: text2 }); setNote('Reported. Thank you. We review reports.'); }
    catch (e) { setErr(msgOf(e)); }
  };
  const block = async (username: string) => {
    try { await soc('block', { username }); setNote(`${username} is blocked.`); onChanged?.(); if (!isRoom) onBack?.(); else load(); }
    catch (e) { setErr(msgOf(e)); }
  };

  const small = { color: C.mute, fontSize: 12, fontWeight: '700' } as const;
  return (
    <Card style={{ borderColor: C.goldLine }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onBack && <Btn sm label="Back" onPress={onBack} style={{ marginRight: 10 }} />}
        {!isRoom && <View style={{ marginRight: 10 }}><Avatar username={target} size={36} /></View>}
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.gold, fontSize: 18, fontWeight: '800' }}>{isRoom ? 'Drivers room' : target}</Text>
          <Mut>{isRoom ? `${online.length} online now` : online.length ? 'Online now' : 'Offline'}</Mut>
        </View>
        {!isRoom && (
          <>
            <Pressable accessibilityRole="button" onPress={() => report(target, '')} style={{ padding: 8 }}><Text style={small}>Report</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => block(target)} style={{ padding: 8 }}><Text style={small}>Block</Text></Pressable>
          </>
        )}
      </View>

      <ScrollView ref={scroller} nestedScrollEnabled style={{ maxHeight: 380, minHeight: 120, marginTop: 10 }} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}>
        {msgs.length === 0 && <Mut>{isRoom ? 'No messages yet. Say what is up.' : 'No messages yet. Say what is up.'}</Mut>}
        {msgs.map((m) => (
          <View key={m.id} style={{ flexDirection: m.mine ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: 8 }}>
            {!m.mine && <View style={{ marginRight: 6 }}><Avatar username={m.from} size={30} /></View>}
            <View style={{ maxWidth: '78%', backgroundColor: m.mine ? C.goldDim : C.card2, borderWidth: 1, borderColor: m.mine ? C.goldLine : C.line, borderRadius: 14, padding: 10 }}>
              {!m.mine && <Text style={{ color: C.gold, fontSize: 12, fontWeight: '800', marginBottom: 2 }}>{m.from}</Text>}
              <Text selectable style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
              {!m.mine && isRoom && (
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  <Pressable accessibilityRole="button" onPress={() => report(m.from, m.text)}><Text style={small}>Report</Text></Pressable>
                  <Text style={small}>  ·  </Text>
                  <Pressable accessibilityRole="button" onPress={() => block(m.from)}><Text style={small}>Block</Text></Pressable>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
        <TextInput
          value={text} onChangeText={setText} multiline maxLength={500}
          placeholder={isRoom ? 'Message the room' : `Message ${target}`} placeholderTextColor={C.mute}
          accessibilityLabel="Message" style={[input, { flex: 1, minHeight: 46, maxHeight: 120 }]}
        />
        <Btn kind="gold" label={busy ? '...' : 'Send'} onPress={send} disabled={busy || !text.trim()} style={{ marginLeft: 8, minHeight: 46 }} />
      </View>
      {!!err && <Text style={{ color: C.red, fontSize: 14, fontWeight: '700', marginTop: 8 }}>{err}</Text>}
      {!!note && <Text style={{ color: C.gold, fontSize: 13, marginTop: 8 }}>{note}</Text>}
      <Text style={{ color: C.mute, fontSize: 12, marginTop: 10, lineHeight: 17 }}>
        Be respectful. Messages in the room are seen by everyone in it. Report anything abusive and block anyone you do not want to hear from.
      </Text>
    </Card>
  );
}

/** My Team: your username, search by username, requests, your team, and who you blocked. */
export function TeamPanel() {
  const [me, setMe] = useState<MeSocial | null>(null);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<FindResp | null>(null);
  const [chatWith, setChatWith] = useState('');
  const [busy, setBusy] = useState(false);
  const [bust, setBust] = useState(0);

  const refresh = useCallback(async () => {
    try { setMe(await soc<MeSocial>('me')); setErr(''); } catch (e) { setErr(msgOf(e)); }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr('');
    try { await fn(); await refresh(); } catch (e) { setErr(msgOf(e)); } finally { setBusy(false); }
  };

  if (!me) return <Card><Mut>{err || 'Loading...'}</Mut></Card>;

  if (!me.username) {
    return (
      <Card style={{ borderColor: C.goldLine }}>
        <Text style={{ color: C.gold, fontSize: 20, fontWeight: '800' }}>Pick your username</Text>
        <Mut style={{ marginTop: 4, marginBottom: 10 }}>This is how other drivers find you and see you in chat. 3 to 20 letters, numbers, dots or underscores. You cannot change it later.</Mut>
        <TextInput value={name} onChangeText={setName} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="username" placeholderTextColor={C.mute} accessibilityLabel="Username" style={input} />
        <Btn kind="gold" label="Claim username" disabled={busy || name.trim().length < 3} onPress={() => run(async () => { await soc('setname', { username: name }); })} style={{ marginTop: 10 }} />
        {!!err && <Text style={{ color: C.red, fontSize: 14, fontWeight: '700', marginTop: 8 }}>{err}</Text>}
      </Card>
    );
  }

  if (chatWith) return <ChatPane target={chatWith} onBack={() => { setChatWith(''); refresh(); }} onChanged={refresh} />;

  const search = () => run(async () => { setFound(await soc<FindResp>('find', { username: q })); });
  const changePhoto = () => run(async () => {
    try {
      const data = await pickAvatar();
      if (data == null) return;
      await soc('setavatar', { data });
      forgetAvatar(me.username); setBust((b) => b + 1);
    } catch (e) { setErr(e instanceof PickError ? e.message : msgOf(e, 'That picture could not be set.')); }
  });
  const removePhoto = () => run(async () => { await soc('setavatar', { data: '' }); forgetAvatar(me.username); setBust((b) => b + 1); });

  return (
    <View>
      <Card style={{ borderColor: C.goldLine }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar username={me.username} size={64} bust={bust} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: C.gold, fontSize: 20, fontWeight: '800' }}>{me.username}</Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <Btn sm label="Change photo" onPress={changePhoto} disabled={busy} style={{ marginRight: 8 }} />
              <Btn sm label="Remove" onPress={removePhoto} disabled={busy} />
            </View>
          </View>
        </View>
      </Card>

      <H2>Find a driver</H2>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput value={q} onChangeText={(v) => { setQ(v); setFound(null); }} autoCapitalize="none" autoCorrect={false} placeholder="Search a username" placeholderTextColor={C.mute} accessibilityLabel="Search username" style={[input, { flex: 1 }]} onSubmitEditing={search} />
          <Btn kind="gold" label="Search" onPress={search} disabled={busy || q.trim().length < 3} style={{ marginLeft: 8, minHeight: 46 }} />
        </View>
        {found && !found.found && <Mut style={{ marginTop: 10 }}>No one by that exact username.</Mut>}
        {found?.found && found.username && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Avatar username={found.username} size={40} />
            <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, flex: 1, marginLeft: 10 }}>{found.username}</Text>
            {found.onTeam ? <Mut>On your team</Mut> : found.requested ? <Mut>Request sent</Mut> : (
              <Btn sm kind="gold" label="Add to My Team" onPress={() => run(async () => { await soc('add', { username: found.username }); setFound({ ...found, requested: true }); })} />
            )}
          </View>
        )}
      </Card>

      {me.requests.length > 0 && (
        <>
          <H2>Requests</H2>
          {me.requests.map((r) => (
            <Card key={r.username} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar username={r.username} size={40} />
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, flex: 1, marginLeft: 10 }}>{r.username}</Text>
                <Btn sm kind="gold" label="Accept" onPress={() => run(async () => { await soc('add', { username: r.username }); })} style={{ marginRight: 6 }} />
                <Btn sm label="Decline" onPress={() => run(async () => { await soc('leave', { username: r.username }); })} />
              </View>
            </Card>
          ))}
        </>
      )}

      <H2>My Team</H2>
      {me.team.length === 0 ? (
        <Card><Mut>No one yet. Search a username above, and when they accept you can chat.</Mut></Card>
      ) : (
        me.team.map((m) => (
          <Card key={m.username} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar username={m.username} size={44} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>{m.username}</Text>
                <Text style={{ color: m.online ? C.gold : C.mute, fontSize: 13 }}>{m.online ? '● Online' : 'Offline'}</Text>
              </View>
              <Btn sm kind="gold" label="Chat" onPress={() => setChatWith(m.username)} style={{ marginRight: 6 }} />
              <Btn sm label="Remove" onPress={() => run(async () => { await soc('leave', { username: m.username }); })} />
            </View>
          </Card>
        ))
      )}

      {me.pending.length > 0 && (
        <>
          <H2>Waiting on</H2>
          <Card><Mut>{me.pending.map((p) => p.username).join(', ')}</Mut></Card>
        </>
      )}

      {me.blocked.length > 0 && (
        <>
          <H2>Blocked</H2>
          {me.blocked.map((b) => (
            <Card key={b.username} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: C.text, fontWeight: '700', flex: 1 }}>{b.username}</Text>
                <Btn sm label="Unblock" onPress={() => run(async () => { await soc('unblock', { username: b.username }); })} />
              </View>
            </Card>
          ))}
        </>
      )}
      {!!err && <Text style={{ color: C.red, fontSize: 14, fontWeight: '700', marginTop: 8 }}>{err}</Text>}
    </View>
  );
}

/** The drivers room needs a username first. */
export function RoomPanel() {
  const [me, setMe] = useState<MeSocial | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { soc<MeSocial>('me').then(setMe, (e) => setErr(msgOf(e))); }, []);
  if (!me) return <Card><Mut>{err || 'Loading...'}</Mut></Card>;
  if (!me.username) return <Card><Mut>Pick a username in My Team first, then come back to the room.</Mut></Card>;
  return <ChatPane target="room" />;
}
