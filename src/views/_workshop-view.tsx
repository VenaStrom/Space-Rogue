import { useEffect, useRef } from "react";
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

const SLOT_ACCENT: Record<SlotType, string> = {
  weapon: "border-red-800 hover:border-red-500",
  thruster: "border-blue-800 hover:border-blue-500",
  misc: "border-gray-600 hover:border-gray-400",
  command: "border-purple-800 hover:border-purple-500",
  power: "border-yellow-800 hover:border-yellow-500",
};

const SLOT_LABEL: Record<SlotType, string> = {
  weapon: "WPN",
  thruster: "THR",
  misc: "MSC",
  command: "CMD",
  power: "PWR",
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

function SlotButton({ slot, index }: { slot: Slot; index: number }) {
  const { x, y } = toCanvas(slot.hardpoint);
  return (
    <button
      style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)" }}
      className={`
        border rounded bg-gray-950/80 w-14 h-14
        flex flex-col items-center justify-center gap-0.5
        transition-colors cursor-pointer
        ${SLOT_ACCENT[slot.type]}
      `}
    >
      <span className="text-[9px] uppercase tracking-widest text-gray-500 leading-none">
        {SLOT_LABEL[slot.type]} {index + 1}
      </span>
      <span className={`text-[10px] leading-none ${slot.item !== null ? "text-green-400" : "text-gray-700"}`}>
        {slot.item !== null ? "EQ" : "—"}
      </span>
    </button>
  );
}

export function WorkshopView() {
  const { playerShip } = useGameState();

  const allSlots: Slot[] = [
    ...playerShip.weaponSlots,
    ...playerShip.thrusterSlots,
    ...playerShip.miscSlots,
    ...playerShip.commandSlots,
    ...playerShip.powerSlots,
  ];

  return (
    <main className="p-6">
      <h2 className="text-lg font-semibold mb-6">Workshop</h2>
      <div className="relative inline-block" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
        <ShipPreview loadout={playerShip} />
        {allSlots.map((slot, i) => (
          <SlotButton key={i} slot={slot} index={i} />
        ))}
      </div>
    </main>
  );
}
