/**
 * Averie Skin analyze proxy — DashScope key stays server-side only.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AnalysisInput, CarePreferences, Gender } from '../../src/types/analysis';
import { QWEN_SYSTEM_PROMPT, buildQwenUserPrompt } from '../../src/lib/llmSchema';
import { mapLlmPayloadToResult, parseLlmJson } from '../../src/lib/mapLlmToResult';
import { ReportValidationError } from '../../src/lib/reportValidation';

type Env = {
  DASHSCOPE_API_KEY: string;
};

const QWEN_VL_MODEL = 'qwen3-vl-plus';
const DASHSCOPE_COMPAT_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
/** Final payload cap sent to DashScope (matches client). */
const MAX_IMAGE_DATA_URL_LENGTH = 1_800_000;
/** Accept larger incoming data URLs so we can compress as a server-side fallback. */
const MAX_INCOMING_DATA_URL_LENGTH = 6_000_000;
const COMPRESS_MAX_EDGES = [1600, 1400, 1280, 1024] as const;
const COMPRESS_QUALITIES = [0.85, 0.75, 0.7, 0.6] as const;
const PROCESS_FAILED_MSG = '照片处理失败，请重拍一张正面照再试';

const ALLOWED_ORIGINS = new Set([
  'https://averieh0202-maker.github.io',
  'http://localhost:8081',
]);

const GENDERS = new Set<Gender>(['female', 'male', 'unspecified']);

function genderZh(g: Gender): string {
  switch (g) {
    case 'female':
      return '女';
    case 'male':
      return '男';
    default:
      return '不愿说明';
  }
}

function dataUrlToBlob(dataUrl: string): Blob | null {
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

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * Worker fallback compress via createImageBitmap + OffscreenCanvas when available.
 * Returns null if runtime lacks canvas APIs or compression fails.
 */
async function compressWithOffscreen(
  dataUrl: string,
  maxEdge: number,
  quality: number,
): Promise<string | null> {
  try {
    // DOM canvas APIs are optional on Workers; cast loosely for @cloudflare/workers-types.
    const g = globalThis as unknown as {
      createImageBitmap?: (image: Blob) => Promise<{
        width: number;
        height: number;
        close: () => void;
      }>;
      OffscreenCanvas?: new (
        width: number,
        height: number,
      ) => {
        getContext: (type: '2d') => {
          drawImage: (
            image: unknown,
            dx: number,
            dy: number,
            dw: number,
            dh: number,
          ) => void;
        } | null;
        convertToBlob: (options: {
          type?: string;
          quality?: number;
        }) => Promise<Blob>;
      };
    };
    if (typeof g.createImageBitmap !== 'function' || typeof g.OffscreenCanvas === 'undefined') {
      return null;
    }
    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return null;
    const bitmap = await g.createImageBitmap(blob);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new g.OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    const buf = new Uint8Array(await outBlob.arrayBuffer());
    return bytesToDataUrl(buf, 'image/jpeg');
  } catch {
    return null;
  }
}

async function prepareIncomingDataUrl(dataUrl: string): Promise<string | null> {
  if (dataUrl.length <= MAX_IMAGE_DATA_URL_LENGTH) return dataUrl;

  let best = dataUrl;
  for (let i = 0; i < COMPRESS_MAX_EDGES.length; i++) {
    const next = await compressWithOffscreen(
      dataUrl,
      COMPRESS_MAX_EDGES[i],
      COMPRESS_QUALITIES[i],
    );
    if (next && next.length < best.length) best = next;
    if (best.length <= MAX_IMAGE_DATA_URL_LENGTH) return best;
  }
  return best.length <= MAX_IMAGE_DATA_URL_LENGTH ? best : null;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '';
      return ALLOWED_ORIGINS.has(origin) ? origin : '';
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  }),
);

app.get('/health', (c) => c.json({ ok: true, model: QWEN_VL_MODEL }));

app.post('/analyze', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: '请求体必须是 JSON' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return c.json({ error: '请求体无效' }, 400);
  }

  const { gender, age, imageDataUrl: rawImage, preferences } = body as {
    gender?: unknown;
    age?: unknown;
    imageDataUrl?: unknown;
    preferences?: CarePreferences;
  };

  if (typeof gender !== 'string' || !GENDERS.has(gender as Gender)) {
    return c.json({ error: 'gender 必填且须为 female | male | unspecified' }, 400);
  }
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 13 || age > 99) {
    return c.json({ error: 'age 必填且须为 13–99 的整数' }, 400);
  }
  if (typeof rawImage !== 'string' || !rawImage.startsWith('data:image')) {
    return c.json({ error: 'imageDataUrl 必须是 data:image… 格式' }, 400);
  }
  if (rawImage.length > MAX_INCOMING_DATA_URL_LENGTH) {
    return c.json({ error: PROCESS_FAILED_MSG }, 400);
  }

  let imageDataUrl = rawImage;
  if (imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    const prepared = await prepareIncomingDataUrl(imageDataUrl);
    if (!prepared) {
      return c.json({ error: PROCESS_FAILED_MSG }, 400);
    }
    imageDataUrl = prepared;
  }

  const apiKey = c.env.DASHSCOPE_API_KEY?.trim();
  if (!apiKey) {
    return c.json({ error: '分析服务尚未配置密钥' }, 500);
  }

  const input: AnalysisInput = {
    gender: gender as Gender,
    age: Math.floor(age),
    imageUri: imageDataUrl,
    preferences,
  };

  const userText = buildQwenUserPrompt(input.age, genderZh(input.gender));
  const dashBody = {
    model: QWEN_VL_MODEL,
    messages: [
      { role: 'system', content: QWEN_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: userText },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 6000,
  };

  let res: Response;
  let rawText: string;
  try {
    res = await fetch(`${DASHSCOPE_COMPAT_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dashBody),
    });
    rawText = await res.text();
  } catch {
    return c.json({ error: '连接百炼超时或网络异常，请稍后重试。' }, 502);
  }

  if (!res.ok) {
    let detail = '';
    try {
      const errJson = JSON.parse(rawText) as {
        error?: { message?: string };
        message?: string;
      };
      detail = errJson?.error?.message || errJson?.message || '';
    } catch {
      detail = rawText.slice(0, 160);
    }
    if (res.status === 401 || res.status === 403) {
      return c.json({ error: '分析服务密钥无效或无权限' }, 502);
    }
    return c.json(
      {
        error: detail
          ? `百炼返回错误（${res.status}）：${detail}`
          : `百炼返回错误（${res.status}）`,
      },
      502,
    );
  }

  let content: string | unknown = '';
  try {
    const json = JSON.parse(rawText) as {
      choices?: Array<{ message?: { content?: unknown } }>;
      output?: { choices?: Array<{ message?: { content?: unknown } }> };
    };
    content =
      json?.choices?.[0]?.message?.content ??
      json?.output?.choices?.[0]?.message?.content ??
      '';
    if (Array.isArray(content)) {
      content = content
        .map((item: { text?: string }) => item.text || '')
        .join('\n');
    }
  } catch {
    return c.json({ error: '百炼响应解析失败' }, 502);
  }

  if (!content || typeof content !== 'string') {
    return c.json({ error: '模型未返回有效内容' }, 502);
  }

  let payload;
  try {
    payload = parseLlmJson(content);
  } catch (error) {
    if (error instanceof ReportValidationError) {
      return c.json({ error: '报告内容未通过检查，请重新分析。' }, 422);
    }
    return c.json({ error: '报告内容无法读取，请重新分析。' }, 422);
  }

  const result = mapLlmPayloadToResult(payload, input, {
    engine: 'qwen',
    model_id: QWEN_VL_MODEL,
    market: 'cn',
  });

  return c.json({ result, usedEngine: 'qwen' as const });
});

app.all('*', (c) => c.json({ error: 'Not found' }, 404));

export default app;
