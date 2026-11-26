import React from 'react';
import { GoChat } from '../../components/gochat';
import { Screen } from '../../components/ui';
import { useStore } from '../../lib/store';

/** The Chat tab: ask the assistant anything, any time. Photos and files go on with the + button. */
export default function ChatTab() {
  const { assistant } = useStore();
  return (
    <Screen>
      <GoChat enabled={assistant} />
    </Screen>
  );
}
