import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { endOf, fmtTime, normPlat, PLAT_NAME, startOf } from './calc';
import type { Block, Entry } from './types';

export const REMIND_KEY = 'df_reminders_v1';
export const ASKED_KEY = 'df_notif_asked_v1';
/** Phone reminders are local notifications, which the iPhone web version can't send. */
export const NOTIFS_SUPPORTED = Platform.OS !== 'web';
const CHANNEL = 'block-reminders';
const MAX_BLOCKS = 20; // iPhone allows 64 pending local notifications; 3 per block

let inited = false;

/** Notification handler + Android channel. Safe to call more than once. */
export async function initNotifications(): Promise<void> {
  if (inited || !NOTIFS_SUPPORTED) return;
  inited = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Play reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f0be2f',
    }).catch(() => null);
  }
}

export async function permissionGranted(): Promise<boolean> {
  if (!NOTIFS_SUPPORTED) return false;
  try {
    const p = await Notifications.getPermissionsAsync();
    return !!p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch { return false; }
}

/** Shows the system prompt if needed. On Android 13+ the channel must exist first. */
export async function askPermission(): Promise<boolean> {
  if (!NOTIFS_SUPPORTED) return false;
  try {
    await initNotifications();
    if (await permissionGranted()) return true;
    const r = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
    return !!r.granted || r.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch { return false; }
}

async function run(entries: Entry[], enabled: boolean): Promise<void> {
  if (!NOTIFS_SUPPORTED) return;
  try {
    await initNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled || !(await permissionGranted())) return;
    const now = Date.now();
    const blocks = entries
      .filter((e): e is Block => e.type === 'block' && e.status === 'planned')
      .filter((b) => endOf(b).getTime() > now)
      .sort((a, b) => +startOf(a) - +startOf(b))
      .slice(0, MAX_BLOCKS);

    const at = async (when: number, title: string, body: string) => {
      if (when <= now + 15000) return;
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when), channelId: CHANNEL },
      });
    };

    for (const b of blocks) {
      const plat = normPlat(b.platform);
      const name = PLAT_NAME[plat];
      const s = startOf(b).getTime();
      const where = b.station ? ` · ${b.station}` : '';
      const penalty = plat === 'flex' ? ' Cancel more than 45 minutes before it starts to avoid a penalty.' : '';
      await at(s - 60 * 60000, `${name} play in 1 hour`, `${fmtTime(b.start)}${where}.${penalty}`);
      await at(s, 'Getinnat and finish Dat', `${name} · ${fmtTime(b.start)}${where}. Check in and go get it.`);
      await at(endOf(b).getTime(), 'Play finished?', 'Log your pay, tips and miles while it is fresh.');
    }
  } catch { /* reminders are best effort */ }
}

let chain: Promise<void> = Promise.resolve();
/** Re-plans every reminder from the current schedule. Calls run one at a time so they never double up. */
export function syncReminders(entries: Entry[], enabled: boolean): Promise<void> {
  chain = chain.then(() => run(entries, enabled));
  return chain;
}
