import { createContext } from "react";
import type { RunState, RunScreen } from "../../types";
import { RunScreen as RunScreenConst } from "../../types";
import { CH_SLP, emptyFit } from "../../ships";

/** Lifecycle: menu → active (map | refit | arena) → dead → menu. */
export type RunPhase = "menu" | "active" | "dead";

export type RunStoreState =
  | { phase: "menu"; run: null }
  | { phase: "active" | "dead"; run: RunState };

export type RunAction =
  | { type: "start"; seed: number }
  | { type: "abandon" }
  | { type: "die" }
  | { type: "back-to-menu" }
  | { type: "set-screen"; screen: RunScreen }
  | { type: "patch"; patch: Partial<Omit<RunState, "ship">> };

const STARTING_CREDITS = 200;
const STARTING_VISAS = 3;

export function newRun(seed: number): RunState {
  return {
    seed,
    sector: 1,
    credits: STARTING_CREDITS,
    visas: STARTING_VISAS,
    screen: RunScreenConst.Map,
    ship: emptyFit(CH_SLP),
    cargo: [],
  };
}

export function runReducer(state: RunStoreState, action: RunAction): RunStoreState {
  switch (action.type) {
    case "start": {
      return { phase: "active", run: newRun(action.seed) };
    }
    case "abandon":
    case "back-to-menu": {
      return { phase: "menu", run: null };
    }
    case "die": {
      if (state.phase !== "active") return state;
      return { phase: "dead", run: state.run };
    }
    case "set-screen": {
      if (state.phase !== "active") return state;
      return { phase: "active", run: { ...state.run, screen: action.screen } };
    }
    case "patch": {
      if (state.phase !== "active") return state;
      return { phase: "active", run: { ...state.run, ...action.patch } };
    }
    default: {
      return state;
    }
  }
}

export type RunStateContextType = {
  phase: RunPhase;
  run: RunState | null;
  startRun: () => void;
  abandonRun: () => void;
  die: () => void;
  backToMenu: () => void;
  setScreen: (screen: RunScreen) => void;
  patchRun: (patch: Partial<Omit<RunState, "ship">>) => void;
};

export const defaultRunStateContext: RunStateContextType = {
  phase: "menu",
  run: null,
  startRun: () => { /* empty */ },
  abandonRun: () => { /* empty */ },
  die: () => { /* empty */ },
  backToMenu: () => { /* empty */ },
  setScreen: () => { /* empty */ },
  patchRun: () => { /* empty */ },
};

export const RunStateContext = createContext<RunStateContextType>(defaultRunStateContext);
