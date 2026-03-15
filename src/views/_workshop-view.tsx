import { useEffect, useRef, useState } from "react";
import { useGameState } from "../context/game-state";
import type { ShipLoadout, Slot, SlotType, V2 } from "../types";

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

function ShipPreview({ loadout }: { loadout: ShipLoadout }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

    // Ship hull from loadout vertices
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

    // Hardpoint dots
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

function SlotButton({ slot, index, inline, isHovered, onEnter, onLeave }: {
  slot: Slot; index: number; inline?: boolean;
  isHovered: boolean; onEnter: () => void; onLeave: () => void;
}) {
  const { x, y } = inline ? { x: 0, y: 0 } : toCanvas(slot.hardpoint);
  const border = isHovered ? SLOT_BORDER_ACTIVE[slot.type] : SLOT_BORDER_DIM[slot.type];
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
      `}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
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

function SlotCard({ slot, index, isHovered, onEnter, onLeave }: {
  slot: Slot; index: number;
  isHovered: boolean; onEnter: () => void; onLeave: () => void;
}) {
  return <li className="flex flex-row gap-x-2">
    <SlotButton slot={slot} index={index} inline isHovered={isHovered} onEnter={onEnter} onLeave={onLeave} />
    <div className="flex-1">
      <p>{`${SLOT_FULL_LABEL[slot.type]} Slot ${index + 1}`}</p>
      <p className={`${slot.item ? "" : "opacity-50"}`}>{`${slot.item ?? "Empty"}`}</p>
    </div>
  </li>
}

export function WorkshopView() {
  const { playerShip } = useGameState();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const allSlots: Slot[] = [
    ...playerShip.weaponSlots,
    ...playerShip.thrusterSlots,
    ...playerShip.miscSlots,
    ...playerShip.commandSlots,
    ...playerShip.powerSlots,
  ];

  let slotIndex = -1;
  return (
    <main className="p-6 flex flex-col gap-6 h-dvh overflow-hidden">

      {/* Preview */}
      <div className="relative inline-block" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
        <ShipPreview loadout={playerShip} />
        {allSlots.map((slot, i) => (
          <SlotButton
            key={i} slot={slot} index={i}
            isHovered={hoveredIdx === i}
            onEnter={() => setHoveredIdx(i)}
            onLeave={() => setHoveredIdx(null)}
          />
        ))}
      </div>

      {/* Lists */}
      <section className="flex flex-row gap-x-15 overflow-y-auto flex-1 min-h-0 px-2">
        <ul className="flex flex-col gap-y-2">
          {playerShip.weaponSlots.map(slot => {
            const idx = ++slotIndex;
            return <SlotCard key={idx} slot={slot} index={idx}
              isHovered={hoveredIdx === idx}
              onEnter={() => setHoveredIdx(idx)}
              onLeave={() => setHoveredIdx(null)}
            />
          })}
        </ul>

        <ul className="flex flex-col gap-y-2">
          {playerShip.thrusterSlots.map(slot => {
            const idx = ++slotIndex;
            return <SlotCard key={idx} slot={slot} index={idx}
              isHovered={hoveredIdx === idx}
              onEnter={() => setHoveredIdx(idx)}
              onLeave={() => setHoveredIdx(null)}
            />
          })}
        </ul>

        <ul className="flex flex-col gap-y-2">
          {playerShip.miscSlots.map(slot => {
            const idx = ++slotIndex;
            return <SlotCard key={idx} slot={slot} index={idx}
              isHovered={hoveredIdx === idx}
              onEnter={() => setHoveredIdx(idx)}
              onLeave={() => setHoveredIdx(null)}
            />
          })}
        </ul>

        <ul className="flex flex-col gap-y-2">
          {playerShip.commandSlots.map(slot => {
            const idx = ++slotIndex;
            return <SlotCard key={idx} slot={slot} index={idx}
              isHovered={hoveredIdx === idx}
              onEnter={() => setHoveredIdx(idx)}
              onLeave={() => setHoveredIdx(null)}
            />
          })}
        </ul>

        <ul className="flex flex-col gap-y-2">
          {playerShip.powerSlots.map(slot => {
            const idx = ++slotIndex;
            return <SlotCard key={idx} slot={slot} index={idx}
              isHovered={hoveredIdx === idx}
              onEnter={() => setHoveredIdx(idx)}
              onLeave={() => setHoveredIdx(null)}
            />
          })}
        </ul>
      </section>
    </main>
  );
}
