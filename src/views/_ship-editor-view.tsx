import { useRef, useState } from "react";
import { useGameState } from "../context/game-state";
import { SlotType, type ShipLoadout, type Slot, type V2 } from "../types";

const VIEW_W = 300;
const VIEW_H = 200;
const VIEW_MIN_X = -150;
const VIEW_MIN_Y = -100;
const VIEW_BOX = `${VIEW_MIN_X} ${VIEW_MIN_Y} ${VIEW_W} ${VIEW_H}`;

type Tool = "select" | "add-vertex" | "add-hardpoint";

type DragState =
  | { kind: "vertex"; idx: number; mirrorIdx: number | null; startPos: V2; svgStart: V2 }
  | { kind: "hardpoint"; allIdx: number; mirrorAllIdx: number | null; startPos: V2; svgStart: V2 };

const SLOT_FILL: Record<SlotType, string> = {
  weapon: "rgba(220,80,80,0.85)",
  thruster: "rgba(80,140,220,0.85)",
  misc: "rgba(160,160,160,0.85)",
  command: "rgba(180,100,220,0.85)",
  power: "rgba(220,180,80,0.85)",
};

const SLOT_STROKE: Record<SlotType, string> = {
  weapon: "#f87171",
  thruster: "#60a5fa",
  misc: "#9ca3af",
  command: "#c084fc",
  power: "#fbbf24",
};

// Insert new vertex between the two hull vertices that define the closest edge
function insertionIndex(hull: V2[], p: V2): number {
  if (hull.length < 2) return hull.length;
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq)) : 0;
    const dist = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  }
  return bestIdx + 1;
}

function findMirrorVertex(hull: V2[], idx: number): number | null {
  const v = hull[idx];
  if (Math.abs(v.y) < 0.5) return null;
  const j = hull.findIndex((u, i) => i !== idx && Math.abs(u.x - v.x) < 4 && Math.abs(u.y + v.y) < 4);
  return j >= 0 ? j : null;
}

function findMirrorSlot(slots: Slot[], idx: number): number | null {
  const v = slots[idx].hardpoint;
  if (Math.abs(v.y) < 0.5) return null;
  const j = slots.findIndex((s, i) => i !== idx && Math.abs(s.hardpoint.x - v.x) < 4 && Math.abs(s.hardpoint.y + v.y) < 4);
  return j >= 0 ? j : null;
}

function rebuildShip(hull: V2[], allSlots: Slot[]): ShipLoadout {
  return {
    hullVertices: hull,
    weaponSlots: allSlots.filter(s => s.type === SlotType.weapon),
    thrusterSlots: allSlots.filter(s => s.type === SlotType.thruster),
    miscSlots: allSlots.filter(s => s.type === SlotType.misc),
    commandSlots: allSlots.filter(s => s.type === SlotType.command),
    powerSlots: allSlots.filter(s => s.type === SlotType.power),
  };
}

function isV2(v: unknown): v is V2 {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.x === "number" && typeof o.y === "number";
}

function isSlot(s: unknown): s is Slot {
  if (typeof s !== "object" || s === null) return false;
  const o = s as Record<string, unknown>;
  return (
    o.type === SlotType.weapon
    || o.type === SlotType.thruster
    || o.type === SlotType.misc
    || o.type === SlotType.command
    || o.type === SlotType.power
  )
    && o.item === null
    && isV2(o.hardpoint);
}

function parseShipLoadout(raw: unknown): ShipLoadout | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.hullVertices) || !o.hullVertices.every(isV2)) return null;
  if (!Array.isArray(o.weaponSlots) || !o.weaponSlots.every(isSlot)) return null;
  if (!Array.isArray(o.thrusterSlots) || !o.thrusterSlots.every(isSlot)) return null;
  if (!Array.isArray(o.miscSlots) || !o.miscSlots.every(isSlot)) return null;
  if (!Array.isArray(o.commandSlots) || !o.commandSlots.every(isSlot)) return null;
  if (!Array.isArray(o.powerSlots) || !o.powerSlots.every(isSlot)) return null;
  if (o.hullVertices.length < 3) return null;
  return {
    hullVertices: o.hullVertices,
    weaponSlots: o.weaponSlots,
    thrusterSlots: o.thrusterSlots,
    miscSlots: o.miscSlots,
    commandSlots: o.commandSlots,
    powerSlots: o.powerSlots,
  };
}

function ToolBtn({
  label, active, onClick, accent,
}: {
  label: string; active: boolean; onClick: () => void; accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs transition-colors ${active
        ? "bg-gray-700 text-white"
        : `bg-gray-900 ${accent ?? "text-gray-400"} hover:bg-gray-800`
        }`}
    >
      {label}
    </button>
  );
}

export function ShipEditorView() {
  const { playerShip, setPlayerShip } = useGameState();
  const [tool, setTool] = useState<Tool>("select");
  const [mirror, setMirror] = useState(true);
  const [addSlotType, setAddSlotType] = useState<SlotType>(SlotType.weapon);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);

  const hull = playerShip.hullVertices;
  const allSlots: Slot[] = [
    ...playerShip.weaponSlots,
    ...playerShip.thrusterSlots,
    ...playerShip.miscSlots,
    ...playerShip.commandSlots,
    ...playerShip.powerSlots,
  ];

  function getSvgPoint(e: { clientX: number; clientY: number }): V2 {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const r = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: r.x, y: r.y };
  }

  // ── drag start ──────────────────────────────────────────────────────────────

  function onVertexPointerDown(e: React.PointerEvent, idx: number) {
    if (tool !== "select") return;
    e.stopPropagation();
    svgRef.current!.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "vertex", idx,
      mirrorIdx: mirror ? findMirrorVertex(hull, idx) : null,
      startPos: { ...hull[idx] },
      svgStart: getSvgPoint(e),
    };
  }

  function onHardpointPointerDown(e: React.PointerEvent, allIdx: number) {
    if (tool !== "select") return;
    e.stopPropagation();
    svgRef.current!.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "hardpoint", allIdx,
      mirrorAllIdx: mirror ? findMirrorSlot(allSlots, allIdx) : null,
      startPos: { ...allSlots[allIdx].hardpoint },
      svgStart: getSvgPoint(e),
    };
  }

  // ── drag move ───────────────────────────────────────────────────────────────

  function onSvgPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    didDragRef.current = true;

    const pt = getSvgPoint(e);
    const newPos: V2 = {
      x: drag.startPos.x + pt.x - drag.svgStart.x,
      y: drag.startPos.y + pt.y - drag.svgStart.y,
    };

    if (drag.kind === "vertex") {
      const newHull = hull.map((v, i) => {
        if (i === drag.idx) return { ...newPos };
        if (drag.mirrorIdx !== null && i === drag.mirrorIdx) return { x: newPos.x, y: -newPos.y };
        return v;
      });
      setPlayerShip(prev => ({ ...prev, hullVertices: newHull }));

    } else {
      const newSlots = allSlots.map((s, i) => {
        if (i === drag.allIdx) return { ...s, hardpoint: { ...newPos } };
        if (drag.mirrorAllIdx !== null && i === drag.mirrorAllIdx) return { ...s, hardpoint: { x: newPos.x, y: -newPos.y } };
        return s;
      });
      setPlayerShip(prev => rebuildShip(prev.hullVertices, newSlots));
    }
  }

  function onSvgPointerUp() {
    dragRef.current = null;
    // didDragRef stays true until the stray click event fires and resets it
  }

  // ── click to add ────────────────────────────────────────────────────────────

  function onSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (didDragRef.current) { didDragRef.current = false; return; }

    const pt = getSvgPoint(e);

    if (tool === "add-vertex") {
      const idx = insertionIndex(hull, pt);
      const newHull = [...hull];
      newHull.splice(idx, 0, { ...pt });
      if (mirror && Math.abs(pt.y) > 0.5) {
        const mirrorPt = { x: pt.x, y: -pt.y };
        newHull.splice(insertionIndex(newHull, mirrorPt), 0, mirrorPt);
      }
      setPlayerShip(prev => ({ ...prev, hullVertices: newHull }));
    }

    if (tool === "add-hardpoint") {
      const newSlot: Slot = { type: addSlotType, item: null, hardpoint: { ...pt } };
      const newSlots = [...allSlots, newSlot];
      if (mirror && Math.abs(pt.y) > 0.5) {
        newSlots.push({ type: addSlotType, item: null, hardpoint: { x: pt.x, y: -pt.y } });
      }
      setPlayerShip(prev => rebuildShip(prev.hullVertices, newSlots));
    }
  }

  // ── right-click to delete ────────────────────────────────────────────────────

  function onVertexContextMenu(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    const mirrorIdx = mirror ? findMirrorVertex(hull, idx) : null;
    const toRemove = new Set([idx, ...(mirrorIdx !== null ? [mirrorIdx] : [])]);
    const newHull = hull.filter((_, i) => !toRemove.has(i));
    if (newHull.length < 3) return; // keep at least triangle
    setPlayerShip(prev => ({ ...prev, hullVertices: newHull }));
  }

  function onHardpointContextMenu(e: React.MouseEvent, allIdx: number) {
    e.preventDefault();
    const mirrorIdx = mirror ? findMirrorSlot(allSlots, allIdx) : null;
    const toRemove = new Set([allIdx, ...(mirrorIdx !== null ? [mirrorIdx] : [])]);
    const newSlots = allSlots.filter((_, i) => !toRemove.has(i));
    setPlayerShip(prev => rebuildShip(prev.hullVertices, newSlots));
  }

  // ── import / export ─────────────────────────────────────────────────────────

  function exportShip() {
    const round = (n: number) => +n.toFixed(2);
    const roundV2 = (v: V2): V2 => ({ x: round(v.x), y: round(v.y) });
    const roundSlot = (s: Slot): Slot => ({ ...s, hardpoint: roundV2(s.hardpoint) });
    const clean: ShipLoadout = {
      hullVertices: playerShip.hullVertices.map(roundV2),
      weaponSlots: playerShip.weaponSlots.map(roundSlot),
      thrusterSlots: playerShip.thrusterSlots.map(roundSlot),
      miscSlots: playerShip.miscSlots.map(roundSlot),
      commandSlots: playerShip.commandSlots.map(roundSlot),
      powerSlots: playerShip.powerSlots.map(roundSlot),
    };
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ship.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so the same file can be re-imported
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const loadout = parseShipLoadout(JSON.parse(reader.result as string));
        if (loadout) {
          setPlayerShip(loadout);
        } else {
          alert("Invalid ShipLoadout JSON — expected hullVertices, weaponSlots, thrusterSlots, miscSlots.");
        }
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  }

  // ── grid ────────────────────────────────────────────────────────────────────

  const gridPath: string[] = [];
  for (let x = VIEW_MIN_X; x <= -VIEW_MIN_X; x += 25) {
    gridPath.push(`M ${x} ${VIEW_MIN_Y} L ${x} ${-VIEW_MIN_Y}`);
  }
  for (let y = VIEW_MIN_Y; y <= -VIEW_MIN_Y; y += 25) {
    gridPath.push(`M ${VIEW_MIN_X} ${y} L ${-VIEW_MIN_X} ${y}`);
  }

  const hullPoints = hull.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(" ");

  return (
    <main className="p-6">
      <h2 className="text-lg font-semibold mb-4">Ship Editor</h2>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">

        {/* Tool selector */}
        <div className="flex rounded overflow-hidden border border-gray-700">
          <ToolBtn label="Select (drag)" active={tool === "select"} onClick={() => setTool("select")} />
          <ToolBtn label="Add Vertex" active={tool === "add-vertex"} onClick={() => setTool("add-vertex")} />
          <ToolBtn label="Add Hardpoint" active={tool === "add-hardpoint"} onClick={() => setTool("add-hardpoint")} />
        </div>

        {/* Slot-type picker — only when add-hardpoint is active */}
        {tool === "add-hardpoint" && (
          <div className="flex rounded overflow-hidden border border-gray-700">
            <ToolBtn label="Weapon" active={addSlotType === SlotType.weapon} onClick={() => setAddSlotType(SlotType.weapon)} accent="text-red-400" />
            <ToolBtn label="Thruster" active={addSlotType === SlotType.thruster} onClick={() => setAddSlotType(SlotType.thruster)} accent="text-blue-400" />
            <ToolBtn label="Misc" active={addSlotType === SlotType.misc} onClick={() => setAddSlotType(SlotType.misc)} accent="text-gray-400" />
            <ToolBtn label="Command" active={addSlotType === SlotType.command} onClick={() => setAddSlotType(SlotType.command)} accent="text-purple-400" />
            <ToolBtn label="Power" active={addSlotType === SlotType.power} onClick={() => setAddSlotType(SlotType.power)} accent="text-yellow-400" />
          </div>
        )}

        {/* Mirror toggle */}
        <button
          onClick={() => setMirror(m => !m)}
          className={`px-3 py-1.5 text-xs rounded border transition-colors ${mirror
            ? "border-purple-600 bg-purple-950 text-purple-300"
            : "border-gray-700 bg-gray-900 text-gray-500"
            }`}
        >
          Mirror
        </button>

        {/* Import / Export */}
        <div className="flex gap-1">
          <button
            onClick={exportShip}
            className="px-3 py-1.5 text-xs rounded border border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            Export JSON
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="px-3 py-1.5 text-xs rounded border border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            Import JSON
          </button>
        </div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 align-middle" />Weapon</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5 align-middle" />Thruster</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1.5 align-middle" />Misc</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1.5 align-middle" />Command</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1.5 align-middle" />Power</span>
          <span className="text-gray-700">right-click = delete</span>
        </div>
      </div>

      {/* SVG editor */}
      <div className="border border-gray-700 rounded overflow-hidden bg-gray-950 w-8/12">
        <svg
          ref={svgRef}
          viewBox={VIEW_BOX}
          className="w-full select-none"
          style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}`, cursor: tool === "select" ? "default" : "crosshair" }}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUp}
          onPointerLeave={onSvgPointerUp}
          onClick={onSvgClick}
        >
          {/* Grid */}
          <path d={gridPath.join(" ")} stroke="#111827" strokeWidth={0.25} fill="none" />

          {/* Axes */}
          <line x1={VIEW_MIN_X} y1={0} x2={-VIEW_MIN_X} y2={0} stroke="#1f2937" strokeWidth={0.5} />
          <line x1={0} y1={VIEW_MIN_Y} x2={0} y2={-VIEW_MIN_Y} stroke="#1f2937" strokeWidth={0.5} />

          {/* Forward direction label */}
          <text x={-VIEW_MIN_X - 4} y={-2} fontSize={6} fill="#374151" textAnchor="end">fwd →</text>

          {/* Hull polygon */}
          <polygon
            points={hullPoints}
            fill="rgba(60,100,60,0.3)"
            stroke="rgba(100,200,100,0.65)"
            strokeWidth={0.8}
            strokeLinejoin="round"
          />

          {/* Hardpoint circles (rendered beneath vertex handles) */}
          {allSlots.map((slot, i) => (
            <circle
              key={`hp-${i}`}
              cx={slot.hardpoint.x}
              cy={slot.hardpoint.y}
              r={4.5}
              fill={SLOT_FILL[slot.type]}
              stroke={SLOT_STROKE[slot.type]}
              strokeWidth={0.7}
              style={{ cursor: tool === "select" ? "grab" : "default" }}
              onPointerDown={e => onHardpointPointerDown(e, i)}
              onContextMenu={e => onHardpointContextMenu(e, i)}
            />
          ))}

          {/* Hull vertex handles */}
          {hull.map((v, i) => (
            <circle
              key={`v-${i}`}
              cx={v.x}
              cy={v.y}
              r={3}
              fill="#374151"
              stroke="#6b7280"
              strokeWidth={0.7}
              style={{ cursor: tool === "select" ? "grab" : "default" }}
              onPointerDown={e => onVertexPointerDown(e, i)}
              onContextMenu={e => onVertexContextMenu(e, i)}
            />
          ))}
        </svg>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        Changes are live — the workshop and combat views update automatically.
      </p>

      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onImportFile}
      />
    </main>
  );
}
