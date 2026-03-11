import { createContext } from "react";
import { Route } from "../../types"
import { config } from "../../config";

export type MetaStateContextType = {
  route: Route;
  setRoute: React.Dispatch<React.SetStateAction<Route>>;
};
export const defaultMetaStateContext: MetaStateContextType = {
  route: config.defaultRoute,
  setRoute: () => { },
};
export const MetaStateContext = createContext<MetaStateContextType>(defaultMetaStateContext);