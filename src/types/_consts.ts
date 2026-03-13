export const Route = {
  workshop: "workshop",
  shipEditor: "ship-editor",
  combat: "combat",
  map: "map",
} as const;
export type Route = typeof Route[keyof typeof Route];