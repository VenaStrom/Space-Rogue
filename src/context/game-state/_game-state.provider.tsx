import { GameStateContext } from "./_game-state.internal";

export default function GameStateProvider({ children }: { children: React.ReactNode }) {
  return <GameStateContext.Provider value={{

  }}>
    {children}
  </GameStateContext.Provider>;
}