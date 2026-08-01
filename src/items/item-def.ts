import type { CommandKind, Grade, ItemCategory } from "../types";

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

export type ReactorStats = {
  /** Power points available to feed the ship's total draw. */
  output: number;
  /** Whether this reactor supports live power rerouting (a later-game feature). */
  allowReroute: boolean;
};

export type DriveStats = {
  /** Seconds to full jump charge at a full power feed. */
  chargeTime: number;
  /** Whether the drive can charge while hostiles are present (stable jump tech). */
  chargeInCombat: boolean;
};

export type CommandStats = {
  /** Cockpit = direct piloting; bridge = orders (nav points + focus target). */
  kind: CommandKind;
  /** Whether manual weapon control is allowed — the flavor axis traded for buffs. */
  manualFire: boolean;
  /** Max queued nav points (bridge quality); 0 for cockpits. */
  navPoints: number;
  weaponBonus: number;
  shieldBonus: number;
  engineBonus: number;
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

export type ReactorDef = BaseItemDef & {
  category: typeof ItemCategory.Reactor;
  stats: ReactorStats;
};

export type DriveDef = BaseItemDef & {
  category: typeof ItemCategory.Drive;
  stats: DriveStats;
};

export type CommandDef = BaseItemDef & {
  category: typeof ItemCategory.Command;
  stats: CommandStats;
};

export type ItemDef = ThrusterDef | WeaponDef | ShieldDef | ReactorDef | DriveDef | CommandDef;
