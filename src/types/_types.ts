import type { SlotItem } from "../slots";
import type { SlotType } from "./_consts";

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONArray = JSONValue[];
export type JSONObject = {
  [key: string]: JSONValue;
};

export type V2 = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * A single equipment slot on the player's ship.
 */
export type Slot = {
  type: SlotType;
  item: SlotItem | SlotItem["id"] | null;
  /** Ship-local coordinates of this mounting point (forward = +x, centroid at origin). */
  hardpoint: V2;
};

export type ShipLoadout = {
  /** Polygon vertices in ship-local space (forward = +x, centroid at origin). */
  hullVertices: V2[];
  weaponSlots: Slot[];
  thrusterSlots: Slot[];
  miscSlots: Slot[];
  commandSlots: Slot[];
  powerSlots: Slot[];
};
