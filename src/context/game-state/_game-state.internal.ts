import { createContext } from "react";
import type { ShipLoadout, Slot, SlotType } from "../../types";

function emptySlots(type: SlotType, count: number): Slot[] {
  return Array.from({ length: count }, () => ({ type, item: null }));
}

export const defaultPlayerShip: ShipLoadout = {
  weaponSlots: emptySlots("weapon", 6),
  thrusterSlots: emptySlots("thruster", 4),
  miscSlots: emptySlots("misc", 2),
};

export type GameStateContextType = {
  time: number;
  incrementTime: () => void;
  playerShip: ShipLoadout;
  setPlayerShip: React.Dispatch<React.SetStateAction<ShipLoadout>>;
};

export const defaultGameStateContext: GameStateContextType = {
  time: 0,
  incrementTime: () => { },
  playerShip: defaultPlayerShip,
  setPlayerShip: () => { },
};

export const GameStateContext = createContext<GameStateContextType>(defaultGameStateContext);
