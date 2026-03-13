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
};

export type ShipLoadout = {
  /** 6 forward-facing weapon hardpoints. */
  weaponSlots: Slot[];
  /** 4 engine/thruster bays. */
  thrusterSlots: Slot[];
  /** 2 miscellaneous utility slots. */
  miscSlots: Slot[];
};
