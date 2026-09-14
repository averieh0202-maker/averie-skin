import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  AnalysisResult,
  AnalyzerEngine,
  Gender,
  SessionState,
} from '../types/analysis';
import { analyzeSkinRouted } from '../lib/analyze';
import { getEnvDefaultEngine, hasDashScopeKey } from '../lib/config';

interface SessionContextValue extends SessionState {
  setGender: (g: Gender) => void;
  setAge: (age: number) => void;
  setImageUri: (uri: string) => void;
  setAnalyzerEngine: (e: AnalyzerEngine) => void;
  /** Async analysis; pass imageUri when state may not have flushed yet */
  runAnalysis: (opts?: {
    imageUri?: string;
  }) => Promise<{ result: AnalysisResult | null; notice?: string }>;
  unlock: () => void;
  /** Full reset — starting over means paying again next time */
  resetSession: () => void;
  hasDashScopeKey: boolean;
}

const initial: SessionState = {
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
        return { result: null };
      }

      const outcome = await analyzeSkinRouted(
        { gender, age, imageUri },
        state.analyzerEngine,
      );

      setState((s) => ({
        ...s,
        imageUri,
        result: outcome.result,
        unlocked: false,
      }));

      return { result: outcome.result, notice: outcome.notice };
    },
    [state.gender, state.age, state.imageUri, state.analyzerEngine],
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
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
