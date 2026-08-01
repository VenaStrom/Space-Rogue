import type { HullDef, ShipFit } from "../types";
import { CH_SLP } from "./republic/ch-slp";

export * from "./republic";

export const HULLS: ReadonlyMap<string, HullDef> = new Map(
  [CH_SLP].map((hull) => [hull.id, hull]),
);

export function getHullDef(id: string): HullDef | null {
  return HULLS.get(id) ?? null;
}

export function isHullId(value: unknown): value is string {
  return typeof value === "string" && HULLS.has(value);
}

/** A fresh fit for a hull: every slot empty, pristine hull. */
export function emptyFit(hull: HullDef): ShipFit {
  return { hullId: hull.id, equipped: hull.slots.map(() => null), hullHp: 1 };
}
