import { useContext } from "react";
import { GameStateContext } from "./_game-state.internal";

export default function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error("useGameState must be used within a GameStateProvider");
  }
  return context;
}