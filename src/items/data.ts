import { ItemCategory } from "../types";
import type { ItemDef } from "./item-def";

/**
 * The frozen item pool. Hand-curated data — the dev-time generator (post-MVP)
 * emits entries in this shape.
 */
export const ITEM_DEFS: ItemDef[] = [
  {
    id: "basic-thruster",
    name: "Basic Thruster",
    category: ItemCategory.Thruster,
    subcategory: "brawler",
    mass: 5,
    maxHealth: 10,
    powerDraw: 1,
    stats: {
      thrust: 1,
      maxTurnRate: Math.PI / 2,
      trailLength: 20,
      trailWidth: 5,
      trailColor: "128, 216, 255",
    },
  },
  {
    id: "basic-weapon",
    name: "Autocannon",
    category: ItemCategory.Weapon,
    subcategory: "gun",
    mass: 5,
    maxHealth: 10,
    powerDraw: 1,
    stats: {
      damage: 4,
      cooldown: 0.3,
      projectileSpeed: 900,
      lifetime: 1.5,
      arc: 110,
      burst: 1,
      burstInterval: 0,
    },
  },
  {
    id: "burst-blaster",
    name: "Burst Blaster",
    category: ItemCategory.Weapon,
    subcategory: "burst",
    mass: 7,
    maxHealth: 10,
    powerDraw: 2,
    stats: {
      damage: 7,
      cooldown: 1.6,
      projectileSpeed: 750,
      lifetime: 1.2,
      arc: 130,
      burst: 3,
      burstInterval: 0.09,
    },
  },
  {
    id: "basic-shield",
    name: "Bubble Shield",
    category: ItemCategory.Shield,
    subcategory: "bubble",
    mass: 8,
    maxHealth: 12,
    powerDraw: 1,
    stats: {
      capacity: 45,
      chargeRate: 7,
      chargeDelay: 2.5,
    },
  },
];
