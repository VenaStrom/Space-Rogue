import { createContext } from "react";
import { Route } from "../../types"

export type MetaStateContextType = {
  route: Route;
  setRoute: React.Dispatch<React.SetStateAction<Route>>;
};
export const defaultMetaStateContext: MetaStateContextType = {
  route: Route.home,
  setRoute: () => { },
};
export const MetaStateContext = createContext<MetaStateContextType>(defaultMetaStateContext);