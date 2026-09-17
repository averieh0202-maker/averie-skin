/**
 * Convert local / blob / data URIs to a data URL for vision APIs,
 * and auto-compress oversized data URLs before analyze (Web: Image + canvas).
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

/** Same cap as Worker / qwenAnalyzer — reject only after compress still exceeds. */
export const MAX_IMAGE_DATA_URL_LENGTH = 1_800_000;

/** Binary size roughly matching MAX_IMAGE_DATA_URL_LENGTH after base64 (~33% overhead). */
export const MAX_IMAGE_BLOB_BYTES = 1_350_000;

/**
 * Public-site aggressive defaults: longest edge from 1280, quality from 0.75,
 * with further steps down to 1024 if still over the cap.
 */
export const COMPRESS_MAX_EDGES = [1280, 1152, 1024] as const;
export const COMPRESS_QUALITIES = [0.75, 0.7, 0.6] as const;

function canUseBrowserCanvas(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof Image !== 'undefined' &&
    typeof document.createElement === 'function'
  );
}

/** Web: Image + canvas.toDataURL('image/jpeg', q). */
export function compressWithBrowserCanvas(
  dataUrl: string,
  maxEdge: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
}

async function compressOnce(
  dataUrl: string,
  maxEdge: number,
  quality: number,
): Promise<string | null> {
  if (!canUseBrowserCanvas()) return null;
  try {
    return await compressWithBrowserCanvas(dataUrl, maxEdge, quality);
  } catch {
    return null;
  }
}

/**
 * Convert URI → data URL (or pass through http(s)), then aggressively compress
 * when canvas is available (always start at 1280 / 0.75 for public uploads).
 * Throws IMAGE_PROCESS_FAILED only if still over after all passes.
 */
export async function prepareImageDataUrl(uri: string): Promise<string> {
  const converted = await imageUriToDataUrl(uri);

  // Remote http(s) — leave as-is (DashScope fetches URL).
  if (/^https?:\/\//i.test(converted)) return converted;

  if (!converted.startsWith('data:')) return converted;

  let best = converted;
  if (canUseBrowserCanvas()) {
    for (let i = 0; i < COMPRESS_MAX_EDGES.length; i++) {
      const maxEdge = COMPRESS_MAX_EDGES[i];
      const quality = COMPRESS_QUALITIES[i];
      const next = await compressOnce(converted, maxEdge, quality);
      if (next && next.startsWith('data:') && next.length < best.length) {
        best = next;
      }
      // Stop as soon as we are under the cap (first pass is already aggressive).
      if (best.length <= MAX_IMAGE_DATA_URL_LENGTH) return best;
    }
  }

  if (best.length <= MAX_IMAGE_DATA_URL_LENGTH) return best;

  throw new Error('IMAGE_PROCESS_FAILED');
}

function dataUrlToBlobSync(dataUrl: string): Blob | null {
  const m = /^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || 'image/jpeg';
  const b64 = m[2];
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/**
 * Prepare a JPEG (or image) Blob for multipart upload — avoids ~33% base64 inflation on the wire.
 */
export async function prepareImageJpegBlob(uri: string): Promise<Blob> {
  const dataUrl = await prepareImageDataUrl(uri);
  if (/^https?:\/\//i.test(dataUrl)) {
    const res = await fetch(dataUrl);
    return res.blob();
  }
  const blob = dataUrlToBlobSync(dataUrl);
  if (!blob) {
    throw new Error('IMAGE_PROCESS_FAILED');
  }
  return blob;
}
