import { useEffect, useRef, useState } from "react";
import { useGameState } from "../context/game-state";
import { SlotType, type ShipLoadout, type Slot, type V2 } from "../types";
import type { SlotItem } from "../slots";

const PREVIEW_W = 800;
const PREVIEW_H = 400;
const SHIP_SCALE = 5;
const CX = PREVIEW_W / 2;
const CY = PREVIEW_H / 2;

function toCanvas(v: V2) {
  return { x: CX + v.x * SHIP_SCALE, y: CY + v.y * SHIP_SCALE };
}

const SLOT_BORDER_DIM: Record<SlotType, string> = {
  weapon: "border-red-800",
  thruster: "border-blue-800",
  misc: "border-gray-600",
  command: "border-purple-800",
  power: "border-yellow-800",
};

const SLOT_BORDER_ACTIVE: Record<SlotType, string> = {
  weapon: "border-red-500",
  thruster: "border-blue-500",
  misc: "border-gray-400",
  command: "border-purple-500",
  power: "border-yellow-500",
};

const SLOT_SHORT_LABEL: Record<SlotType, string> = {
  weapon: "WPN",
  thruster: "THR",
  misc: "MSC",
  command: "CMD",
  power: "PWR",
};

const SLOT_FULL_LABEL: Record<SlotType, string> = {
  weapon: "Weapon",
  thruster: "Thruster",
  misc: "Misc",
  command: "Command",
  power: "Power",
};

const HARDPOINT_COLOR: Record<SlotType, string> = {
  weapon: "rgba(220, 80, 80, 0.9)",
  thruster: "rgba(80, 140, 220, 0.9)",
  misc: "rgba(160, 160, 160, 0.9)",
  command: "rgba(180, 100, 220, 0.9)",
  power: "rgba(220, 180, 80, 0.9)",
};

/** Immutably update a single slot item on the loadout. */
function updateSlot(
  ship: ShipLoadout,
  type: SlotType,
  localIdx: number,
  item: Slot["item"],
): ShipLoadout {
  const upd = (arr: Slot[]) => arr.map((s, i) => (i === localIdx ? { ...s, item } : s));
  switch (type) {
    case SlotType.weapon: return { ...ship, weaponSlots: upd(ship.weaponSlots) };
    case SlotType.thruster: return { ...ship, thrusterSlots: upd(ship.thrusterSlots) };
    case SlotType.misc: return { ...ship, miscSlots: upd(ship.miscSlots) };
    case SlotType.command: return { ...ship, commandSlots: upd(ship.commandSlots) };
    case SlotType.power: return { ...ship, powerSlots: upd(ship.powerSlots) };
  }
}

function getSlotCurrentItem(ship: ShipLoadout, type: SlotType, localIdx: number): SlotItem | null {
  const item = ship[
    type === SlotType.weapon ? "weaponSlots" satisfies keyof ShipLoadout :
      type === SlotType.thruster ? "thrusterSlots" satisfies keyof ShipLoadout :
        type === SlotType.misc ? "miscSlots" satisfies keyof ShipLoadout :
          type === SlotType.command ? "commandSlots" satisfies keyof ShipLoadout :
            "powerSlots" satisfies keyof ShipLoadout
  ][localIdx].item;
  return (item !== null && typeof item !== "string") ? item : null;
}

function ShipPreview({ loadout }: { loadout: ShipLoadout }) {
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
    loadout.hullVertices.forEach((v, i) => {
      const { x, y } = toCanvas(v);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const allSlots: Slot[] = [
      ...loadout.weaponSlots,
      ...loadout.thrusterSlots,
      ...loadout.miscSlots,
      ...loadout.commandSlots,
      ...loadout.powerSlots,
    ];
    for (const slot of allSlots) {
      const { x, y } = toCanvas(slot.hardpoint);
      ctx.fillStyle = HARDPOINT_COLOR[slot.type];
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [loadout]);

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
  slot, index, inline, isHovered, isEquipTarget, onEnter, onLeave, onClick,
}: {
  slot: Slot; index: number; inline?: boolean;
  isHovered: boolean; isEquipTarget: boolean;
  onEnter: () => void; onLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { x, y } = inline ? { x: 0, y: 0 } : toCanvas(slot.hardpoint);
  const border = (isHovered || isEquipTarget)
    ? SLOT_BORDER_ACTIVE[slot.type]
    : SLOT_BORDER_DIM[slot.type];
  return (
    <button
      {...inline
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
        {SLOT_SHORT_LABEL[slot.type]} {index + 1}
      </span>
      <span className={`text-[10px] leading-none ${slot.item !== null ? "text-green-400" : "text-gray-700"}`}>
        {slot.item !== null ? "EQ" : "—"}
      </span>
    </button>
  );
}

function SlotCard({
  slot, index, isHovered, isEquipTarget, onEnter, onLeave, onClick,
}: {
  slot: Slot; index: number;
  isHovered: boolean; isEquipTarget: boolean;
  onEnter: () => void; onLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return <li className="flex flex-row gap-x-2">
    <SlotButton
      slot={slot} index={index} inline
      isHovered={isHovered} isEquipTarget={isEquipTarget}
      onEnter={onEnter} onLeave={onLeave} onClick={onClick}
    />
    <div className="flex-1">
      <p>{`${SLOT_FULL_LABEL[slot.type]} Slot ${index + 1}`}</p>
      <p className={`${slot.item ? "" : "opacity-50"}`}>
        {slot.item === null
          ? "Empty"
          : typeof slot.item === "string"
            ? slot.item
            : slot.item.name}
      </p>
    </div>
  </li>;
}

function InventoryCard({
  item, isSelected, onClick,
}: {
  item: SlotItem; isSelected: boolean; onClick: () => void;
}) {
  const border = isSelected ? SLOT_BORDER_ACTIVE[item.slotType] : SLOT_BORDER_DIM[item.slotType];
  return (
    <button
      className={`
        border rounded px-3 py-2 text-left cursor-pointer transition-colors w-full
        ${border}
        ${isSelected ? "bg-gray-700" : "bg-gray-900"}
      `}
      onClick={onClick}
    >
      <div className="text-[9px] uppercase tracking-widest text-gray-500 leading-none mb-1">
        {SLOT_SHORT_LABEL[item.slotType]}
      </div>
      <div className="text-sm text-white leading-tight">{item.name}</div>
    </button>
  );
}

type ActiveSlot = {
  type: SlotType;
  localIdx: number;
  anchorTop: number;
  anchorRight: number;
};

export function WorkshopView() {
  const { playerShip, setPlayerShip, inventory, setInventory } = useGameState();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedInvIdx, setSelectedInvIdx] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);

  const selectedItem = selectedInvIdx !== null ? inventory[selectedInvIdx] : null;

  // Flat list of all slots with type and local index for click routing
  const allSlots = [
    ...playerShip.weaponSlots.map((slot, li) => ({ slot, li, type: SlotType.weapon })),
    ...playerShip.thrusterSlots.map((slot, li) => ({ slot, li, type: SlotType.thruster })),
    ...playerShip.miscSlots.map((slot, li) => ({ slot, li, type: SlotType.misc })),
    ...playerShip.commandSlots.map((slot, li) => ({ slot, li, type: SlotType.command })),
    ...playerShip.powerSlots.map((slot, li) => ({ slot, li, type: SlotType.power })),
  ];

  // Per-type groups with global+local indices, for the list section
  const slotGroups: { type: SlotType; slots: { slot: Slot; gi: number; li: number }[] }[] = [];
  let gi = 0;
  for (const [type, slots] of [
    [SlotType.weapon, playerShip.weaponSlots],
    [SlotType.thruster, playerShip.thrusterSlots],
    [SlotType.misc, playerShip.miscSlots],
    [SlotType.command, playerShip.commandSlots],
    [SlotType.power, playerShip.powerSlots],
  ] as [SlotType, Slot[]][]) {
    slotGroups.push({ type, slots: slots.map((slot, li) => ({ slot, gi: gi++, li })) });
  }

  function handleSlotClick(type: SlotType, localIdx: number, e: React.MouseEvent<HTMLButtonElement>) {
    // Inventory-first shortcut: selected item already chosen and compatible — equip directly
    if (selectedItem !== null && selectedItem.slotType === type) {
      const currentItem = getSlotCurrentItem(playerShip, type, localIdx);
      const invIdx = selectedInvIdx!;
      setPlayerShip(ship => updateSlot(ship, type, localIdx, selectedItem));
      setInventory(inv => {
        const without = inv.filter((_, i) => i !== invIdx);
        return currentItem ? [...without, currentItem] : without;
      });
      setSelectedInvIdx(null);
      return;
    }

    // Slot-first: open popover anchored to the button
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveSlot({ type, localIdx, anchorTop: rect.top, anchorRight: rect.right });
    setSelectedInvIdx(null);
  }

  function handlePopoverItemClick(item: SlotItem, invIdx: number | null) {
    if (!activeSlot) return;
    const { type, localIdx } = activeSlot;
    const currentItem = getSlotCurrentItem(playerShip, type, localIdx);

    if (invIdx !== null) {
      // Equip from inventory (swap if slot was occupied)
      setPlayerShip(ship => updateSlot(ship, type, localIdx, item));
      setInventory(inv => {
        const without = inv.filter((_, i) => i !== invIdx);
        return currentItem ? [...without, currentItem] : without;
      });
    } else {
      // Un-equip current item back to inventory
      setPlayerShip(ship => updateSlot(ship, type, localIdx, null));
      setInventory(inv => [...inv, item]);
    }

    setActiveSlot(null);
  }

  // Popover content for the active slot
  const popoverAvailable = activeSlot
    ? inventory
      .map((item, i) => ({ item, invIdx: i }))
      .filter(({ item }) => item.slotType === activeSlot.type)
    : [];
  const popoverEquipped = activeSlot
    ? getSlotCurrentItem(playerShip, activeSlot.type, activeSlot.localIdx)
    : null;

  return (
    <main className="p-6 flex flex-col gap-6 h-dvh overflow-hidden">

      <section className="flex flex-row gap-x-8">
        {/* Preview */}
        <div className="relative inline-block" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
          <ShipPreview loadout={playerShip} />
          {allSlots.map(({ slot, li, type }, globalIdx) => (
            <SlotButton
              key={globalIdx} slot={slot} index={globalIdx}
              isHovered={hoveredIdx === globalIdx}
              isEquipTarget={slot.item === null && selectedItem?.slotType === type}
              onEnter={() => setHoveredIdx(globalIdx)}
              onLeave={() => setHoveredIdx(null)}
              onClick={e => handleSlotClick(type, li, e)}
            />
          ))}
        </div>

        {/* Inventory */}
        <aside className="flex flex-col gap-y-2 overflow-y-auto min-w-50 px-2" style={{ maxHeight: PREVIEW_H }}>
          <p className="text-xs uppercase tracking-widest text-gray-500">Inventory</p>
          {inventory.length === 0
            ? <p className="text-sm text-gray-700">Empty</p>
            : inventory.map((item, i) => (
              <InventoryCard
                key={i}
                item={item}
                isSelected={selectedInvIdx === i}
                onClick={() => setSelectedInvIdx(prev => prev === i ? null : i)}
              />
            ))
          }
        </aside>
      </section>

      {/* Slot lists */}
      <section className="flex flex-row gap-x-15 overflow-y-auto flex-1 min-h-0 px-2">
        {slotGroups.map(({ type, slots }) => (
          <ul key={type} className="flex flex-col gap-y-2">
            {slots.map(({ slot, gi: globalIdx, li: localIdx }) => (
              <SlotCard
                key={globalIdx} slot={slot} index={globalIdx}
                isHovered={hoveredIdx === globalIdx}
                isEquipTarget={slot.item === null && selectedItem?.slotType === type}
                onEnter={() => setHoveredIdx(globalIdx)}
                onLeave={() => setHoveredIdx(null)}
                onClick={e => handleSlotClick(type, localIdx, e)}
              />
            ))}
          </ul>
        ))}
      </section>

      {/* Slot popover */}
      {activeSlot && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActiveSlot(null)} />
          <div
            className="fixed z-50 bg-gray-950 border border-gray-700 rounded shadow-xl p-2 flex flex-col gap-1 min-w-44"
            style={{ top: activeSlot.anchorTop, left: activeSlot.anchorRight + 6 }}
          >
            <p className="text-[10px] uppercase tracking-widest text-gray-500 px-1 pb-1">
              {SLOT_FULL_LABEL[activeSlot.type]}
            </p>

            {popoverAvailable.length === 0
              ? <p className="text-sm text-gray-600 px-2 py-1">Nothing in inventory</p>
              : popoverAvailable.map(({ item, invIdx }) => (
                <button
                  key={invIdx}
                  className={`text-left px-2 py-1.5 rounded text-sm text-white hover:bg-gray-700 transition-colors border ${SLOT_BORDER_DIM[item.slotType]}`}
                  onClick={() => handlePopoverItemClick(item, invIdx)}
                >
                  {item.name}
                </button>
              ))
            }

            {popoverEquipped && (
              <>
                <div className="border-t border-gray-700 my-1" />
                <p className="text-[10px] uppercase tracking-widest text-gray-500 px-1 pb-1">Equipped</p>
                <button
                  className={`text-left px-2 py-1.5 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors border ${SLOT_BORDER_DIM[activeSlot.type]}`}
                  onClick={() => handlePopoverItemClick(popoverEquipped, null)}
                >
                  {popoverEquipped.name}
                </button>
              </>
            )}
          </div>
        </>
      )}

    </main>
  );
}
