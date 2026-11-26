import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { C } from '../lib/theme';
import { Card, H2, Mut } from './ui';

const ARTIST = "Fully'GoGetem'Loaded";
const Q = encodeURIComponent(ARTIST);

const LISTEN: { name: string; url: string }[] = [
  { name: 'YouTube', url: 'https://www.youtube.com/@fullygogetemloaded' },
  { name: 'Spotify', url: 'https://open.spotify.com/artist/3now5sjWTwFHjeLyzY7t82' },
  { name: 'Apple Music', url: 'https://music.apple.com/us/artist/fullygogetemloaded/6807025742' },
  { name: 'YouTube Music', url: 'https://music.youtube.com/@fullygogetemloaded' },
  { name: 'Amazon Music', url: `https://music.amazon.com/search/${Q}` },
  { name: 'SoundCloud', url: `https://soundcloud.com/search?q=${Q}` },
  { name: 'Tidal', url: `https://tidal.com/search?q=${Q}` },
  { name: 'Audiomack', url: `https://audiomack.com/search?q=${Q}` },
  { name: 'Pandora', url: `https://www.pandora.com/search/${Q}/all` },
  { name: 'Deezer', url: `https://www.deezer.com/search/${Q}` },
];

const FOLLOW: { name: string; url: string }[] = [
  { name: 'Instagram', url: 'https://instagram.com/fullygogetemloaded' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@fullygogetemloaded' },
  { name: 'Facebook', url: 'https://www.facebook.com/share/1DuekRoaab/' },
];

const open = (url: string) => { Linking.openURL(url).catch(() => {}); };

function Chip({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      onPress={() => open(url)}
      accessibilityRole="link"
      accessibilityLabel={`Listen on ${label}`}
      style={{ borderWidth: 1, borderColor: C.goldLine, backgroundColor: C.goldDim, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 }}
    >
      <Text style={{ color: C.gold, fontWeight: '800', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

/** The Dashin & Flexin wordmark with the signature line. */
export function Logo() {
  return (
    <View
      accessible
      accessibilityLabel="Dashin and Flexin. I'm constantly workin dis bitch, I'm givin dis shit 100 percent."
      style={{ backgroundColor: C.card, borderWidth: 2, borderColor: C.gold, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 14, marginBottom: 14, alignItems: 'center' }}
    >
      <Text style={{ color: C.gold, fontSize: 30, fontWeight: '900', letterSpacing: 1, textAlign: 'center' }}>DASHIN & FLEXIN</Text>
      <View style={{ height: 3, width: 64, backgroundColor: C.gold, borderRadius: 2, marginVertical: 10 }} />
      <Text style={{ color: C.text, fontSize: 15, fontWeight: '800', textAlign: 'center', lineHeight: 21 }}>
        I'M CONSTANTLY WORKIN DIS BITCH, I'M GIVIN DIS SHIT 100%!!!
      </Text>
      <Text style={{ color: C.mute, fontSize: 12, fontWeight: '700', marginTop: 8, letterSpacing: 0.5 }}>{ARTIST.toUpperCase()}</Text>
    </View>
  );
}

/** Promo card telling every user to stream the artist while they work. */
export function ListenCard() {
  return (
    <>
      <H2>Listen while you work</H2>
      <Card>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Go listen to {ARTIST} while you workin dat bitch.</Text>
        <Mut style={{ marginTop: 6, marginBottom: 12 }}>Stream on any platform you use. Tap one and hit play.</Mut>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {LISTEN.map((l) => <Chip key={l.name} label={l.name} url={l.url} />)}
        </View>
        <Mut style={{ marginTop: 6, marginBottom: 8 }}>Follow</Mut>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {FOLLOW.map((l) => <Chip key={l.name} label={l.name} url={l.url} />)}
        </View>
      </Card>
    </>
  );
}
