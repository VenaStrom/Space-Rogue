import type { MapNode, RunState, SectorMap, ShipFit } from "../types";
import { NodeKind, isObj, isRunScreen, isV2 } from "../types";
import { getHullDef, isHullId } from "../ships";
import { isItemId } from "../items";
import { isFactionId } from "../factions";

const SAVE_KEY = "space-rogue.save.v2";

function isNodeKind(value: unknown): value is NodeKind {
  return typeof value === "string" && Object.values(NodeKind).includes(value as NodeKind);
}

function parseMapNode(raw: unknown): MapNode | null {
  if (!isObj(raw)) return null;
  if (typeof raw.id !== "number" || !isV2(raw.pos) || !isNodeKind(raw.kind)) return null;
  if (!Array.isArray(raw.links) || !raw.links.every((l): l is number => typeof l === "number")) return null;
  if (typeof raw.cleared !== "boolean") return null;
  const node: MapNode = {
    id: raw.id,
    pos: raw.pos,
    kind: raw.kind,
    links: raw.links,
    cleared: raw.cleared,
    // Tolerant defaults so pre-intel saves keep working
    enemies: typeof raw.enemies === "number" ? raw.enemies : (raw.kind === NodeKind.Combat ? 2 : 0),
    faction: isFactionId(raw.faction) ? raw.faction
      : raw.kind === NodeKind.Combat ? "outlaws"
        : raw.kind === NodeKind.Station ? "traders"
          : null,
  };
  if (Array.isArray(raw.stock)) node.stock = raw.stock.filter(isItemId);
  return node;
}

function parseSectorMap(raw: unknown): SectorMap | null {
  if (!isObj(raw) || !Array.isArray(raw.nodes) || typeof raw.current !== "number") return null;
  const nodes = raw.nodes.map(parseMapNode);
  if (nodes.some(n => n === null) || nodes.length === 0) return null;
  if (!nodes.some(n => n!.id === raw.current)) return null;
  return { nodes: nodes as MapNode[], current: raw.current };
}

/**
 * Validate a parsed save into a RunState, or reject it. Unknown item ids are
 * dropped (the pool may have changed between versions); a missing hull rejects
 * the whole save.
 */
export function parseRunState(raw: unknown): RunState | null {
  if (!isObj(raw)) return null;
  const { seed, sector, credits, visas, screen, ship, cargo, map, alert } = raw;

  if (typeof seed !== "number" || typeof sector !== "number") return null;
  if (typeof credits !== "number" || typeof visas !== "number") return null;
  if (!isRunScreen(screen)) return null;
  if (!isObj(ship) || !isHullId(ship.hullId) || !Array.isArray(ship.equipped)) return null;
  if (typeof ship.hullHp !== "number") return null;
  if (!Array.isArray(cargo)) return null;
  if (typeof alert !== "boolean") return null;

  const hull = getHullDef(ship.hullId);
  if (hull === null) return null;

  const parsedMap = parseSectorMap(map);
  if (parsedMap === null) return null;

  // Normalize the fit to the hull's slot count; drop unknown/ill-typed ids.
  const rawEquipped: unknown[] = ship.equipped;
  const equipped: ShipFit["equipped"] = hull.slots.map((_, i) => {
    const id = rawEquipped[i];
    return isItemId(id) ? id : null;
  });

  return {
    seed,
    sector,
    credits,
    visas,
    screen,
    ship: {
      hullId: ship.hullId,
      equipped,
      hullHp: Math.max(0.01, Math.min(1, ship.hullHp)),
    },
    cargo: cargo.filter(isItemId),
    map: parsedMap,
    alert,
  };
}

export function saveRun(run: RunState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, run }));
  } catch (e) {
    console.error("Failed to save run:", e);
  }
}

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isObj(parsed) || parsed.version !== 1) return null;
    return parseRunState(parsed.run);
  } catch (e) {
    console.error("Failed to load run:", e);
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.error("Failed to clear save:", e);
  }
}
