import type { ItemCategory, NodeKind, RunScreen } from "./consts";

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
 * A mounting point on a hull. What fits is gated two ways: the item's category
 * must be accepted, and its powerDraw must be at most the slot's powerRating.
 */
export type HullSlotDef = {
  accepts: ItemCategory[];
  /** Power hookup quality, 1 (weak) – 3 (anything fits). */
  powerRating: number;
  /** Ship-local coordinates of this mounting point (forward = +x, centroid at origin). */
  hardpoint: V2;
};

/** A ship hull: geometry plus mounting points. Authored data, never mutated during a run. */
export type HullDef = {
  id: string;
  name: string;
  faction: string;
  /** Polygon vertices in ship-local space (forward = +x, centroid at origin). */
  vertices: V2[];
  slots: HullSlotDef[];
  cargoCapacity: number;
};

/** The player ship within a run: a hull reference plus equipped item ids, parallel to `HullDef.slots`. */
export type ShipFit = {
  hullId: string;
  equipped: (string | null)[];
  /** Persistent hull integrity, 0..1. Damage survives between fights; repairs cost credits. */
  hullHp: number;
};

/** One system on the sector map. */
export type MapNode = {
  id: number;
  /** Layout position in [0,1]², start at low x, gate at high x. */
  pos: V2;
  kind: NodeKind;
  /** Node ids reachable in one jump (undirected). */
  links: number[];
  cleared: boolean;
  /** Station shop stock (item ids); purchases remove entries. */
  stock?: string[];
};

export type SectorMap = {
  nodes: MapNode[];
  /** Node id the ship is currently at. */
  current: number;
};

/** Everything a run is. Fully serializable — this is exactly what gets saved. */
export type RunState = {
  seed: number;
  sector: number;
  credits: number;
  visas: number;
  screen: RunScreen;
  ship: ShipFit;
  /** Item ids in the cargo hold. */
  cargo: string[];
  map: SectorMap;
  /** True after an illegal jump: the authorities are waiting at the current node. */
  alert: boolean;
};
