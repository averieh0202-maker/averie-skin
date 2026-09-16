/**
 * Convert local / blob / data URIs to a data URL for vision APIs.
 * Worker path never uses this — it only accepts data:image payloads.
 */
import * as FileSystem from 'expo-file-system/legacy';

export async function imageUriToDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  // Remote http(s) — DashScope can fetch URL directly
  if (/^https?:\/\//i.test(uri)) return uri;

  if (uri.startsWith('blob:')) {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const lower = uri.toLowerCase();
  const mime = lower.includes('.png')
    ? 'image/png'
    : lower.includes('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${mime};base64,${b64}`;
}

/** Same cap as qwenAnalyzer — reject oversized payloads; never truncate. */
export const MAX_IMAGE_DATA_URL_LENGTH = 1_800_000;
