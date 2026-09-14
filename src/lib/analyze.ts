/**
 * Analyzer router
 * - cn: qwen3-vl-plus (DashScope) → fallback Mock
 * - overseas: scaffold only → Mock for now
 * Default remains Mock so the app runs without keys.
 */
import {
  AnalysisInput,
  AnalysisResult,
  AnalyzerEngine,
} from '../types/analysis';
import { analyzeSkin as mockAnalyze } from './mockAnalyzer';
import { analyzeWithQwen, QwenAnalyzeError } from './qwenAnalyzer';
import { getAnalyzerMarket, resolveEngine } from './config';

export type AnalyzeOutcome = {
  result: AnalysisResult;
  /** Friendly message when we fell back or warned */
  notice?: string;
  usedEngine: 'mock' | 'qwen';
};

/**
 * Run analysis with preferred engine.
 * On Qwen failure → friendly notice + Mock result (meta.fallback_reason set).
 */
export async function analyzeSkinRouted(
  input: AnalysisInput,
  preferred: AnalyzerEngine = 'auto',
): Promise<AnalyzeOutcome> {
  const engine = resolveEngine(preferred);
  const market = getAnalyzerMarket();

  if (engine === 'qwen' && market === 'cn') {
    try {
      const result = await analyzeWithQwen(input);
      return { result, usedEngine: 'qwen' };
    } catch (e) {
      const msg =
        e instanceof QwenAnalyzeError
          ? e.message
          : '智能分析暂时不可用，已改用演示结果';
      const result = mockAnalyze(input);
      result.meta.fallback_reason = msg;
      result.meta.engine = 'mock';
      result.meta.model_id = 'mock-analyzer-v1.4';
      return {
        result,
        usedEngine: 'mock',
        notice: `${msg}。已为你切换到 Mock 演示结果。`,
      };
    }
  }

  // overseas / mock / no key
  if (preferred === 'qwen' && market === 'overseas') {
    const result = mockAnalyze(input);
    return {
      result,
      usedEngine: 'mock',
      notice: '海外模型路由尚未接通，已使用 Mock 演示。',
    };
  }

  return { result: mockAnalyze(input), usedEngine: 'mock' };
}

export { mockAnalyze };
