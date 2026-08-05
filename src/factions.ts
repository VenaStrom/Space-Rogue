import { FactionId } from "./types";

/**
 * The one place faction identity lives. Any icon, ship tint, or map glyph
 * that belongs to a faction takes its color from here.
 */
export type FactionDef = {
  id: FactionId;
  name: string;
  /** Primary color for icons, glyphs, and highlights. */
  color: string;
  /** Muted variant for backgrounds and cleared/inactive states. */
  colorDim: string;
};

export const FACTIONS: Record<FactionId, FactionDef> = {
  [FactionId.Republic]: {
    id: FactionId.Republic,
    name: "The Republic",
    color: "#57c957",
    colorDim: "#2e6b2e",
  },
  [FactionId.Outlaws]: {
    id: FactionId.Outlaws,
    name: "Outlaws",
    color: "#e05a5a",
    colorDim: "#7a3434",
  },
  [FactionId.Authorities]: {
    id: FactionId.Authorities,
    name: "The Authorities",
    color: "#7aa2ff",
    colorDim: "#3d548c",
  },
  [FactionId.Traders]: {
    id: FactionId.Traders,
    name: "Free Traders",
    color: "#eab308",
    colorDim: "#8a6a05",
  },
};

export function isFactionId(value: unknown): value is FactionId {
  return typeof value === "string" && Object.values(FactionId).includes(value as FactionId);
}
