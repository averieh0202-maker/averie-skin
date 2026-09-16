import { AnalysisInput, AnalysisResult, AnalyzerEngine } from '../types/analysis';
import { analyzeSkin as mockAnalyze } from './mockAnalyzer';
import { analyzeWithQwen, QwenAnalyzeError } from './qwenAnalyzer';
import {
  getAnalyzeApiUrl,
  getAnalyzerMarket,
  hasAnalyzeApi,
  hasDashScopeKey,
} from './config';
import { MAX_IMAGE_DATA_URL_LENGTH, imageUriToDataUrl } from './imageDataUrl';

export type AnalyzeOutcome = {
  result: AnalysisResult;
  usedEngine: 'mock' | 'qwen';
};

async function analyzeViaApi(input: AnalysisInput): Promise<AnalysisResult> {
  const base = getAnalyzeApiUrl();
  let imageDataUrl: string;
  try {
    imageDataUrl = await imageUriToDataUrl(input.imageUri);
  } catch {
    throw new QwenAnalyzeError('无法读取自拍图片，请重拍或换一张再试');
  }
  if (imageDataUrl.startsWith('data:') && imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new QwenAnalyzeError('图片过大，请换一张更小的自拍后再试');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  let res: Response;
  let rawText: string;
  try {
    res = await fetch(`${base}/analyze`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gender: input.gender,
        age: input.age,
        imageDataUrl,
        preferences: input.preferences,
      }),
    });
    rawText = await res.text();
  } catch {
    throw new QwenAnalyzeError('连接超时或网络异常，请稍后重试。');
  } finally {
    clearTimeout(timeout);
  }

  let parsed: { result?: AnalysisResult; error?: string } = {};
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new QwenAnalyzeError(
      res.ok ? '分析服务响应无法解析' : `分析服务错误（${res.status}）`,
    );
  }

  if (!res.ok) {
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
