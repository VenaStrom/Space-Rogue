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

export type SlotType = "weapon" | "thruster" | "misc";

/**
 * A single equipment slot on the player's ship.
 * `item` will become `ItemId | null` once items are implemented.
 */
export type Slot = {
  type: SlotType;
  item: null;
  /** Ship-local coordinates of this mounting point (forward = +x, centroid at origin). */
  hardpoint: V2;
};

export type ShipLoadout = {
  /** Polygon vertices in ship-local space (forward = +x, centroid at origin). */
  hullVertices: V2[];
  /** 6 forward-facing weapon hardpoints. */
  weaponSlots: Slot[];
  /** 4 engine/thruster bays. */
  thrusterSlots: Slot[];
  /** 2 miscellaneous utility slots. */
  miscSlots: Slot[];
};
