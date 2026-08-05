import type { V2 } from "../types";
import { deriveSeed, mulberry32 } from "../rng";
import { sectorPackSize } from "./map-gen";

export type EncounterFit = {
  hullId: string;
  equipped: (string | null)[];
  pos: V2;
};

const pad = (ids: (string | null)[]): (string | null)[] => {
  const full = [...ids];
  while (full.length < 17) full.push(null);
  return full;
};

/** Raider fits by menace tier; sectors climb through these. */
const RAIDER_TIERS: (string | null)[][] = [
  // Tier 0: light — two guns, no shield
  pad(["basic-weapon", "basic-weapon", null, null, null, null,
    "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
    null, null, null, null, null, null, "static-reactor"]),
  // Tier 1: shielded
  pad(["basic-weapon", "basic-weapon", null, null, null, null,
    "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
    "basic-shield", null, null, null, null, null, "static-reactor"]),
  // Tier 2: burst-armed
  pad(["basic-weapon", "basic-weapon", null, null, "burst-blaster", "burst-blaster",
    "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
    "basic-shield", null, null, null, null, null, "static-reactor"]),
  // Tier 3: full kit on a relay reactor
  pad(["basic-weapon", "basic-weapon", "basic-weapon", "basic-weapon", "burst-blaster", "burst-blaster",
    "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
    "basic-shield", null, null, null, null, null, "relay-reactor"]),
];

/** The authorities do not lose. Flee. */
const AUTHORITY_FIT = pad([
  "basic-weapon", "basic-weapon", "basic-weapon", "basic-weapon", "burst-blaster", "burst-blaster",
  "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
  "basic-shield", "basic-shield", "basic-shield", "basic-shield", "field-bridge", null, "relay-reactor",
]);

function spawnRing(rand: () => number, count: number, center: V2, minDist: number): V2[] {
  return Array.from({ length: count }, () => {
    const angle = rand() * Math.PI * 2;
    const dist = minDist + rand() * 700;
    return {
      x: Math.max(300, Math.min(7700, center.x + Math.cos(angle) * dist)),
      y: Math.max(300, Math.min(7700, center.y + Math.sin(angle) * dist)),
    };
  });
}

/** Raider pack for a combat node; size and gear scale with the sector. */
export function raiderEncounter(runSeed: number, sector: number, nodeId: number, playerSpawn: V2, packSize?: number): EncounterFit[] {
  const rand = mulberry32(deriveSeed(runSeed, sector * 1000 + nodeId));
  const count = packSize ?? sectorPackSize(sector);
  const tier = Math.min(sector - 1, RAIDER_TIERS.length - 1);
  const positions = spawnRing(rand, count, playerSpawn, 1300);
  return positions.map((pos) => {
    // Mostly the sector's tier, occasionally one tier up for spice
    const t = Math.min(tier + (rand() < 0.2 ? 1 : 0), RAIDER_TIERS.length - 1);
    return { hullId: "ch-slp", equipped: [...RAIDER_TIERS[t]], pos };
  });
}

/** The response to an illegal jump: three flagship-grade ships. Unwinnable by design. */
export function authorityEncounter(runSeed: number, sector: number, playerSpawn: V2): EncounterFit[] {
  const rand = mulberry32(deriveSeed(runSeed, sector * 7777));
  return spawnRing(rand, 3, playerSpawn, 1100).map((pos) => ({
    hullId: "ch-slp",
    equipped: [...AUTHORITY_FIT],
    pos,
  }));
}
