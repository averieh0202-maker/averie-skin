/**
 * DashScope / 百炼 vision call — model qwen3-vl-plus.
 * Keys from app.config extra only; never hardcode secrets.
 */
import { AnalysisInput, AnalysisResult, Gender } from '../types/analysis';
import { DASHSCOPE_COMPAT_BASE, QWEN_VL_MODEL, getDashScopeApiKey } from './config';
import {
  QWEN_RETRY_CONSTRAINT,
  QWEN_SYSTEM_PROMPT,
  buildQwenUserPrompt,
} from './llmSchema';
import { mapLlmPayloadToResult, parseLlmJson } from './mapLlmToResult';
import {
  ReportValidationError,
  validationErrorCode,
} from './reportValidation';
import { MAX_IMAGE_DATA_URL_LENGTH, prepareImageDataUrl } from './imageDataUrl';

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

export class QwenAnalyzeError extends Error {
  code?: string;
  retry?: boolean;
  constructor(
    message: string,
    opts?: { code?: string; retry?: boolean },
  ) {
    super(message);
    this.name = 'QwenAnalyzeError';
    this.code = opts?.code;
    this.retry = opts?.retry;
  }
}

async function callDashScopeContent(
  apiKey: string,
  imageRef: string,
  userText: string,
  systemPrompt: string,
): Promise<string> {
  const body = {
    model: QWEN_VL_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
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
  return content;
}

function runParseAndMap(
  content: string,
  input: AnalysisInput,
): AnalysisResult {
  const payload = parseLlmJson(content);
  return mapLlmPayloadToResult(payload, input, {
    engine: 'qwen',
    model_id: QWEN_VL_MODEL,
    market: 'cn',
  });
}

function throwValidationToUser(error: ReportValidationError): never {
  const code = validationErrorCode(error.issues);
  throw new QwenAnalyzeError(`报告内容未通过检查（${code}），请再试一次。`, {
    code,
    retry: true,
  });
}

/**
 * Call DashScope OpenAI-compatible chat completions with qwen3-vl-plus.
 * Retries once with a stricter constraint on ReportValidationError.
 */
export async function analyzeWithQwen(input: AnalysisInput): Promise<AnalysisResult> {
  const apiKey = getDashScopeApiKey();
  if (!apiKey) {
    throw new QwenAnalyzeError('未配置 DashScope API Key，请检查本地 .env');
  }

  let imageRef: string;
  try {
    imageRef = await prepareImageDataUrl(input.imageUri);
  } catch (err) {
    if (err instanceof Error && err.message === 'IMAGE_PROCESS_FAILED') {
      throw new QwenAnalyzeError('照片处理失败，请重拍一张正面照再试');
    }
    throw new QwenAnalyzeError('无法读取自拍图片，请重拍或换一张再试');
  }

  // After silent compress, still over cap → friendly retake message (never ask to pick a smaller file).
  if (imageRef.startsWith('data:') && imageRef.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new QwenAnalyzeError('照片处理失败，请重拍一张正面照再试');
  }

  const baseUser = buildQwenUserPrompt(input.age, genderZh(input.gender));

  try {
    const content = await callDashScopeContent(
      apiKey,
      imageRef,
      baseUser,
      QWEN_SYSTEM_PROMPT,
    );
    return runParseAndMap(content, input);
  } catch (error) {
    if (!(error instanceof ReportValidationError)) throw error;

    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        '[validate]',
        JSON.stringify({
          issues: error.issues.slice(0, 30),
          count: error.issues.length,
        }),
      );
    }

    try {
      const content = await callDashScopeContent(
        apiKey,
        imageRef,
        `${baseUser}\n${QWEN_RETRY_CONSTRAINT}`,
        `${QWEN_SYSTEM_PROMPT}\n${QWEN_RETRY_CONSTRAINT}`,
      );
      return runParseAndMap(content, input);
    } catch (retryError) {
      if (retryError instanceof ReportValidationError) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn(
            '[validate]',
            JSON.stringify({
              issues: retryError.issues.slice(0, 30),
              count: retryError.issues.length,
            }),
          );
        }
        throwValidationToUser(retryError);
      }
      throw retryError;
    }
  }
}
