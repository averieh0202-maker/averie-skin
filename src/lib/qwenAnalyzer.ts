/**
 * DashScope / 百炼 vision call — model qwen3-vl-plus.
 * Keys from app.config extra only; never hardcode secrets.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { AnalysisInput, AnalysisResult, Gender } from '../types/analysis';
import { DASHSCOPE_COMPAT_BASE, QWEN_VL_MODEL, getDashScopeApiKey } from './config';
import { QWEN_SYSTEM_PROMPT, buildQwenUserPrompt } from './llmSchema';
import { mapLlmPayloadToResult, parseLlmJson } from './mapLlmToResult';
import { ReportValidationError } from './reportValidation';

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

async function imageUriToDataUrl(uri: string): Promise<string> {
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

export class QwenAnalyzeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QwenAnalyzeError';
  }
}

/**
 * Call DashScope OpenAI-compatible chat completions with qwen3-vl-plus.
 */
export async function analyzeWithQwen(input: AnalysisInput): Promise<AnalysisResult> {
  const apiKey = getDashScopeApiKey();
  if (!apiKey) {
    throw new QwenAnalyzeError('未配置 DashScope API Key，请检查本地 .env');
  }

  let imageRef: string;
  try {
    imageRef = await imageUriToDataUrl(input.imageUri);
  } catch {
    throw new QwenAnalyzeError('无法读取自拍图片，请重拍或换一张再试');
  }

  // Reject oversized payloads; never truncate image data.
  if (imageRef.startsWith('data:') && imageRef.length > 1_800_000) {
    throw new QwenAnalyzeError('图片过大，请换一张更小的自拍后再试');
  }

  const userText = buildQwenUserPrompt(input.age, genderZh(input.gender));

  const body = {
    model: QWEN_VL_MODEL,
    messages: [
      { role: 'system', content: QWEN_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageRef } },
          { type: 'text', text: userText },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 6000,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  let res: Response;
  let rawText: string;
  try {
    res = await fetch(`${DASHSCOPE_COMPAT_BASE}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    rawText = await res.text();
  } catch {
    throw new QwenAnalyzeError('连接超时或网络异常，请稍后重试。');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let detail = '';
    try {
      const errJson = JSON.parse(rawText);
      detail = errJson?.error?.message || errJson?.message || '';
    } catch {
      detail = rawText.slice(0, 160);
    }
    if (res.status === 401 || res.status === 403) {
      throw new QwenAnalyzeError('API Key 无效或无权限，请检查本地 .env');
    }
    throw new QwenAnalyzeError(
      detail
        ? `百炼返回错误（${res.status}）：${detail}`
        : `百炼返回错误（${res.status}）`,
    );
  }

  let content = '';
  try {
    const json = JSON.parse(rawText);
    content =
      json?.choices?.[0]?.message?.content ??
      json?.output?.choices?.[0]?.message?.content ??
      '';
    if (Array.isArray(content)) {
      content = content
        .map((c: { text?: string; type?: string }) => c.text || '')
        .join('\n');
    }
  } catch {
    throw new QwenAnalyzeError('百炼响应解析失败');
  }

  if (!content || typeof content !== 'string') {
    throw new QwenAnalyzeError('模型未返回有效内容');
  }

  let payload;
  try {
    payload = parseLlmJson(content);
  } catch (error) {
    if (error instanceof ReportValidationError)
      throw new QwenAnalyzeError('报告内容未通过检查，请重新分析。');
    throw new QwenAnalyzeError('报告内容无法读取，请重新分析。');
  }

  return mapLlmPayloadToResult(payload, input, {
    engine: 'qwen',
    model_id: QWEN_VL_MODEL,
    market: 'cn',
  });
}
