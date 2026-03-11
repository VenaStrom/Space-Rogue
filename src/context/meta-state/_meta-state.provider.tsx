import { useState } from "react";
import { Route } from "../../types";
import { MetaStateContext } from "./_meta-state.internal";

export function MetaStateProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>(Route.workshop);

  return <MetaStateContext.Provider value={{
    route,
    setRoute,
  }}>
    {children}
  </MetaStateContext.Provider>;
}