import { useState } from "react";
import { NodeKind, Route, RunScreen, type MapNode, type RunState } from "../types";
import { useMetaState } from "../context/meta-state";
import { useRunState } from "../context/run-state";
import { getHullDef } from "../ships";
import { getItemDef, resolveItems } from "../items";
import { PLAYER_SPAWN } from "../rendering/combat";
import { authorityEncounter, raiderEncounter } from "../run/encounters";
import { CombatStage, STAGE_CONTROLS_HINT, type CombatResult, type StageEnemy } from "./combat-stage";
import { FitWorkshop } from "./workshop-view";

const VISA_PRICE = 40;
const REPAIR_PRICE_FULL = 60;

const SCREEN_LABEL: Record<RunScreen, string> = {
  map: "Map",
  refit: "Refit",
  arena: "Arena",
};

const NODE_COLOR: Record<NodeKind, string> = {
  empty: "#6b7280",
  combat: "#e05a5a",
  station: "#eab308",
  gate: "#c084fc",
};

const NODE_LABEL: Record<NodeKind, string> = {
  empty: "Empty space",
  combat: "Hostiles",
  station: "Station",
  gate: "Sector gate",
};

// ── Map screen ────────────────────────────────────────────────────────────────

function SectorMapScreen({ run }: { run: RunState }) {
  const { jumpTo, patchRun } = useRunState();
  const nodes = run.map.nodes;
  const current = nodes.find(n => n.id === run.map.current);
  const hull = getHullDef(run.ship.hullId);

  function tryJump(node: MapNode) {
    if (!current?.links.includes(node.id)) return;
    if (run.visas <= 0 && !window.confirm(
      "No jump visas left. Jumping without one WILL summon the authorities — they are not a fight, they are a sentence. Jump anyway?",
    )) return;
    if (node.kind === NodeKind.Gate && !window.confirm(
      "Jump through the sector gate? There is no coming back.",
    )) return;
    jumpTo(node.id);
  }

  const station = current?.kind === NodeKind.Station ? current : null;

  return <div className="flex gap-4 w-full max-w-5xl flex-1 min-h-0">
    {/* The map */}
    <svg viewBox="0 0 100 62" className="border border-gray-800 rounded-xl bg-gray-950 flex-1 min-w-0 self-start select-none">
      {/* Edges */}
      {nodes.flatMap(n => n.links
        .filter(l => l > n.id)
        .map(l => {
          const o = nodes.find(m => m.id === l);
          return o === undefined ? null : (
            <line
              key={`${n.id}-${l}`}
              x1={n.pos.x * 100} y1={n.pos.y * 60 + 1}
              x2={o.pos.x * 100} y2={o.pos.y * 60 + 1}
              stroke="#1f2937" strokeWidth={0.4}
            />
          );
        }))}

      {/* Nodes */}
      {nodes.map(n => {
        const isCurrent = n.id === run.map.current;
        const adjacent = current?.links.includes(n.id) ?? false;
        const dim = n.kind === NodeKind.Combat && n.cleared;
        return (
          <g
            key={n.id}
            onClick={() => tryJump(n)}
            style={{ cursor: adjacent ? "pointer" : "default" }}
          >
            {adjacent ? (
              <circle cx={n.pos.x * 100} cy={n.pos.y * 60 + 1} r={3.2}
                fill="none" stroke="rgba(120,175,255,0.5)" strokeWidth={0.4}>
                <animate attributeName="r" values="2.8;3.6;2.8" dur="1.6s" repeatCount="indefinite" />
              </circle>
            ) : null}
            <circle
              cx={n.pos.x * 100} cy={n.pos.y * 60 + 1} r={2}
              fill={NODE_COLOR[n.kind]}
              opacity={dim ? 0.35 : 1}
            />
            {isCurrent ? (
              <circle cx={n.pos.x * 100} cy={n.pos.y * 60 + 1} r={2.9}
                fill="none" stroke="#fff" strokeWidth={0.45} />
            ) : null}
          </g>
        );
      })}
    </svg>

    {/* Side panel — scrolls internally, never the page */}
    <aside className="w-72 flex flex-col gap-3 text-sm overflow-y-auto min-h-0">
      <div className="border border-gray-800 rounded-xl bg-gray-950 p-3">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Current system</p>
        <p>{current !== undefined ? NODE_LABEL[current.kind] : "?"}</p>
        <p className="text-xs text-gray-600 mt-1">
          {run.visas > 0
            ? `${run.visas} visa${run.visas === 1 ? "" : "s"} — jumps are legal`
            : "No visas — the next jump is illegal"}
        </p>
      </div>

      {station !== null && hull !== null ? (
        <StationPanel run={run} station={station} patchRun={patchRun} cargoCapacity={hull.cargoCapacity} />
      ) : null}

      <div className="border border-gray-800 rounded-xl bg-gray-950 p-3 text-xs text-gray-600">
        <p>Click a pulsing node to jump (1 visa).</p>
        <p className="mt-1">Red = hostiles · yellow = station · purple = sector gate.</p>
      </div>
    </aside>
  </div>;
}

// ── Station panel ─────────────────────────────────────────────────────────────

function StationPanel({ run, station, patchRun, cargoCapacity }: {
  run: RunState;
  station: MapNode;
  patchRun: (patch: Partial<RunState>) => void;
  cargoCapacity: number;
}) {
  const stock = station.stock ?? [];
  const cargoFull = run.cargo.length >= cargoCapacity;
  const missingHull = 1 - run.ship.hullHp;
  const repairCost = Math.ceil(missingHull * REPAIR_PRICE_FULL);

  function updateStock(nextStock: string[], patch: Partial<RunState>) {
    patchRun({
      ...patch,
      map: {
        ...run.map,
        nodes: run.map.nodes.map(n => (n.id === station.id ? { ...n, stock: nextStock } : n)),
      },
    });
  }

  function buy(index: number) {
    const id = stock[index];
    const def = getItemDef(id);
    if (!def || run.credits < def.price || cargoFull) return;
    updateStock(
      stock.filter((_, i) => i !== index),
      { credits: run.credits - def.price, cargo: [...run.cargo, id] },
    );
  }

  function sell(index: number) {
    const id = run.cargo[index];
    const def = getItemDef(id);
    if (!def) return;
    patchRun({
      credits: run.credits + Math.floor(def.price / 2),
      cargo: run.cargo.filter((_, i) => i !== index),
    });
  }

  return <div className="border border-yellow-900 rounded-xl bg-gray-950 p-3 flex flex-col gap-2">
    <p className="text-xs uppercase tracking-widest text-yellow-600">Station services</p>

    <button type="button"
      className="text-left px-2 py-1.5 rounded border border-blue-900 text-blue-300 hover:bg-blue-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      disabled={run.credits < VISA_PRICE}
      onClick={() => patchRun({ credits: run.credits - VISA_PRICE, visas: run.visas + 1 })}
    >
      Buy jump visa — {VISA_PRICE} cr
    </button>

    <button type="button"
      className="text-left px-2 py-1.5 rounded border border-green-900 text-green-300 hover:bg-green-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      disabled={missingHull <= 0.001 || run.credits < repairCost}
      onClick={() => patchRun({ credits: run.credits - repairCost, ship: { ...run.ship, hullHp: 1 } })}
    >
      {missingHull <= 0.001 ? "Hull intact" : `Repair hull — ${repairCost} cr`}
    </button>

    <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">For sale</p>
    {stock.length === 0 ? <p className="text-xs text-gray-600">Sold out.</p> : stock.map((id, i) => {
      const def = getItemDef(id);
      if (!def) return null;
      const affordable = run.credits >= def.price;
      return (
        <button type="button" key={`${id}-${i}`}
          className="text-left px-2 py-1.5 rounded border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!affordable || cargoFull}
          onClick={() => buy(i)}
        >
          {def.name} — {def.price} cr
          {cargoFull ? <span className="block text-[10px] text-red-500">cargo full</span> : null}
        </button>
      );
    })}

    <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">Sell from hold (half price)</p>
    {run.cargo.length === 0 ? <p className="text-xs text-gray-600">Hold is empty.</p> : run.cargo.map((id, i) => {
      const def = getItemDef(id);
      if (!def) return null;
      return (
        <button type="button" key={`${id}-${i}`}
          className="text-left px-2 py-1.5 rounded border border-gray-800 text-gray-400 hover:bg-gray-800 transition-colors"
          onClick={() => sell(i)}
        >
          {def.name} — {Math.floor(def.price / 2)} cr
        </button>
      );
    })}
  </div>;
}

// ── Arena screen ──────────────────────────────────────────────────────────────

function ArenaScreen({ run }: { run: RunState }) {
  const { patchRun, die } = useRunState();
  const [result, setResult] = useState<CombatResult | null>(null);
  const [taken, setTaken] = useState<string[]>([]);

  const hull = getHullDef(run.ship.hullId);
  if (hull === null) return <p className="text-red-400">Unknown hull — corrupted run.</p>;

  const node = run.map.nodes.find(n => n.id === run.map.current);
  const enemies: StageEnemy[] = (run.alert
    ? authorityEncounter(run.seed, run.sector, PLAYER_SPAWN)
    : raiderEncounter(run.seed, run.sector, node?.id ?? 0, PLAYER_SPAWN)
  ).map(e => ({
    hull: getHullDef(e.hullId) ?? hull,
    equipped: resolveItems(e.equipped),
    pos: e.pos,
  }));

  const capacity = hull.cargoCapacity;
  const holdCount = run.cargo.length + taken.length;

  function finishFight(outcome: CombatResult, tookItems: string[]) {
    const clearedNodes = outcome.status === "victory" && node !== undefined && node.kind === NodeKind.Combat
      ? run.map.nodes.map(n => (n.id === node.id ? { ...n, cleared: true } : n))
      : run.map.nodes;
    patchRun({
      ship: { ...run.ship, hullHp: Math.max(0.01, outcome.hullFraction) },
      cargo: [...run.cargo, ...tookItems],
      map: { ...run.map, nodes: clearedNodes },
      alert: false,
      screen: RunScreen.Map,
    });
  }

  function onEnd(r: CombatResult) {
    if (r.status === "defeat") {
      die();
      return;
    }
    if (r.status === "escaped") {
      finishFight(r, []);
      return;
    }
    setResult(r); // victory → salvage panel
  }

  const remainingLoot = result?.lootItemIds.filter((_, i) => !taken.includes(`${i}`)) ?? [];

  return <div className="relative max-w-fit">
    {run.alert ? (
      <p className="mb-2 text-sm text-red-400 font-mono animate-pulse">
        AUTHORITY RESPONSE IN PROGRESS — you cannot win this. Spool the jump drive (4).
      </p>
    ) : null}

    <CombatStage
      hull={hull}
      equipped={resolveItems(run.ship.equipped)}
      hullFraction={run.ship.hullHp}
      enemies={enemies}
      onEnd={onEnd}
    />
    <p className="mt-2 text-xs text-gray-600 font-mono max-w-2xl">{STAGE_CONTROLS_HINT}</p>

    {/* Salvage panel */}
    {result !== null ? (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-gray-950 border border-gray-700 rounded-xl p-4 w-80 flex flex-col gap-2 shadow-2xl">
          <p className="text-xs uppercase tracking-widest text-yellow-500">Salvage</p>
          <p className="text-xs text-gray-500">Hold {holdCount}/{capacity}</p>
          {result.lootItemIds.length === 0
            ? <p className="text-sm text-gray-600">Nothing worth taking survived.</p>
            : result.lootItemIds.map((id, i) => {
              const def = getItemDef(id);
              const isTaken = taken.includes(`${i}`);
              if (!def || isTaken) return null;
              return (
                <button type="button" key={i}
                  className="text-left px-2 py-1.5 rounded border border-gray-700 text-gray-200 hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={holdCount >= capacity}
                  onClick={() => setTaken(prev => [...prev, `${i}`])}
                >
                  Take {def.name}
                </button>
              );
            })}
          {remainingLoot.length === 0 && result.lootItemIds.length > 0
            ? <p className="text-xs text-gray-600">All taken.</p>
            : null}
          <button type="button"
            className="mt-1 px-2 py-2 rounded border border-green-800 text-green-300 hover:bg-green-950 transition-colors"
            onClick={() => finishFight(
              result,
              taken.map(k => result.lootItemIds[Number(k)]),
            )}
          >
            Done — back to the map
          </button>
        </div>
      </div>
    ) : null}
  </div>;
}

// ── Run view shell ────────────────────────────────────────────────────────────

export function RunView() {
  const { setRoute } = useMetaState();
  const { phase, run, setScreen, backToMenu, patchRun } = useRunState();

  if (phase === "dead" && run !== null) {
    return <main className="p-6 flex flex-col items-center gap-4 pt-24">
      <h2 className="text-2xl font-semibold tracking-widest uppercase text-red-400">Ship destroyed</h2>
      <div className="text-sm text-gray-400 text-center leading-relaxed">
        <p>Reached sector {run.sector}.</p>
        <p>{run.credits} cr aboard · {run.cargo.length} items in the hold · {run.visas} unused visas.</p>
        <p className="text-xs text-gray-600 font-mono mt-2">seed {run.seed}</p>
      </div>
      <button type="button"
        className="px-4 py-3 rounded border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 transition-colors"
        onClick={() => {
          backToMenu();
          setRoute(Route.Menu);
        }}
      >
        Back to menu
      </button>
    </main>;
  }

  if (phase !== "active" || run === null) {
    return <main className="p-6 flex flex-col items-center gap-6 pt-24">
      <p className="text-sm text-gray-500">No active run.</p>
      <button type="button"
        className="px-4 py-3 rounded border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 transition-colors"
        onClick={() => setRoute(Route.Menu)}
      >
        Back to menu
      </button>
    </main>;
  }

  const hull = getHullDef(run.ship.hullId);
  const inArena = run.screen === RunScreen.Arena;

  return <main className="p-6 flex flex-col gap-4 items-stretch w-full max-w-6xl mx-auto min-h-0 overflow-hidden">
    {/* Run header */}
    <div className="flex items-center gap-6 text-sm">
      <span className="uppercase tracking-widest text-gray-500">Sector {run.sector}</span>
      <span className="text-yellow-400">{run.credits} cr</span>
      <span className="text-blue-300">{run.visas} visas</span>
      <span className="text-green-400">hull {Math.round(run.ship.hullHp * 100)}%</span>
      <span className="text-gray-600">cargo {run.cargo.length}/{hull?.cargoCapacity ?? "?"}</span>
      <span className="ml-auto text-xs text-gray-700 font-mono">seed {run.seed}</span>
    </div>

    {/* Screen tabs — locked while a fight is on */}
    <div className="flex rounded overflow-hidden border border-gray-700 w-fit">
      {Object.values(RunScreen).map((screen) => (
        <button type="button"
          key={screen}
          disabled={inArena ? screen !== RunScreen.Arena : false}
          className={`px-4 py-1.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${run.screen === screen
            ? "bg-gray-700 text-white"
            : "bg-gray-900 text-gray-400 hover:bg-gray-800"
            }`}
          onClick={() => setScreen(screen)}
        >
          {SCREEN_LABEL[screen]}
        </button>
      ))}
    </div>

    {run.screen === RunScreen.Map ? <SectorMapScreen run={run} /> : null}
    {run.screen === RunScreen.Refit && hull !== null ? (
      <FitWorkshop
        hull={hull}
        equipped={run.ship.equipped}
        inventory={run.cargo}
        onUpdate={(next) => patchRun({
          ship: { ...run.ship, equipped: next.equipped },
          cargo: next.inventory,
        })}
      />
    ) : null}
    {inArena ? <ArenaScreen key={`${run.sector}-${run.map.current}-${String(run.alert)}`} run={run} /> : null}
  </main>;
}
