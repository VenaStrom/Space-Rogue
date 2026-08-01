import { ItemCategory, type HullDef } from "../../types";

const W = [ItemCategory.Weapon];
const T = [ItemCategory.Thruster];
const C = [ItemCategory.Command];
const R = [ItemCategory.Reactor];
/** Spine utility mounts: shields and jump drives compete for these. */
const U = [ItemCategory.Shield, ItemCategory.Drive];

export const CH_SLP: HullDef = {
  id: "ch-slp",
  name: "CH-SLP",
  faction: "republic",
  cargoCapacity: 12,
  vertices: [
    { x: 67, y: 0 },
    { x: -26.05, y: -35.95 },
    { x: -33, y: -25 },
    { x: -33, y: 25 },
    { x: -26.05, y: 35.95 },
  ],
  slots: [
    { accepts: W, powerRating: 2, hardpoint: { x: -4.25, y: 18.76 } },
    { accepts: W, powerRating: 2, hardpoint: { x: -4.25, y: -18.76 } },
    { accepts: W, powerRating: 2, hardpoint: { x: -16.32, y: -22.56 } },
    { accepts: W, powerRating: 2, hardpoint: { x: -16.32, y: 22.56 } },
    { accepts: W, powerRating: 2, hardpoint: { x: 7.58, y: -14.11 } },
    { accepts: W, powerRating: 2, hardpoint: { x: 7.58, y: 14.11 } },
    { accepts: T, powerRating: 2, hardpoint: { x: -31.35, y: -17.07 } },
    { accepts: T, powerRating: 2, hardpoint: { x: -31.35, y: 17.07 } },
    { accepts: T, powerRating: 2, hardpoint: { x: -33.08, y: -7.13 } },
    { accepts: T, powerRating: 2, hardpoint: { x: -33.08, y: 7.13 } },
    { accepts: U, powerRating: 2, hardpoint: { x: 37.31, y: 0 } },
    { accepts: U, powerRating: 1, hardpoint: { x: 50.81, y: 0 } },
    { accepts: U, powerRating: 2, hardpoint: { x: 23.91, y: 0 } },
    { accepts: U, powerRating: 1, hardpoint: { x: 10.14, y: 0 } },
    { accepts: C, powerRating: 2, hardpoint: { x: -16.09, y: -3.13 } },
    { accepts: C, powerRating: 2, hardpoint: { x: -16.09, y: 3.13 } },
    { accepts: R, powerRating: 3, hardpoint: { x: -4.38, y: 0 } },
  ],
};
