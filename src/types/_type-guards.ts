import { Route } from "./_consts";

function isStandardObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    console.info(`Value is not an object: ${value}`);
    return false;
  }
  if (Array.isArray(value)) {
    console.info(`Value is an array, not a standard object: ${value}`);
    return false;
  }
  return true;
}

type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
type JSONArray = JSONValue[];
interface JSONObject {
  [key: string]: JSONValue;
};

export function isRoute(value: JSONValue): value is Route {
  if (typeof value !== "string") {
    console.info(`Value is not a string: ${value}`);
    return false;
  }
  if (!Object.values(Route).includes(value as Route)) {
    console.info(`Value is not a valid Route: ${value}`);
    return false;
  }
  return true;
}