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
  "basic-thruster",
  "basic-thruster",
  "basic-thruster",
  "basic-weapon",
  "basic-weapon",
];

export const defaultGameStateContext: GameStateContextType = {
  time: 0,
  incrementTime: () => { /* empty */ },
  hull: CH_SLP,
  setHull: () => { /* empty */ },
  equipped: emptyFit(CH_SLP).equipped,
  setEquipped: () => { /* empty */ },
  inventory: defaultInventory,
  setInventory: () => { /* empty */ },
};

export const GameStateContext = createContext<GameStateContextType>(defaultGameStateContext);
