export const Route = {
  Menu: "menu",
  Run: "run",
  Workshop: "workshop",
  ShipEditor: "ship-editor",
  Combat: "combat",
  Map: "map",
} as const;
export type Route = typeof Route[keyof typeof Route];

/** Top-level item taxonomy. Slots accept one or more of these. */
export const ItemCategory = {
  Weapon: "weapon",
  Thruster: "thruster",
  Shield: "shield",
  Reactor: "reactor",
  Command: "command",
  Drive: "drive",
} as const;
export type ItemCategory = typeof ItemCategory[keyof typeof ItemCategory];

/** The control styles a command item can grant. */
export const CommandKind = {
  Cockpit: "cockpit",
  Bridge: "bridge",
} as const;
export type CommandKind = typeof CommandKind[keyof typeof CommandKind];

/** Plain-language stat grades ("dumb terms, numbers for the nerds"). */
export const Grade = {
  Bad: "bad",
  Poor: "poor",
  Fine: "fine",
  Good: "good",
  Super: "super",
} as const;
export type Grade = typeof Grade[keyof typeof Grade];

/** Which screen of an active run is showing. */
export const RunScreen = {
  Map: "map",
  Refit: "refit",
  Arena: "arena",
} as const;
export type RunScreen = typeof RunScreen[keyof typeof RunScreen];
