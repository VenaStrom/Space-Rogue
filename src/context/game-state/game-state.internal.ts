import { createContext } from "react";
import type { HullDef } from "../../types";
import { CH_SLP, emptyFit } from "../../ships";

/**
 * Dev-sandbox ship state: the live-editable hull (the ship editor mutates its
 * geometry/slots directly, which is why this holds a HullDef rather than a
 * hull id), the equipped item ids (parallel to hull.slots), and an inventory
 * of item ids. Run-scoped state lives in RunState instead.
 */
export type GameStateContextType = {
  time: number;
  incrementTime: () => void;
  hull: HullDef;
  setHull: React.Dispatch<React.SetStateAction<HullDef>>;
  equipped: (string | null)[];
  setEquipped: React.Dispatch<React.SetStateAction<(string | null)[]>>;
  inventory: string[];
  setInventory: React.Dispatch<React.SetStateAction<string[]>>;
};

const defaultInventory: string[] = [
  "basic-thruster",
  "basic-weapon",
  "burst-blaster",
  "basic-shield",
  "gunner-cockpit",
  "field-bridge",
  "tactical-bridge",
];

// Pre-filled fit so the dev Combat view is instantly a fight:
// 4 autocannons + 2 burst blasters, full thrusters, shield, drive, reroute reactor.
const defaultEquipped: (string | null)[] = emptyFit(CH_SLP).equipped.map((_, i) => {
  if (i <= 3) return "basic-weapon";
  if (i <= 5) return "burst-blaster";
  if (i <= 9) return "basic-thruster";
  if (i === 10) return "basic-shield";
  if (i === 11) return "stable-drive";
  if (i === 14) return "basic-cockpit";
  if (i === 16) return "relay-reactor";
  return null;
});

export const defaultGameStateContext: GameStateContextType = {
  time: 0,
  incrementTime: () => { /* empty */ },
  hull: CH_SLP,
  setHull: () => { /* empty */ },
  equipped: defaultEquipped,
  setEquipped: () => { /* empty */ },
  inventory: defaultInventory,
  setInventory: () => { /* empty */ },
};

export const GameStateContext = createContext<GameStateContextType>(defaultGameStateContext);
