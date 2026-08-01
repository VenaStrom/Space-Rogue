import { useEffect, useReducer } from "react";
import type { RunScreen, RunState } from "../../types";
import { clearSave, loadRun, saveRun } from "../../save";
import { RunStateContext, runReducer, type RunStoreState } from "./run-state.internal";

function initStore(): RunStoreState {
  const saved = loadRun();
  return saved ? { phase: "active", run: saved } : { phase: "menu", run: null };
}

export function RunStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(runReducer, undefined, initStore);

  // Save-anywhere: every active-run change persists immediately.
  useEffect(() => {
    if (state.phase === "active") saveRun(state.run);
  }, [state]);

  const startRun = () => dispatch({ type: "start", seed: Math.floor(Math.random() * 2 ** 31) });
  const abandonRun = () => {
    clearSave();
    dispatch({ type: "abandon" });
  };
  const die = () => {
    clearSave();
    dispatch({ type: "die" });
  };
  const backToMenu = () => dispatch({ type: "back-to-menu" });
  const setScreen = (screen: RunScreen) => dispatch({ type: "set-screen", screen });
  const patchRun = (patch: Partial<Omit<RunState, "ship">>) => dispatch({ type: "patch", patch });

  return <RunStateContext.Provider value={{
    phase: state.phase,
    run: state.run,
    startRun,
    abandonRun,
    die,
    backToMenu,
    setScreen,
    patchRun,
  }}>
    {children}
  </RunStateContext.Provider>;
}
