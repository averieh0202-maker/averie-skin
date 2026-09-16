import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  AnalysisResult,
  AnalyzerEngine,
  Gender,
  CarePreferences,
  DEFAULT_PREFERENCES,
  SessionState,
} from '../types/analysis';
import { analyzeSkinRouted, mockAnalyze } from '../lib/analyze';
import { getEnvDefaultEngine, hasDashScopeKey } from '../lib/config';

interface SessionContextValue extends SessionState {
  setPreferences: (p: CarePreferences) => void;
  viewDemo: () => void;
  setGender: (g: Gender) => void;
  setAge: (age: number) => void;
  setImageUri: (uri: string) => void;
  setAnalyzerEngine: (e: AnalyzerEngine) => void;
  /** Async analysis; pass imageUri when state may not have flushed yet */
  runAnalysis: (opts?: { imageUri?: string }) => Promise<{ result: AnalysisResult }>;
  unlock: () => void;
  /** Full reset — starting over means paying again next time */
  resetSession: () => void;
  hasDashScopeKey: boolean;
}

const initial: SessionState = {
  preferences: DEFAULT_PREFERENCES,
  gender: null,
  age: null,
  imageUri: null,
  result: null,
  unlocked: false,
  analyzerEngine: getEnvDefaultEngine(),
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(initial);

  const setPreferences = useCallback(
    (preferences: CarePreferences) => setState((s) => ({ ...s, preferences })),
    [],
  );
  const viewDemo = useCallback(() => {
    const result = mockAnalyze({
      gender: 'female',
      age: 28,
      imageUri: 'demo',
      preferences: DEFAULT_PREFERENCES,
    });
    setState((s) => ({ ...s, result, unlocked: false }));
  }, []);
  const setGender = useCallback((g: Gender) => {
    setState((s) => ({ ...s, gender: g }));
  }, []);

  const setAge = useCallback((age: number) => {
    setState((s) => ({ ...s, age }));
  }, []);

  const setImageUri = useCallback((uri: string) => {
    setState((s) => ({ ...s, imageUri: uri }));
  }, []);

  const setAnalyzerEngine = useCallback((e: AnalyzerEngine) => {
    setState((s) => ({ ...s, analyzerEngine: e }));
  }, []);

  const runAnalysis = useCallback(
    async (opts?: { imageUri?: string }) => {
      const gender = state.gender;
      const age = state.age;
      const imageUri = opts?.imageUri ?? state.imageUri;
      if (gender == null || age == null || !imageUri) {
        throw new Error('请先完成基础信息并选择照片。');
      }

      const outcome = await analyzeSkinRouted(
        { gender, age, imageUri, preferences: state.preferences },
        state.analyzerEngine,
      );

      setState((s) => ({
        ...s,
        imageUri,
        result: outcome.result,
        unlocked: false,
      }));

      return { result: outcome.result };
    },
    [state.gender, state.age, state.imageUri, state.analyzerEngine, state.preferences],
  );

  const unlock = useCallback(() => {
    setState((s) => ({ ...s, unlocked: true }));
  }, []);

  const resetSession = useCallback(() => {
    setState({
      ...initial,
      analyzerEngine: state.analyzerEngine, // keep engine preference
    });
  }, [state.analyzerEngine]);

  const value = useMemo(
    () => ({
      ...state,
      setPreferences,
      viewDemo,
      setGender,
      setAge,
      setImageUri,
      setAnalyzerEngine,
      runAnalysis,
      unlock,
      resetSession,
      hasDashScopeKey: hasDashScopeKey(),
    }),
    [
      state,
      setGender,
      setAge,
      setImageUri,
      setAnalyzerEngine,
      runAnalysis,
      unlock,
      resetSession,
      setPreferences,
      viewDemo,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
