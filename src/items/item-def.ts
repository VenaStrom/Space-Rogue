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
  /** Damage per projectile. */
  damage: number;
  /** Seconds between trigger pulls (a whole burst counts as one pull). */
  cooldown: number;
  /** World units per second. */
  projectileSpeed: number;
  /** Seconds a projectile lives; range ≈ projectileSpeed × lifetime. */
  lifetime: number;
  /** Full firing-cone angle in degrees, centered on ship forward. */
  arc: number;
  /** Shots per trigger pull (1 = single shot). */
  burst: number;
  /** Seconds between shots within a burst. */
  burstInterval: number;
};

export type ShieldStats = {
  capacity: number;
  /** Points per second, once charging. */
  chargeRate: number;
  /** Seconds after the last hit before charging resumes. */
  chargeDelay: number;
};

export type ThrusterDef = BaseItemDef & {
  category: typeof ItemCategory.Thruster;
  stats: ThrusterStats;
};

export type WeaponDef = BaseItemDef & {
  category: typeof ItemCategory.Weapon;
  stats: WeaponStats;
};

export type ShieldDef = BaseItemDef & {
  category: typeof ItemCategory.Shield;
  stats: ShieldStats;
};

/** Categories that don't have typed stats yet (reactor, command, drive). */
export type GenericItemDef = BaseItemDef & {
  category: Exclude<
    ItemCategory,
    typeof ItemCategory.Thruster | typeof ItemCategory.Weapon | typeof ItemCategory.Shield
  >;
  stats: Record<string, number | string | boolean>;
};

export type ItemDef = ThrusterDef | WeaponDef | ShieldDef | GenericItemDef;
