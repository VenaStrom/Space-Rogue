import { createContext } from "react";
import type { ShipLoadout, Slot, SlotType, V2 } from "../../types";

function makeSlots(type: SlotType, hardpoints: ReadonlyArray<V2>): Slot[] {
  return hardpoints.map(hardpoint => ({ type, item: null, hardpoint }));
}

// Default triangle hull: nose (67,0), starboard wing (-33,-25), port wing (-33,25)
// Ship-local space: forward = +x, centroid at origin, +y = port (screen-down)
const DEFAULT_HULL: V2[] = [
  { x: 67, y: 0 },
  { x: -33, y: -25 },
  { x: -33, y: 25 },
];

export const defaultPlayerShip: ShipLoadout = {
  hullVertices: DEFAULT_HULL,
  weaponSlots: makeSlots("weapon", [
    { x: 54, y: -9 }, { x: 54, y: 9 },
    { x: 25, y: -16 }, { x: 25, y: 16 },
    { x: -2, y: -10 }, { x: -2, y: 10 },
  ]),
  thrusterSlots: makeSlots("thruster", [
    { x: -32, y: -20 }, { x: -32, y: 20 },
    { x: -30, y: -7 }, { x: -30, y: 7 },
  ]),
  miscSlots: makeSlots("misc", [
    { x: 12, y: -5 }, { x: 12, y: 5 },
  ]),
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
