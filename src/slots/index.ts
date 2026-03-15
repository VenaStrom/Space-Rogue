import { BasicThrusterSlot } from "./thruster/_basic-thruster";
import { BasicWeaponSlot } from "./weapon/_basic-weapon";

export * from "./weapon/_basic-weapon";
export * from "./thruster/_basic-thruster";
export * from "./_slot-item";

export const ALL_SLOTS = {
  [BasicWeaponSlot.id]: BasicWeaponSlot,
  [BasicThrusterSlot.id]: BasicThrusterSlot,
} as const;