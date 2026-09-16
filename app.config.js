/**
 * Expo app config — reads env at build/start time into Constants.expoConfig.extra.
 * Never commit a real `.env`; copy from `.env.example` locally.
 * @see https://docs.expo.dev/guides/environment-variables/
 */
const appJson = require('./app.json');

/** @param {string | undefined} v */
function flag(v, fallback = '1') {
  if (v == null || v === '') return fallback;
  return v;
}

module.exports = ({ config }) => ({
  ...appJson.expo,
  ...config,
  extra: {
    ...(appJson.expo.extra || {}),
    /** '1' = force Mock. '0' = prefer Qwen when API URL or key present. */
    useMock: flag(process.env.EXPO_PUBLIC_USE_MOCK, '1'),
    /** 'cn' | 'overseas' */
    analyzerMarket: process.env.EXPO_PUBLIC_ANALYZER_MARKET || 'cn',
    /**
     * DashScope / 百炼 API key for qwen3-vl-plus (CN).
     * Prefer EXPO_PUBLIC_DASHSCOPE_API_KEY for Expo Go client-direct testing ONLY.
     * Also accepts DASHSCOPE_API_KEY. Never commit real keys. Production → backend proxy.
     */
    /**
     * Cloudflare Worker analyze API base URL (no trailing slash).
     * Public gh-pages builds set EXPO_PUBLIC_ANALYZE_API_URL; leave empty for local mock-only.
     */
    analyzeApiUrl: process.env.EXPO_PUBLIC_ANALYZE_API_URL || '',
    dashscopeApiKey:
      process.env.EXPO_PUBLIC_DASHSCOPE_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      '',
    /** Optional legacy / overseas scaffolding keys (unused by CN Qwen path). */
    deepseekApiKey:
      process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || '',
    geminiApiKey:
      process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
    openaiApiKey:
      process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
  },
});
