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
    name: "Basic Weapon",
    category: ItemCategory.Weapon,
    subcategory: "gun",
    mass: 5,
    maxHealth: 10,
    powerDraw: 1,
    stats: {
      damage: 1,
    },
  },
];
