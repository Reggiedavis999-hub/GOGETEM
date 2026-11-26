import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export interface Picked {
  name: string;
  mime: string;
  /** Base64 for photos and PDFs */
  data?: string;
  /** Plain text for .txt / .csv files */
  text?: string;
}

/** The server limit is about 2 MB per file. Base64 is 4/3 the size, so 2.8 million characters. */
const MAX_B64 = 2800000;
const TOO_BIG = 'That file is too big. Pick one under 2 MB or a smaller photo.';

export class PickError extends Error {}

async function toBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new PickError('That file could not be read.'));
    fr.onload = () => {
      const out = String(fr.result || '');
      resolve(out.slice(out.indexOf(',') + 1));
    };
    fr.readAsDataURL(blob);
  });
}

function fromAsset(a: ImagePicker.ImagePickerAsset): Picked {
  const mime = (a.mimeType || 'image/jpeg').toLowerCase();
  if (!a.base64) throw new PickError('That photo could not be read.');
  if (a.base64.length > MAX_B64) throw new PickError(TOO_BIG);
  return { name: a.fileName || 'photo', mime, data: a.base64 };
}

/** Returns null when the person cancels. Throws PickError with a plain message when a file cannot be used. */
export async function pickPhoto(camera: boolean): Promise<Picked | null> {
  const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted && perm.canAskAgain === false) throw new PickError('Allow photo access in your phone settings to attach photos.');
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true, allowsMultipleSelection: false };
  const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.length) return null;
  return fromAsset(r.assets[0]);
}

export async function pickFile(): Promise<Picked | null> {
  const r = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'text/plain', 'text/csv', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (r.canceled || !r.assets?.length) return null;
  const f = r.assets[0];
  const mime = (f.mimeType || '').toLowerCase();
  const name = f.name || 'file';
  if (f.size && f.size > 2000000) throw new PickError(TOO_BIG);
  if (mime.startsWith('text/') || /\.(txt|csv)$/i.test(name)) {
    const text = await (await fetch(f.uri)).text();
    return { name, mime: 'text/plain', text };
  }
  const data = await toBase64(f.uri);
  if (data.length > MAX_B64) throw new PickError(TOO_BIG);
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return { name, mime: 'application/pdf', data };
  if (mime.startsWith('image/')) return { name, mime, data };
  throw new PickError('Only photos, PDFs and text files work here.');
}

/** Picks a square photo and shrinks it to a small JPEG for a profile picture. Returns base64, or null on cancel. */
export async function pickAvatar(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted && perm.canAskAgain === false) throw new PickError('Allow photo access in your phone settings to set a picture.');
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
  if (r.canceled || !r.assets?.length) return null;
  const ref = ImageManipulator.manipulate(r.assets[0].uri).resize({ width: 160 });
  const img = await ref.renderAsync();
  const out = await img.saveAsync({ compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  if (!out.base64 || out.base64.length > 85000) throw new PickError('That picture could not be shrunk enough. Try another.');
  return out.base64;
}
