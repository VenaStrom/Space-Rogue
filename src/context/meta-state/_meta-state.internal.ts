import { createContext } from "react";
import type { Route } from "../../types";
import { config } from "../../config";

export type MetaStateContextType = {
  route: Route;
  setRoute: React.Dispatch<React.SetStateAction<Route>>;
};
export const defaultMetaStateContext: MetaStateContextType = {
  route: config.defaultRoute,
  setRoute: () => { /* empty */ },
};
export const MetaStateContext = createContext<MetaStateContextType>(defaultMetaStateContext);