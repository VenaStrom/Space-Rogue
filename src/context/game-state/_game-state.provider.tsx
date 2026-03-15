import { useState } from "react";
import type { ShipLoadout } from "../../types";
import { defaultGameStateContext, GameStateContext } from "./_game-state.internal";

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState(0);
  const [playerShip, setPlayerShip] = useState<ShipLoadout>(defaultGameStateContext.playerShip);

  const incrementTime = () => {
    setTime((prev) => prev + 1);
  };

  return <GameStateContext.Provider value={{
    time,
    incrementTime,
    playerShip,
    setPlayerShip,
  }}>
    {children}
  </GameStateContext.Provider>;
}
