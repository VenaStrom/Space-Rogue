import { useContext } from "react";
import { RunStateContext } from "./run-state.internal";

export function useRunState() {
  const context = useContext(RunStateContext);
  if (!context) {
    throw new Error("useRunState must be used within a RunStateProvider");
  }
  return context;
}
