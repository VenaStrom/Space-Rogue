import { createContext } from "react";
import type { RunState, RunScreen } from "../../types";
import { NodeKind, RunScreen as RunScreenConst } from "../../types";
import { CH_SLP, emptyFit } from "../../ships";
import { generateSectorMap } from "../../run/map-gen";

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
  | { type: "jump"; nodeId: number }
  | { type: "patch"; patch: Partial<RunState> };

const STARTING_CREDITS = 200;
const STARTING_VISAS = 3;

/** The Gunner starter kit: cockpit + guns, ready to fly. */
const STARTER_EQUIPPED: (string | null)[] = [
  "basic-weapon", "basic-weapon", null, null, null, null,
  "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
  "basic-shield", "stable-drive", null, null, "basic-cockpit", null, "static-reactor",
];

export function newRun(seed: number): RunState {
  return {
    seed,
    sector: 1,
    credits: STARTING_CREDITS,
    visas: STARTING_VISAS,
    screen: RunScreenConst.Map,
    ship: { ...emptyFit(CH_SLP), equipped: [...STARTER_EQUIPPED] },
    cargo: [],
    map: generateSectorMap(seed, 1),
    alert: false,
  };
}

/**
 * Execute a jump. Legal jumps spend a visa; jumping dry summons the
 * authorities at the destination. Landing on the gate advances the sector.
 * Landing on an uncleared combat node (or with the authorities inbound)
 * routes straight to the arena.
 */
function jump(run: RunState, nodeId: number): RunState {
  const from = run.map.nodes.find(n => n.id === run.map.current);
  const to = run.map.nodes.find(n => n.id === nodeId);
  if (!from || !to || !from.links.includes(nodeId)) return run;

  const legal = run.visas > 0;
  const visas = legal ? run.visas - 1 : run.visas;
  const alert = !legal;

  if (to.kind === NodeKind.Gate) {
    // Through the gate: next sector, record wiped — even the authorities don't follow
    return {
      ...run,
      visas,
      alert: false,
      sector: run.sector + 1,
      map: generateSectorMap(run.seed, run.sector + 1),
      screen: RunScreenConst.Map,
    };
  }

  const intoCombat = alert || (to.kind === NodeKind.Combat && !to.cleared);
  return {
    ...run,
    visas,
    alert,
    map: { ...run.map, current: nodeId },
    screen: intoCombat ? RunScreenConst.Arena : RunScreenConst.Map,
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
    case "jump": {
      if (state.phase !== "active") return state;
      return { phase: "active", run: jump(state.run, action.nodeId) };
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
  jumpTo: (nodeId: number) => void;
  patchRun: (patch: Partial<RunState>) => void;
};

export const defaultRunStateContext: RunStateContextType = {
  phase: "menu",
  run: null,
  startRun: () => { /* empty */ },
  abandonRun: () => { /* empty */ },
  die: () => { /* empty */ },
  backToMenu: () => { /* empty */ },
  setScreen: () => { /* empty */ },
  jumpTo: () => { /* empty */ },
  patchRun: () => { /* empty */ },
};

export const RunStateContext = createContext<RunStateContextType>(defaultRunStateContext);
