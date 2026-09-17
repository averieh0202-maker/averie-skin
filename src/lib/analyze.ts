import { AnalysisInput, AnalysisResult, AnalyzerEngine } from '../types/analysis';
import { analyzeSkin as mockAnalyze } from './mockAnalyzer';
import { analyzeWithQwen, QwenAnalyzeError } from './qwenAnalyzer';
import {
  getAnalyzeApiUrl,
  getAnalyzerMarket,
  hasAnalyzeApi,
  hasDashScopeKey,
} from './config';
import {
  MAX_IMAGE_BLOB_BYTES,
  prepareImageJpegBlob,
} from './imageDataUrl';

export type AnalyzeOutcome = {
  result: AnalysisResult;
  usedEngine: 'mock' | 'qwen';
};

async function analyzeViaApi(input: AnalysisInput): Promise<AnalysisResult> {
  const base = getAnalyzeApiUrl();
  let imageBlob: Blob;
  try {
    imageBlob = await prepareImageJpegBlob(input.imageUri);
  } catch (err) {
    if (err instanceof Error && err.message === 'IMAGE_PROCESS_FAILED') {
      throw new QwenAnalyzeError('照片处理失败，请重拍一张正面照再试');
    }
    throw new QwenAnalyzeError('无法读取自拍图片，请重拍或换一张再试');
  }
  if (imageBlob.size > MAX_IMAGE_BLOB_BYTES) {
    throw new QwenAnalyzeError('照片处理失败，请重拍一张正面照再试');
  }

  const form = new FormData();
  form.append('image', imageBlob, 'selfie.jpg');
  form.append(
    'meta',
    JSON.stringify({
      gender: input.gender,
      age: input.age,
      preferences: input.preferences,
    }),
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  let res: Response;
  let rawText: string;
  try {
    res = await fetch(`${base}/analyze`, {
      method: 'POST',
      signal: controller.signal,
      // Do not set Content-Type — browser/RN sets multipart boundary.
      body: form,
    });
    rawText = await res.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new QwenAnalyzeError(
        '分析超时，请换稳定网络后重试（通常需 1–2 分钟）',
      );
    }
    if (
      error instanceof TypeError ||
      (error instanceof Error && /failed to fetch/i.test(error.message))
    ) {
      throw new QwenAnalyzeError('网络异常，请检查网络后重试');
    }
    throw new QwenAnalyzeError('请求失败，请稍后重试');
  } finally {
    clearTimeout(timeout);
  }

  let parsed: {
    result?: AnalysisResult;
    error?: string;
    code?: string;
    retry?: boolean;
  } = {};
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new QwenAnalyzeError(
      res.ok ? '分析服务响应无法解析' : `分析服务错误（${res.status}）`,
    );
  }

  if (!res.ok) {
    if (parsed.code) {
      throw new QwenAnalyzeError(
        `报告内容未通过检查（${parsed.code}），请再试一次。`,
        { code: parsed.code, retry: parsed.retry },
      );
    }
    // Prefer server error text for 502/504 and other statuses.
    throw new QwenAnalyzeError(
      parsed.error?.trim() || `分析服务错误（${res.status}）`,
    );
  }
  if (!parsed.result) {
    throw new QwenAnalyzeError('分析服务未返回有效结果');
  }
  return parsed.result;
}

/** Only explicit demo mode yields demo data. Live failure must not become a fabricated report. */
export async function analyzeSkinRouted(
  input: AnalysisInput,
  preferred: AnalyzerEngine = 'auto',
): Promise<AnalyzeOutcome> {
  if (preferred === 'mock') return { result: mockAnalyze(input), usedEngine: 'mock' };
  if (getAnalyzerMarket() !== 'cn')
    throw new QwenAnalyzeError('当前地区的分析服务尚未接通，请稍后再试。');

  if (hasAnalyzeApi()) {
    return { result: await analyzeViaApi(input), usedEngine: 'qwen' };
  }
  if (hasDashScopeKey()) {
    return { result: await analyzeWithQwen(input), usedEngine: 'qwen' };
  }
  throw new QwenAnalyzeError('分析服务尚未配置。可返回首页查看示例报告。');
}
export { mockAnalyze };
