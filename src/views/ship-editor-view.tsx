import { useRef, useState } from "react";
import { useGameState } from "../context/game-state";
import { ItemCategory, isItemCategory, isObj, isV2, type HullDef, type HullSlotDef, type V2 } from "../types";
import { isFactionId } from "../factions";

const VIEW_W = 300;
const VIEW_H = 200;
const VIEW_MIN_X = -150;
const VIEW_MIN_Y = -100;
const VIEW_BOX = `${VIEW_MIN_X} ${VIEW_MIN_Y} ${VIEW_W} ${VIEW_H}`;

type Tool = "select" | "add-vertex" | "add-hardpoint";

type DragState =
  | { kind: "vertex"; idx: number; mirrorIdx: number | null; startPos: V2; svgStart: V2 }
  | { kind: "hardpoint"; idx: number; mirrorIdx: number | null; startPos: V2; svgStart: V2 };

/**
 * The slot palettes a hull author can place. Utility mounts accept several
 * categories on a weak hookup; core slots accept one on a solid hookup.
 */
const SLOT_PRESETS = [
  { key: "weapon", label: "Weapon", accepts: [ItemCategory.Weapon], powerRating: 2, accent: "text-red-400" },
  { key: "thruster", label: "Thruster", accepts: [ItemCategory.Thruster], powerRating: 2, accent: "text-blue-400" },
  { key: "shield", label: "Shield", accepts: [ItemCategory.Shield], powerRating: 2, accent: "text-cyan-400" },
  { key: "reactor", label: "Reactor", accepts: [ItemCategory.Reactor], powerRating: 3, accent: "text-yellow-400" },
  { key: "command", label: "Command", accepts: [ItemCategory.Command], powerRating: 2, accent: "text-purple-400" },
  { key: "utility", label: "Utility", accepts: [ItemCategory.Shield, ItemCategory.Drive], powerRating: 1, accent: "text-gray-400" },
] as const;

type PresetKey = typeof SLOT_PRESETS[number]["key"];

function presetKeyFor(slot: HullSlotDef): PresetKey {
  if (slot.accepts.length !== 1) return "utility";
  const only = slot.accepts[0];
  const match = SLOT_PRESETS.find(p => p.accepts.length === 1 && p.accepts[0] === only);
  return match?.key ?? "utility";
}

const SLOT_FILL: Record<PresetKey, string> = {
  weapon: "rgba(220,80,80,0.85)",
  thruster: "rgba(80,140,220,0.85)",
  shield: "rgba(80,200,220,0.85)",
  reactor: "rgba(220,180,80,0.85)",
  command: "rgba(180,100,220,0.85)",
  utility: "rgba(160,160,160,0.85)",
};

const SLOT_STROKE: Record<PresetKey, string> = {
  weapon: "#f87171",
  thruster: "#60a5fa",
  shield: "#22d3ee",
  reactor: "#fbbf24",
  command: "#c084fc",
  utility: "#9ca3af",
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

function findMirrorSlot(slots: HullSlotDef[], idx: number): number | null {
  const v = slots[idx].hardpoint;
  if (Math.abs(v.y) < 0.5) return null;
  const j = slots.findIndex((s, i) => i !== idx && Math.abs(s.hardpoint.x - v.x) < 4 && Math.abs(s.hardpoint.y + v.y) < 4);
  return j >= 0 ? j : null;
}

function isHullSlotDef(s: unknown): s is HullSlotDef {
  return isObj(s)
    && Array.isArray(s.accepts) && s.accepts.length > 0 && s.accepts.every(isItemCategory)
    && typeof s.powerRating === "number"
    && isV2(s.hardpoint);
}

function parseHullDef(raw: unknown): HullDef | null {
  if (!isObj(raw)) return null;
  if (typeof raw.id !== "string" || typeof raw.name !== "string" || !isFactionId(raw.faction)) return null;
  if (typeof raw.cargoCapacity !== "number") return null;
  if (!Array.isArray(raw.vertices) || !raw.vertices.every(isV2) || raw.vertices.length < 3) return null;
  if (!Array.isArray(raw.slots) || !raw.slots.every(isHullSlotDef)) return null;
  return {
    id: raw.id,
    name: raw.name,
    faction: raw.faction,
    cargoCapacity: raw.cargoCapacity,
    vertices: raw.vertices,
    slots: raw.slots,
  };
}

function ToolBtn({
  label, active, onClick, accent,
}: {
  label: string; active: boolean; onClick: () => void; accent?: string;
}) {
  return (
    <button type="button"
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
  const { hull, setHull, setEquipped } = useGameState();
  const [tool, setTool] = useState<Tool>("select");
  const [mirror, setMirror] = useState(true);
  const [addPreset, setAddPreset] = useState<PresetKey>("weapon");

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);

  const vertices = hull.vertices;
  const slots = hull.slots;

  /** Replace the slot list, keeping the equipped array aligned index-for-index. */
  function setSlots(mapEquipped: (prevEquipped: (string | null)[]) => (string | null)[], newSlots: HullSlotDef[]) {
    setHull(prev => ({ ...prev, slots: newSlots }));
    setEquipped(mapEquipped);
  }

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
      mirrorIdx: mirror ? findMirrorVertex(vertices, idx) : null,
      startPos: { ...vertices[idx] },
      svgStart: getSvgPoint(e),
    };
  }

  function onHardpointPointerDown(e: React.PointerEvent, idx: number) {
    if (tool !== "select") return;
    e.stopPropagation();
    svgRef.current!.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "hardpoint", idx,
      mirrorIdx: mirror ? findMirrorSlot(slots, idx) : null,
      startPos: { ...slots[idx].hardpoint },
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
      const newVertices = vertices.map((v, i) => {
        if (i === drag.idx) return { ...newPos };
        if (drag.mirrorIdx !== null && i === drag.mirrorIdx) return { x: newPos.x, y: -newPos.y };
        return v;
      });
      setHull(prev => ({ ...prev, vertices: newVertices }));

    } else {
      const newSlots = slots.map((s, i) => {
        if (i === drag.idx) return { ...s, hardpoint: { ...newPos } };
        if (drag.mirrorIdx !== null && i === drag.mirrorIdx) return { ...s, hardpoint: { x: newPos.x, y: -newPos.y } };
        return s;
      });
      setHull(prev => ({ ...prev, slots: newSlots }));
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
      const idx = insertionIndex(vertices, pt);
      const newVertices = [...vertices];
      newVertices.splice(idx, 0, { ...pt });
      if (mirror && Math.abs(pt.y) > 0.5) {
        const mirrorPt = { x: pt.x, y: -pt.y };
        newVertices.splice(insertionIndex(newVertices, mirrorPt), 0, mirrorPt);
      }
      setHull(prev => ({ ...prev, vertices: newVertices }));
    }

    if (tool === "add-hardpoint") {
      const preset = SLOT_PRESETS.find(p => p.key === addPreset) ?? SLOT_PRESETS[0];
      const added: HullSlotDef[] = [
        { accepts: [...preset.accepts], powerRating: preset.powerRating, hardpoint: { ...pt } },
      ];
      if (mirror && Math.abs(pt.y) > 0.5) {
        added.push({ accepts: [...preset.accepts], powerRating: preset.powerRating, hardpoint: { x: pt.x, y: -pt.y } });
      }
      setSlots(prev => [...prev, ...added.map(() => null)], [...slots, ...added]);
    }
  }

  // ── right-click to delete ────────────────────────────────────────────────────

  function onVertexContextMenu(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    const mirrorIdx = mirror ? findMirrorVertex(vertices, idx) : null;
    const toRemove = new Set([idx, ...(mirrorIdx !== null ? [mirrorIdx] : [])]);
    const newVertices = vertices.filter((_, i) => !toRemove.has(i));
    if (newVertices.length < 3) return; // keep at least triangle
    setHull(prev => ({ ...prev, vertices: newVertices }));
  }

  function onHardpointContextMenu(e: React.MouseEvent, idx: number) {
    e.preventDefault();
    const mirrorIdx = mirror ? findMirrorSlot(slots, idx) : null;
    const toRemove = new Set([idx, ...(mirrorIdx !== null ? [mirrorIdx] : [])]);
    setSlots(
      prev => prev.filter((_, i) => !toRemove.has(i)),
      slots.filter((_, i) => !toRemove.has(i)),
    );
  }

  // ── import / export ─────────────────────────────────────────────────────────

  function exportHull() {
    const round = (n: number) => +n.toFixed(2);
    const roundV2 = (v: V2): V2 => ({ x: round(v.x), y: round(v.y) });
    const clean: HullDef = {
      ...hull,
      vertices: hull.vertices.map(roundV2),
      slots: hull.slots.map(s => ({ ...s, hardpoint: roundV2(s.hardpoint) })),
    };
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${hull.id}.json`;
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
        const imported = parseHullDef(JSON.parse(reader.result as string));
        if (imported) {
          setHull(imported);
          setEquipped(imported.slots.map(() => null));
        } else {
          alert("Invalid HullDef JSON — expected id, name, faction, cargoCapacity, vertices, slots.");
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

  const hullPoints = vertices.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(" ");

  return (
    <main className="p-6">
      <h2 className="text-lg font-semibold mb-4">Ship Editor <span className="text-gray-600 text-sm font-normal">({hull.name})</span></h2>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">

        {/* Tool selector */}
        <div className="flex rounded overflow-hidden border border-gray-700">
          <ToolBtn label="Select (drag)" active={tool === "select"} onClick={() => setTool("select")} />
          <ToolBtn label="Add Vertex" active={tool === "add-vertex"} onClick={() => setTool("add-vertex")} />
          <ToolBtn label="Add Hardpoint" active={tool === "add-hardpoint"} onClick={() => setTool("add-hardpoint")} />
        </div>

        {/* Slot-preset picker — only when add-hardpoint is active */}
        {tool === "add-hardpoint" && (
          <div className="flex rounded overflow-hidden border border-gray-700">
            {SLOT_PRESETS.map(preset => (
              <ToolBtn
                key={preset.key}
                label={preset.label}
                active={addPreset === preset.key}
                onClick={() => setAddPreset(preset.key)}
                accent={preset.accent}
              />
            ))}
          </div>
        )}

        {/* Mirror toggle */}
        <button type="button"
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
          <button type="button"
            onClick={exportHull}
            className="px-3 py-1.5 text-xs rounded border border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 transition-colors"
          >
            Export JSON
          </button>
          <button type="button"
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
          <span><span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-1.5 align-middle" />Shield</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1.5 align-middle" />Reactor</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-1.5 align-middle" />Command</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1.5 align-middle" />Utility</span>
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
          {slots.map((slot, i) => (
            <circle
              key={`hp-${i}`}
              cx={slot.hardpoint.x}
              cy={slot.hardpoint.y}
              r={4.5}
              fill={SLOT_FILL[presetKeyFor(slot)]}
              stroke={SLOT_STROKE[presetKeyFor(slot)]}
              strokeWidth={0.7}
              style={{ cursor: tool === "select" ? "grab" : "default" }}
              onPointerDown={e => onHardpointPointerDown(e, i)}
              onContextMenu={e => onHardpointContextMenu(e, i)}
            />
          ))}

          {/* Hull vertex handles */}
          {vertices.map((v, i) => (
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
        Changes are live — the workshop and combat views update automatically. Export produces the HullDef format.
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
