import { Route, ItemCategory, RunScreen } from "./consts";
import type { JSONValue, V2 } from "./types";

export function isObj(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    console.info(`Value is not an object: ${String(value)}`);
    return false;
  }
  if (Array.isArray(value)) {
    console.info(`Value is an array, not a standard object: ${value.toString()}`);
    return false;
  }
  return true;
}

export function isV2(value: unknown): value is V2 {
  return isObj(value) && typeof value.x === "number" && typeof value.y === "number";
}

export function isRoute(value: JSONValue): value is Route {
  if (typeof value !== "string") {
    console.info(`Value is not a string: ${JSON.stringify(value)}`);
    return false;
  }
  if (!Object.values(Route).includes(value as Route)) {
    console.info(`Value is not a valid Route: ${value}`);
    return false;
  }
  return true;
}

export function isItemCategory(value: unknown): value is ItemCategory {
  return typeof value === "string" && Object.values(ItemCategory).includes(value as ItemCategory);
}

export function isRunScreen(value: unknown): value is RunScreen {
  return typeof value === "string" && Object.values(RunScreen).includes(value as RunScreen);
}
