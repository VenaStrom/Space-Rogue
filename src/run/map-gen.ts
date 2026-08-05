import { FactionId, NodeKind, type MapNode, type SectorMap } from "../types";
import { deriveSeed, mulberry32 } from "../rng";
import { ITEM_DEFS } from "../items";

/** Baseline raider pack size for a sector (before per-node variance). */
export function sectorPackSize(sector: number): number {
  return Math.min(2 + Math.floor((sector - 1) / 1.5), 5);
}

const NODE_COUNT_MIN = 10;
const NODE_COUNT_SPAN = 4;

/**
 * Generate a sector: nodes scattered left-to-right, start on the far left,
 * the exit gate on the far right, everything connected. Deterministic per
 * (runSeed, sector).
 */
export function generateSectorMap(runSeed: number, sector: number): SectorMap {
  const rand = mulberry32(deriveSeed(runSeed, sector));
  const count = NODE_COUNT_MIN + Math.floor(rand() * (NODE_COUNT_SPAN + 1));

  // Positions: jittered columns so the map reads left → right
  const positions = Array.from({ length: count }, (_, i) => ({
    x: (i / (count - 1)) * 0.9 + 0.05 + (i === 0 || i === count - 1 ? 0 : (rand() - 0.5) * 0.06),
    y: i === 0 || i === count - 1 ? 0.5 : 0.12 + rand() * 0.76,
  }));

  // Kinds: start empty, gate last; the rest weighted
  const kinds: NodeKind[] = positions.map((_, i) => {
    if (i === 0) return NodeKind.Empty;
    if (i === count - 1) return NodeKind.Gate;
    const roll = rand();
    if (roll < 0.45) return NodeKind.Combat;
    if (roll < 0.65) return NodeKind.Station;
    return NodeKind.Empty;
  });

  // Links: chain everything (guarantees connectivity), then sprinkle shortcuts
  const links: Set<number>[] = positions.map(() => new Set<number>());
  const connect = (a: number, b: number) => {
    if (a === b) return;
    links[a].add(b);
    links[b].add(a);
  };
  for (let i = 1; i < count; i++) {
    // Chain to one of up to two previous nodes, keeping the graph loosely layered
    const back = i === 1 ? 1 : 1 + Math.floor(rand() * 2);
    connect(i, i - back);
  }
  const shortcuts = 2 + Math.floor(rand() * 3);
  for (let s = 0; s < shortcuts; s++) {
    const a = Math.floor(rand() * count);
    const near = positions
      .map((p, id) => ({ id, d: Math.hypot(p.x - positions[a].x, p.y - positions[a].y) }))
      .filter(({ id }) => id !== a && !links[a].has(id))
      .sort((m, n) => m.d - n.d)[0];
    if (near !== undefined && near.d < 0.35) connect(a, near.id);
  }

  const nodes: MapNode[] = positions.map((pos, id) => {
    const kind = kinds[id];
    const packJitter = rand() < 0.25 ? -1 : rand() > 0.75 ? 1 : 0;
    const node: MapNode = {
      id,
      pos,
      kind,
      links: [...links[id]].sort((a, b) => a - b),
      cleared: kind !== NodeKind.Combat,
      enemies: kind === NodeKind.Combat
        ? Math.max(1, Math.min(5, sectorPackSize(sector) + packJitter))
        : 0,
      faction: kind === NodeKind.Combat ? FactionId.Outlaws
        : kind === NodeKind.Station ? FactionId.Traders
          : null,
    };
    if (node.kind === NodeKind.Station) {
      // 4 shop picks, seeded; buying removes them for good
      node.stock = Array.from({ length: 4 }, () => ITEM_DEFS[Math.floor(rand() * ITEM_DEFS.length)].id);
    }
    return node;
  });

  return { nodes, current: 0 };
}
