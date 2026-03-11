import { createContext } from "react";

export type GameStateContextType = {
  time: number;
  incrementTime: () => void;
};
export const defaultGameStateContext: GameStateContextType = {
  time: 0,
  incrementTime: () => {},
};
export const GameStateContext = createContext<GameStateContextType>(defaultGameStateContext);