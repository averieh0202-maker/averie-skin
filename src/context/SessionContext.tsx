import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { AnalysisResult, Gender, SessionState } from '../types/analysis';
import { analyzeSkin } from '../lib/mockAnalyzer';

interface SessionContextValue extends SessionState {
  setGender: (g: Gender) => void;
  setAge: (age: number) => void;
  setImageUri: (uri: string) => void;
  runAnalysis: () => AnalysisResult | null;
  unlock: () => void;
  /** Full reset — starting over means paying again next time */
  resetSession: () => void;
}

const initial: SessionState = {
  gender: null,
  age: null,
  imageUri: null,
  result: null,
  unlocked: false,
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

  const runAnalysis = useCallback(() => {
    let next: AnalysisResult | null = null;
    setState((s) => {
      if (s.gender == null || s.age == null || !s.imageUri) return s;
      next = analyzeSkin({
        gender: s.gender,
        age: s.age,
        imageUri: s.imageUri,
      });
      // New analysis always starts locked — one-time unlock per analysis
      return { ...s, result: next, unlocked: false };
    });
    return next;
  }, []);

  const unlock = useCallback(() => {
    setState((s) => ({ ...s, unlocked: true }));
  }, []);

  const resetSession = useCallback(() => {
    setState(initial);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setGender,
      setAge,
      setImageUri,
      runAnalysis,
      unlock,
      resetSession,
    }),
    [state, setGender, setAge, setImageUri, runAnalysis, unlock, resetSession],
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
