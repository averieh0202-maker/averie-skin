import Constants from 'expo-constants';
import { AnalyzerEngine } from '../types/analysis';

type Extra = {
  useMock?: string;
  analyzerMarket?: string;
  dashscopeApiKey?: string;
  deepseekApiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

export function getAnalyzerMarket(): 'cn' | 'overseas' {
  const m = (extra().analyzerMarket || 'cn').toLowerCase();
  return m === 'overseas' ? 'overseas' : 'cn';
}

/** DashScope / 百炼 key — Expo Go test-only if EXPO_PUBLIC_* */
export function getDashScopeApiKey(): string {
  const k = extra().dashscopeApiKey?.trim() ?? '';
  return k;
}

export function hasDashScopeKey(): boolean {
  return getDashScopeApiKey().length > 0;
}

/**
 * Env default engine:
 * - EXPO_PUBLIC_USE_MOCK=1 → mock
 * - EXPO_PUBLIC_USE_MOCK=0 + key + market cn → qwen
 * - else mock
 */
export function getEnvDefaultEngine(): AnalyzerEngine {
  const useMock = (extra().useMock ?? '1') !== '0';
  if (useMock) return 'mock';
  if (getAnalyzerMarket() === 'cn' && hasDashScopeKey()) return 'qwen';
  return 'mock';
}

export const DASHSCOPE_COMPAT_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export const QWEN_VL_MODEL = 'qwen3-vl-plus';
