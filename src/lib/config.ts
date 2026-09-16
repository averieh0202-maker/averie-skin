import Constants from 'expo-constants';
import { AnalyzerEngine } from '../types/analysis';

type Extra = {
  useMock?: string;
  analyzerMarket?: string;
  analyzeApiUrl?: string;
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

/** Backend analyze proxy base URL (no trailing slash). Empty = not configured. */
export function getAnalyzeApiUrl(): string {
  return (extra().analyzeApiUrl?.trim() ?? '').replace(/\/$/, '');
}

export function hasAnalyzeApi(): boolean {
  return getAnalyzeApiUrl().length > 0;
}

/** DashScope / 百炼 key — Expo Go test-only if EXPO_PUBLIC_* */
export function getDashScopeApiKey(): string {
  const k = extra().dashscopeApiKey?.trim() ?? '';
  return k;
}

export function hasDashScopeKey(): boolean {
  return getDashScopeApiKey().length > 0;
}

/** Public / production: API URL; local Expo Go: client key. */
export function isAnalyzeConfigured(): boolean {
  return hasAnalyzeApi() || hasDashScopeKey();
}

/**
 * Env default engine:
 * - EXPO_PUBLIC_USE_MOCK=1 → mock
 * - EXPO_PUBLIC_USE_MOCK=0 + (API URL or client key) + market cn → qwen
 * - else mock
 */
export function getEnvDefaultEngine(): AnalyzerEngine {
  const useMock = (extra().useMock ?? '1') !== '0';
  if (useMock) return 'mock';
  if (getAnalyzerMarket() === 'cn' && isAnalyzeConfigured()) return 'qwen';
  return 'mock';
}

export const DASHSCOPE_COMPAT_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export const QWEN_VL_MODEL = 'qwen3-vl-plus';
