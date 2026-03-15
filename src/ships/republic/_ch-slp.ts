import type { ShipLoadout } from "../../types";
import { BasicThrusterSlot } from "../../slots";

export const CH_SLPShip: ShipLoadout = {
  hullVertices: [
    { x: 67, y: 0 },
    { x: -26.05, y: -35.95 },
    { x: -33, y: -25 },
    { x: -33, y: 25 },
    { x: -26.05, y: 35.95 },
  ],
  weaponSlots: [
    { type: "weapon", item: null, hardpoint: { x: -4.25, y: 18.76 } },
    { type: "weapon", item: null, hardpoint: { x: -4.25, y: -18.76 } },
    { type: "weapon", item: null, hardpoint: { x: -16.32, y: -22.56 } },
    { type: "weapon", item: null, hardpoint: { x: -16.32, y: 22.56 } },
    { type: "weapon", item: null, hardpoint: { x: 7.58, y: -14.11 } },
    { type: "weapon", item: null, hardpoint: { x: 7.58, y: 14.11 } },
  ],
  thrusterSlots: [
    { type: "thruster", item: new BasicThrusterSlot(), hardpoint: { x: -31.35, y: -17.07 } },
    { type: "thruster", item: new BasicThrusterSlot(), hardpoint: { x: -31.35, y: 17.07 } },
    { type: "thruster", item: new BasicThrusterSlot(), hardpoint: { x: -33.08, y: -7.13 } },
    { type: "thruster", item: new BasicThrusterSlot(), hardpoint: { x: -33.08, y: 7.13 } },
  ],
  miscSlots: [
    { type: "misc", item: null, hardpoint: { x: 37.31, y: 0 } },
    { type: "misc", item: null, hardpoint: { x: 50.81, y: 0 } },
    { type: "misc", item: null, hardpoint: { x: 23.91, y: 0 } },
    { type: "misc", item: null, hardpoint: { x: 10.14, y: 0 } },
  ],
  commandSlots: [
    { type: "command", item: null, hardpoint: { x: -16.09, y: -3.13 } },
    { type: "command", item: null, hardpoint: { x: -16.09, y: 3.13 } },
  ],
  powerSlots: [
    { type: "power", item: null, hardpoint: { x: -4.38, y: 0 } },
  ],
};