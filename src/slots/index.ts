import { BasicWeaponSlot } from "./weapon/_basic-weapon";

export * from "./weapon/_basic-weapon";
export * from "./thruster/_basic-thruster";
export * from "./_slot-item";

export const ALL_SLOTS = {
  [BasicWeaponSlot.id]: BasicWeaponSlot,
} as const;