import type { RunState, ShipFit } from "../types";
import { isObj, isRunScreen } from "../types";
import { getHullDef, isHullId } from "../ships";
import { isItemId } from "../items";

const SAVE_KEY = "space-rogue.save.v1";

/**
 * Validate a parsed save into a RunState, or reject it. Unknown item ids are
 * dropped (the pool may have changed between versions); a missing hull rejects
 * the whole save.
 */
export function parseRunState(raw: unknown): RunState | null {
  if (!isObj(raw)) return null;
  const { seed, sector, credits, visas, screen, ship, cargo } = raw;

  if (typeof seed !== "number" || typeof sector !== "number") return null;
  if (typeof credits !== "number" || typeof visas !== "number") return null;
  if (!isRunScreen(screen)) return null;
  if (!isObj(ship) || !isHullId(ship.hullId) || !Array.isArray(ship.equipped)) return null;
  if (!Array.isArray(cargo)) return null;

  const hull = getHullDef(ship.hullId);
  if (hull === null) return null;

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
    ship: { hullId: ship.hullId, equipped },
    cargo: cargo.filter(isItemId),
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
