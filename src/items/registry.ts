import type { HullSlotDef } from "../types";
import { ITEM_DEFS } from "./data";
import type { ItemDef } from "./item-def";

const ITEMS: ReadonlyMap<string, ItemDef> = new Map(ITEM_DEFS.map((def) => [def.id, def]));

export function getItemDef(id: string): ItemDef | null {
  return ITEMS.get(id) ?? null;
}

export function isItemId(value: unknown): value is string {
  return typeof value === "string" && ITEMS.has(value);
}

/** Rehydrate a list of equipped/held item ids, dropping ids that no longer exist. */
export function resolveItems(ids: (string | null)[]): (ItemDef | null)[] {
  return ids.map((id) => (id === null ? null : getItemDef(id)));
}

/** Whether an item fits a slot: category accepted and power hookup sufficient. */
export function itemFitsSlot(item: ItemDef, slot: HullSlotDef): boolean {
  return slot.accepts.includes(item.category) && item.powerDraw <= slot.powerRating;
}
