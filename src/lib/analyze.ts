import { AnalysisInput, AnalysisResult, AnalyzerEngine } from '../types/analysis';
import { analyzeSkin as mockAnalyze } from './mockAnalyzer';
import { analyzeWithQwen, QwenAnalyzeError } from './qwenAnalyzer';
import { getAnalyzerMarket, hasDashScopeKey } from './config';
export type AnalyzeOutcome = {
  result: AnalysisResult;
  usedEngine: 'mock' | 'qwen';
};
/** Only explicit demo mode yields demo data. Live failure must not become a fabricated report. */
export async function analyzeSkinRouted(
  input: AnalysisInput,
  preferred: AnalyzerEngine = 'auto',
): Promise<AnalyzeOutcome> {
  if (preferred === 'mock') return { result: mockAnalyze(input), usedEngine: 'mock' };
  if (getAnalyzerMarket() !== 'cn')
    throw new QwenAnalyzeError('当前地区的分析服务尚未接通，请稍后再试。');
  if (!hasDashScopeKey())
    throw new QwenAnalyzeError('分析服务尚未配置。可返回首页查看示例报告。');
  return { result: await analyzeWithQwen(input), usedEngine: 'qwen' };
}
export { mockAnalyze };
