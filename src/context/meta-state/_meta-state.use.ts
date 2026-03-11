import { useContext } from "react";
import { MetaStateContext } from "./_meta-state.internal";

export function useMetaState() {
  const context = useContext(MetaStateContext);
  if (!context) {
    throw new Error("useMetaState must be used within a MetaStateProvider");
  }
  return context;
}