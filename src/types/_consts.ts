export const Route = {
  workshop: "workshop",
  shipEditor: "ship-editor",
  combat: "combat",
  map: "map",
} as const;
export type Route = typeof Route[keyof typeof Route];

export const SlotType = {
  weapon: "weapon",
  thruster: "thruster",
  misc: "misc",
  command: "command",
  power: "power",
} as const;
export type SlotType = typeof SlotType[keyof typeof SlotType];
