export const Route = {
  home: "home",
} as const;
export type Route = typeof Route[keyof typeof Route];