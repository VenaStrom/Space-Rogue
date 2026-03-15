import { createContext } from "react";
import type { ShipLoadout } from "../../types";
import { CH_SLPShip } from "../../ships/republic";

export type GameStateContextType = {
  time: number;
  incrementTime: () => void;
  playerShip: ShipLoadout;
  setPlayerShip: React.Dispatch<React.SetStateAction<ShipLoadout>>;
};

export const defaultGameStateContext: GameStateContextType = {
  time: 0,
  incrementTime: () => { },
  playerShip: { ...CH_SLPShip },
  setPlayerShip: () => { },
};

export const GameStateContext = createContext<GameStateContextType>(defaultGameStateContext);
