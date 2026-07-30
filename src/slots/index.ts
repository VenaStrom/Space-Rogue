import { BasicThrusterSlot } from "./thruster/basic-thruster";
import { BasicWeaponSlot } from "./weapon/basic-weapon";

export * from "./weapon/basic-weapon";
export * from "./thruster/basic-thruster";
export * from "./slot-item";

export const ALL_SLOTS = {
  [BasicWeaponSlot.id]: BasicWeaponSlot,
  [BasicThrusterSlot.id]: BasicThrusterSlot,
} as const;