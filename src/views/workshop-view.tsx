import { useEffect, useRef, useState } from "react";
import { useGameState } from "../context/game-state";
import type { ItemCategory, HullDef, HullSlotDef, V2 } from "../types";
import { getItemDef, itemFitsSlot, type ItemDef } from "../items";

const PREVIEW_W = 800;
const PREVIEW_H = 400;
const SHIP_SCALE = 5;
const CX = PREVIEW_W / 2;
const CY = PREVIEW_H / 2;

function toCanvas(v: V2) {
  return { x: CX + v.x * SHIP_SCALE, y: CY + v.y * SHIP_SCALE };
}

/** Styling/label key for a slot: its sole accepted category, or "utility" for multi-accept mounts. */
type SlotKind = ItemCategory | "utility";

function slotKind(slot: HullSlotDef): SlotKind {
  return slot.accepts.length === 1 ? slot.accepts[0] : "utility";
}

const SLOT_BORDER_DIM: Record<SlotKind, string> = {
  weapon: "border-red-800",
  thruster: "border-blue-800",
  shield: "border-cyan-800",
  reactor: "border-yellow-800",
  command: "border-purple-800",
  drive: "border-emerald-800",
  utility: "border-gray-600",
};

const SLOT_BORDER_ACTIVE: Record<SlotKind, string> = {
  weapon: "border-red-500",
  thruster: "border-blue-500",
  shield: "border-cyan-400",
  reactor: "border-yellow-500",
  command: "border-purple-500",
  drive: "border-emerald-500",
  utility: "border-gray-400",
};

const SLOT_SHORT_LABEL: Record<SlotKind, string> = {
  weapon: "WPN",
  thruster: "THR",
  shield: "SHD",
  reactor: "RCT",
  command: "CMD",
  drive: "DRV",
  utility: "UTL",
};

const SLOT_FULL_LABEL: Record<SlotKind, string> = {
  weapon: "Weapon",
  thruster: "Thruster",
  shield: "Shield",
  reactor: "Reactor",
  command: "Command",
  drive: "Drive",
  utility: "Utility",
};

const HARDPOINT_COLOR: Record<SlotKind, string> = {
  weapon: "rgba(220, 80, 80, 0.9)",
  thruster: "rgba(80, 140, 220, 0.9)",
  shield: "rgba(80, 200, 220, 0.9)",
  reactor: "rgba(220, 180, 80, 0.9)",
  command: "rgba(180, 100, 220, 0.9)",
  drive: "rgba(80, 220, 140, 0.9)",
  utility: "rgba(160, 160, 160, 0.9)",
};

const ITEM_BORDER_DIM: Record<ItemCategory, string> = {
  weapon: "border-red-800",
  thruster: "border-blue-800",
  shield: "border-cyan-800",
  reactor: "border-yellow-800",
  command: "border-purple-800",
  drive: "border-emerald-800",
};

const ITEM_BORDER_ACTIVE: Record<ItemCategory, string> = {
  weapon: "border-red-500",
  thruster: "border-blue-500",
  shield: "border-cyan-400",
  reactor: "border-yellow-500",
  command: "border-purple-500",
  drive: "border-emerald-500",
};

function ShipPreview({ hull }: { hull: HullDef }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

    ctx.fillStyle = "rgba(60, 100, 60, 0.4)";
    ctx.strokeStyle = "rgba(100, 200, 100, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    hull.vertices.forEach((v, i) => {
      const { x, y } = toCanvas(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    for (const slot of hull.slots) {
      const { x, y } = toCanvas(slot.hardpoint);
      ctx.fillStyle = HARDPOINT_COLOR[slotKind(slot)];
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [hull]);

  return (
    <canvas
      ref={canvasRef}
      width={PREVIEW_W}
      height={PREVIEW_H}
      className="pointer-events-none select-none"
    />
  );
}

function SlotButton({
  slot, equippedItem, index, inline, isHovered, isEquipTarget, onEnter, onLeave, onClick,
}: {
  slot: HullSlotDef; equippedItem: ItemDef | null; index: number; inline?: boolean;
  isHovered: boolean; isEquipTarget: boolean;
  onEnter: () => void; onLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const kind = slotKind(slot);
  const { x, y } = inline === true ? { x: 0, y: 0 } : toCanvas(slot.hardpoint);
  const border = (isHovered || isEquipTarget)
    ? SLOT_BORDER_ACTIVE[kind]
    : SLOT_BORDER_DIM[kind];
  return (
    <button type="button"
      {...inline === true
        ? {}
        : { style: { position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)" } }
      }
      className={`
        border rounded bg-gray-950/80 w-14 h-14
        flex flex-col items-center justify-center gap-0.5
        transition-colors cursor-pointer
        ${border}
        ${isEquipTarget ? "bg-gray-800/80" : ""}
      `}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <span className="text-[9px] uppercase tracking-widest text-gray-500 leading-none">
        {SLOT_SHORT_LABEL[kind]} {index + 1}
      </span>
      <span className={`text-[10px] leading-none ${equippedItem !== null ? "text-green-400" : "text-gray-700"}`}>
        {equippedItem !== null ? "EQ" : "—"}
      </span>
    </button>
  );
}

function SlotCard({
  slot, equippedItem, index, isHovered, isEquipTarget, onEnter, onLeave, onClick,
}: {
  slot: HullSlotDef; equippedItem: ItemDef | null; index: number;
  isHovered: boolean; isEquipTarget: boolean;
  onEnter: () => void; onLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const kind = slotKind(slot);
  return <li className="flex flex-row gap-x-2">
    <SlotButton
      slot={slot} equippedItem={equippedItem} index={index} inline={true}
      isHovered={isHovered} isEquipTarget={isEquipTarget}
      onEnter={onEnter} onLeave={onLeave} onClick={onClick}
    />
    <div className="flex-1">
      <p>{`${SLOT_FULL_LABEL[kind]} Slot ${index + 1}`}</p>
      <p className="text-xs text-gray-600">
        power {slot.powerRating}
        {kind === "utility" ? ` · ${slot.accepts.map(c => SLOT_SHORT_LABEL[c]).join("/")}` : ""}
      </p>
      <p className={`${equippedItem !== null ? "" : "opacity-50"}`}>
        {equippedItem === null ? "Empty" : equippedItem.name}
      </p>
    </div>
  </li>;
}

function InventoryCard({
  item, isSelected, onClick,
}: {
  item: ItemDef; isSelected: boolean; onClick: () => void;
}) {
  const border = isSelected ? ITEM_BORDER_ACTIVE[item.category] : ITEM_BORDER_DIM[item.category];
  return (
    <button type="button"
      className={`
        border rounded px-3 py-2 text-left cursor-pointer transition-colors w-full
        ${border}
        ${isSelected ? "bg-gray-700" : "bg-gray-900"}
      `}
      onClick={onClick}
    >
      <div className="text-[9px] uppercase tracking-widest text-gray-500 leading-none mb-1">
        {SLOT_SHORT_LABEL[item.category]} · draw {item.powerDraw}
      </div>
      <div className="text-sm text-white leading-tight">{item.name}</div>
    </button>
  );
}

type ActiveSlot = {
  slotIdx: number;
  anchorTop: number;
  anchorRight: number;
};

/**
 * The fit editor, on props: the dev Workshop view feeds it sandbox state, the
 * in-run Refit screen feeds it run state. Same UI, same rules.
 */
export function FitWorkshop({ hull, equipped, inventory, onUpdate }: {
  hull: HullDef;
  equipped: (string | null)[];
  inventory: string[];
  onUpdate: (next: { equipped: (string | null)[]; inventory: string[] }) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedInvIdx, setSelectedInvIdx] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);

  const inventoryDefs = inventory
    .map((id, invIdx) => ({ def: getItemDef(id), invIdx }))
    .filter((entry): entry is { def: ItemDef; invIdx: number } => entry.def !== null);

  const selectedEntry = selectedInvIdx !== null
    ? inventoryDefs.find(({ invIdx }) => invIdx === selectedInvIdx) ?? null
    : null;

  const equippedDefs = equipped.map((id) => (id === null ? null : getItemDef(id)));

  function equipIntoSlot(slotIdx: number, item: ItemDef, invIdx: number) {
    const previous = equipped[slotIdx];
    const nextEquipped = equipped.map((id, i) => (i === slotIdx ? item.id : id));
    const without = inventory.filter((_, i) => i !== invIdx);
    onUpdate({
      equipped: nextEquipped,
      inventory: previous !== null ? [...without, previous] : without,
    });
  }

  function unequipSlot(slotIdx: number) {
    const current = equipped[slotIdx];
    if (current === null) return;
    onUpdate({
      equipped: equipped.map((id, i) => (i === slotIdx ? null : id)),
      inventory: [...inventory, current],
    });
  }

  function handleSlotClick(slotIdx: number, e: React.MouseEvent<HTMLButtonElement>) {
    // Inventory-first shortcut: selected item already chosen and compatible — equip directly
    if (selectedEntry !== null && itemFitsSlot(selectedEntry.def, hull.slots[slotIdx])) {
      equipIntoSlot(slotIdx, selectedEntry.def, selectedEntry.invIdx);
      setSelectedInvIdx(null);
      return;
    }

    // Slot-first: open popover anchored to the button
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveSlot({ slotIdx, anchorTop: rect.top, anchorRight: rect.right });
    setSelectedInvIdx(null);
  }

  // Popover content for the active slot
  const popoverAvailable = activeSlot !== null
    ? inventoryDefs.filter(({ def }) => itemFitsSlot(def, hull.slots[activeSlot.slotIdx]))
    : [];
  const popoverEquipped = activeSlot !== null ? equippedDefs[activeSlot.slotIdx] : null;

  return (
    <main className="p-6 flex flex-col gap-6 h-dvh overflow-hidden">

      <section className="flex flex-row gap-x-8">
        {/* Preview */}
        <div className="relative inline-block" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
          <ShipPreview hull={hull} />
          {hull.slots.map((slot, slotIdx) => (
            <SlotButton
              key={slotIdx} slot={slot} equippedItem={equippedDefs[slotIdx]} index={slotIdx}
              isHovered={hoveredIdx === slotIdx}
              isEquipTarget={
                equipped[slotIdx] === null
                && selectedEntry !== null
                && itemFitsSlot(selectedEntry.def, slot)
              }
              onEnter={() => setHoveredIdx(slotIdx)}
              onLeave={() => setHoveredIdx(null)}
              onClick={e => handleSlotClick(slotIdx, e)}
            />
          ))}
        </div>

        {/* Inventory */}
        <aside
          className="flex flex-col gap-y-2 overflow-y-auto min-w-50 px-3 py-3 rounded-xl border border-gray-800 bg-gray-950 shadow-[inset_0_1px_0_rgba(148,163,184,0.06)]"
          style={{
            maxHeight: PREVIEW_H,
            backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.055) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        >
          <p className="text-xs uppercase tracking-widest text-gray-500">Inventory</p>
          {inventoryDefs.length === 0
            ? <p className="text-sm text-gray-700">Empty</p>
            : inventoryDefs.map(({ def, invIdx }) => (
              <InventoryCard
                key={invIdx}
                item={def}
                isSelected={selectedInvIdx === invIdx}
                onClick={() => setSelectedInvIdx(prev => prev === invIdx ? null : invIdx)}
              />
            ))
          }
        </aside>
      </section>

      {/* Slot list */}
      <section
        className="flex flex-row flex-wrap gap-x-15 gap-y-2 overflow-y-auto flex-1 min-h-0 px-4 py-3 rounded-xl border border-gray-800 bg-gray-950 w-full shadow-[inset_0_1px_0_rgba(148,163,184,0.06)]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.055) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <ul className="flex flex-col flex-wrap gap-2 max-h-full">
          {hull.slots.map((slot, slotIdx) => (
            <SlotCard
              key={slotIdx} slot={slot} equippedItem={equippedDefs[slotIdx]} index={slotIdx}
              isHovered={hoveredIdx === slotIdx}
              isEquipTarget={
                equipped[slotIdx] === null
                && selectedEntry !== null
                && itemFitsSlot(selectedEntry.def, slot)
              }
              onEnter={() => setHoveredIdx(slotIdx)}
              onLeave={() => setHoveredIdx(null)}
              onClick={e => handleSlotClick(slotIdx, e)}
            />
          ))}
        </ul>
      </section>

      {/* Slot popover */}
      {activeSlot !== null ? <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveSlot(null)} />
          <div
            className="fixed z-50 bg-gray-950 border border-gray-700 rounded shadow-xl p-2 flex flex-col gap-1 min-w-44"
            style={{ top: activeSlot.anchorTop, left: activeSlot.anchorRight + 6 }}
          >
            <p className="text-[10px] uppercase tracking-widest text-gray-500 px-1 pb-1">
              {SLOT_FULL_LABEL[slotKind(hull.slots[activeSlot.slotIdx])]} · power {hull.slots[activeSlot.slotIdx].powerRating}
            </p>

            {popoverAvailable.length === 0
              ? <p className="text-sm text-gray-600 px-2 py-1">Nothing compatible in inventory</p>
              : popoverAvailable.map(({ def, invIdx }) => (
                <button type="button"
                  key={invIdx}
                  className={`text-left px-2 py-1.5 rounded text-sm text-white hover:bg-gray-700 transition-colors border ${ITEM_BORDER_DIM[def.category]}`}
                  onClick={() => {
                    equipIntoSlot(activeSlot.slotIdx, def, invIdx);
                    setActiveSlot(null);
                  }}
                >
                  {def.name}
                </button>
              ))
            }

            {popoverEquipped !== null ? <>
                <div className="border-t border-gray-700 my-1" />
                <p className="text-[10px] uppercase tracking-widest text-gray-500 px-1 pb-1">Equipped</p>
                <button type="button"
                  className={`text-left px-2 py-1.5 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors border ${ITEM_BORDER_DIM[popoverEquipped.category]}`}
                  onClick={() => {
                    unequipSlot(activeSlot.slotIdx);
                    setActiveSlot(null);
                  }}
                >
                  {popoverEquipped.name}
                </button>
              </> : null}
          </div>
        </> : null}

    </main>
  );
}

/** Dev sandbox wrapper: the workshop editing the persistent dev fit. */
export function WorkshopView() {
  const { hull, equipped, setEquipped, inventory, setInventory } = useGameState();
  return <FitWorkshop
    hull={hull}
    equipped={equipped}
    inventory={inventory}
    onUpdate={(next) => {
      setEquipped(next.equipped);
      setInventory(next.inventory);
    }}
  />;
}
