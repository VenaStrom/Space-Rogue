import { useState } from "react";
import { GameStateContext } from "./_game-state.internal";

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState(0);

  const incrementTime = () => {
    setTime((prev) => prev + 1);
  };

  return <GameStateContext.Provider value={{
    time,
    incrementTime,
  }}>
    {children}
  </GameStateContext.Provider>;
}