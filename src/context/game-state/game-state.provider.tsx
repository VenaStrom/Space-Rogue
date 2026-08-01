import { useState } from "react";
import type { HullDef } from "../../types";
import { defaultGameStateContext, GameStateContext } from "./game-state.internal";

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState(0);
  const [hull, setHull] = useState<HullDef>(defaultGameStateContext.hull);
  const [equipped, setEquipped] = useState<(string | null)[]>(defaultGameStateContext.equipped);
  const [inventory, setInventory] = useState<string[]>(defaultGameStateContext.inventory);

  const incrementTime = () => {
    setTime((prev) => prev + 1);
  };

  return <GameStateContext.Provider value={{
    time,
    incrementTime,
    hull,
    setHull,
    equipped,
    setEquipped,
    inventory,
    setInventory,
  }}>
    {children}
  </GameStateContext.Provider>;
}
