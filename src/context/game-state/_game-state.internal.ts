import { createContext } from "react";

export type GameStateContextType = {

};
export const defaultGameStateContext: GameStateContextType = {

};
export const GameStateContext = createContext<GameStateContextType>(defaultGameStateContext);