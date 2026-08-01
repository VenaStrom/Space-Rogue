import type { Grade, ItemCategory } from "../types";

type BaseItemDef = {
  id: string;
  name: string;
  /** Role/kind within the category, e.g. "gun" for weapons, "brawler" for thrusters. */
  subcategory: string;
  mass: number;
  maxHealth: number;
  /** Power the item needs from its slot's hookup (and, later, the reactor). */
  powerDraw: number;
  /** Plain-language grade per stat, shown as the primary rating in UI. */
  grades?: Record<string, Grade>;
};

export type ThrusterStats = {
  thrust: number;
  /** Radians per second. */
  maxTurnRate: number;
  trailLength: number;
  trailWidth: number;
  /** "r, g, b" — alpha is composed at render time. */
  trailColor: string;
};

export type WeaponStats = {
  /** Placeholder until weapons fire (MVP Phase 1). */
  damage: number;
};

export type ThrusterDef = BaseItemDef & {
  category: typeof ItemCategory.Thruster;
  stats: ThrusterStats;
};

export type WeaponDef = BaseItemDef & {
  category: typeof ItemCategory.Weapon;
  stats: WeaponStats;
};

/** Categories that don't have typed stats yet (shield, reactor, command, drive). */
export type GenericItemDef = BaseItemDef & {
  category: Exclude<ItemCategory, typeof ItemCategory.Thruster | typeof ItemCategory.Weapon>;
  stats: Record<string, number | string | boolean>;
};

export type ItemDef = ThrusterDef | WeaponDef | GenericItemDef;
