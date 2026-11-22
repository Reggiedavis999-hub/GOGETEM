import { Platform, Share } from 'react-native';

export type ShareResult = 'shared' | 'copied' | 'failed';

/** Opens the phone's share sheet. On the web version it falls back to copying the text. */
export async function shareText(message: string, title?: string): Promise<ShareResult> {
  try {
    await Share.share({ message, title });
    return 'shared';
  } catch {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(message);
        return 'copied';
      } catch { /* clipboard blocked */ }
    }
    return 'failed';
  }
}

/** Web only: saves text as a file download. Returns false where downloads aren't available. */
export function downloadTextFile(name: string, text: string, mime = 'text/csv'): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  try {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch { return false; }
}
