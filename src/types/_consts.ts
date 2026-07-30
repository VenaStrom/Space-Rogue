export const Route = {
  Workshop: "workshop",
  ShipEditor: "ship-editor",
  Combat: "combat",
  Map: "map",
} as const;
export type Route = typeof Route[keyof typeof Route];

export const SlotType = {
  Weapon: "weapon",
  Thruster: "thruster",
  Misc: "misc",
  Command: "command",
  Power: "power",
} as const;
export type SlotType = typeof SlotType[keyof typeof SlotType];
