import React, { useState } from 'react';
import { View } from 'react-native';
import { GoChat } from '../../components/gochat';
import { RoomPanel, TeamPanel } from '../../components/team';
import { Btn, Screen } from '../../components/ui';
import { ASSISTANT_NAME } from '../../lib/flavor';
import { useStore } from '../../lib/store';

type Seg = 'room' | 'team' | 'go';

/** The Chat tab: the drivers room, My Team, and the assistant chat. */
export default function ChatTab() {
  const { assistant } = useStore();
  const [seg, setSeg] = useState<Seg>('room');
  return (
    <Screen>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Btn sm kind={seg === 'room' ? 'gold' : 'plain'} label="Room" onPress={() => setSeg('room')} style={{ flex: 1, marginRight: 6 }} />
        <Btn sm kind={seg === 'team' ? 'gold' : 'plain'} label="My Team" onPress={() => setSeg('team')} style={{ flex: 1, marginRight: 6 }} />
        <Btn sm kind={seg === 'go' ? 'gold' : 'plain'} label={ASSISTANT_NAME} onPress={() => setSeg('go')} style={{ flex: 1.3 }} />
      </View>
      {seg === 'room' && <RoomPanel />}
      {seg === 'team' && <TeamPanel />}
      {seg === 'go' && <GoChat enabled={assistant} />}
    </Screen>
  );
}
