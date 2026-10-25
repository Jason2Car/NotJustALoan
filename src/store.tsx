import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { seedState } from './seed';
import type { AppState } from './types';

const KEY = 'njal-state-v5'; // v2: groups gained `arrangement`, users gained `finances`; v3: expanded repayment history; v4: cleaned record wording; v5: verification value renamed to 'verified'

/** Storage is behind load/save so a backend can replace localStorage later. */
const load = (): AppState => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch { /* fall through to seed data */ }
  return seedState();
};
const save = (s: AppState) => {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
};

interface Store {
  state: AppState;
  /** Mutate a cloned copy of state; the result is persisted. */
  update: (fn: (draft: AppState) => void) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => save(state), [state]);
  const update = useCallback((fn: (d: AppState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);
  const reset = useCallback(() => setState(seedState()), []);
  const value = useMemo(() => ({ state, update, reset }), [state, update, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
