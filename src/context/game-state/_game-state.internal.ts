import { createContext } from "react";
import type { ShipLoadout } from "../../types";

export const defaultPlayerShip: ShipLoadout = {
  hullVertices: [
    { x: 67,    y: 0     },
    { x: -26.05, y: -35.95 },
    { x: -33,   y: -25   },
    { x: -33,   y: 25    },
    { x: -26.05, y: 35.95 },
  ],
  weaponSlots: [
    { type: "weapon", item: null, hardpoint: { x: -5.03,  y: 18.76  } },
    { type: "weapon", item: null, hardpoint: { x: -5.03,  y: -18.76 } },
    { type: "weapon", item: null, hardpoint: { x: -20.22, y: -22.82 } },
    { type: "weapon", item: null, hardpoint: { x: -20.22, y: 22.82  } },
    { type: "weapon", item: null, hardpoint: { x: 9.92,   y: -14.63 } },
    { type: "weapon", item: null, hardpoint: { x: 9.92,   y: 14.63  } },
  ],
  thrusterSlots: [
    { type: "thruster", item: null, hardpoint: { x: -33.69, y: -16.29 } },
    { type: "thruster", item: null, hardpoint: { x: -33.69, y: 16.29  } },
    { type: "thruster", item: null, hardpoint: { x: -37.76, y: -5.31  } },
    { type: "thruster", item: null, hardpoint: { x: -37.76, y: 5.31   } },
  ],
  miscSlots: [
    { type: "misc", item: null, hardpoint: { x: 37.31, y: 0 } },
    { type: "misc", item: null, hardpoint: { x: 50.81, y: 0 } },
    { type: "misc", item: null, hardpoint: { x: 23.91, y: 0 } },
    { type: "misc", item: null, hardpoint: { x: 10.14, y: 0 } },
  ],
  commandSlots: [],
  powerSlots: [],
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
