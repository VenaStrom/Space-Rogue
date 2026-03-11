export const Route = {
  workshop: "workshop",
  combat: "combat",
  map: "map",
} as const;
export type Route = typeof Route[keyof typeof Route];