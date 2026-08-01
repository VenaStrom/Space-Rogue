import { useState } from "react";
import type { Route } from "../../types";
import { config } from "../../config";
import { MetaStateContext } from "./meta-state.internal";

export function MetaStateProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>(config.defaultRoute);

  return <MetaStateContext.Provider value={{
    route,
    setRoute,
  }}>
    {children}
  </MetaStateContext.Provider>;
}