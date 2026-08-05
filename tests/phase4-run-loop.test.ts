import assert from "node:assert/strict";
import { generateSectorMap } from "../src/run/map-gen";
import { raiderEncounter, authorityEncounter } from "../src/run/encounters";
import { runReducer, newRun, type RunStoreState } from "../src/context/run-state/run-state.internal";
import { isItemId, resolveItems } from "../src/items/index";
import { Ship } from "../src/rendering/combat/ship";
import { Arena } from "../src/rendering/combat/arena";
import { AsteroidBelt } from "../src/rendering/combat/asteroid-belt";
import { CH_SLP } from "../src/ships/index";
import { NodeKind, type RunState } from "../src/types/index";
import { saveRun, loadRun } from "../src/save/save";

// localStorage stub for the save round-trip (no module touches storage at import time)
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
  key: () => null,
  get length() { return store.size; },
};

// ── map generation ────────────────────────────────────────────
{
  const a = generateSectorMap(1234, 1);
  const b = generateSectorMap(1234, 1);
  assert.deepEqual(a, b, "same seed+sector → identical map");
  const c = generateSectorMap(1234, 2);
  assert.notDeepEqual(a.nodes.map(n => n.pos), c.nodes.map(n => n.pos), "next sector differs");

  for (const seed of [1, 42, 999999, 2 ** 30]) {
    const map = generateSectorMap(seed, 1);
    const n = map.nodes.length;
    assert.ok(n >= 10 && n <= 14, `node count in range (got ${n})`);
    assert.equal(map.current, 0);
    assert.equal(map.nodes[0].kind, NodeKind.Empty, "start is safe");
    assert.equal(map.nodes[n - 1].kind, NodeKind.Gate, "gate at the end");
    assert.equal(map.nodes.filter(x => x.kind === NodeKind.Gate).length, 1, "exactly one gate");

    // Connectivity: BFS from start reaches everything
    const seen = new Set<number>([0]);
    const queue = [0];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const link of map.nodes[id].links) {
        if (!seen.has(link)) { seen.add(link); queue.push(link); }
      }
    }
    assert.equal(seen.size, n, `map fully connected (seed ${seed})`);

    // Symmetric links, stations stocked, threat intel + factions assigned
    for (const node of map.nodes) {
      for (const link of node.links) {
        assert.ok(map.nodes[link].links.includes(node.id), "links are undirected");
      }
      if (node.kind === NodeKind.Station) {
        assert.equal(node.stock?.length, 4, "stations carry 4 items");
        assert.ok(node.stock!.every(isItemId), "stock ids are real items");
        assert.equal(node.faction, "traders", "stations belong to the traders");
      }
      if (node.kind === NodeKind.Combat) {
        assert.ok(node.enemies >= 1 && node.enemies <= 5, "hostile nodes carry a pack size");
        assert.equal(node.faction, "outlaws", "raiders are outlaws");
      } else {
        assert.equal(node.enemies, 0, "peaceful nodes have no hostiles");
      }
      assert.equal(node.cleared, node.kind !== NodeKind.Combat, "only combat starts uncleared");
    }
  }
}

// ── run reducer: legal jump, illegal jump, gate ───────────────
{
  let state: RunStoreState = runReducer({ phase: "menu", run: null }, { type: "start", seed: 777 });
  assert.equal(state.phase, "active");
  const run0 = state.run as RunState;
  assert.equal(run0.visas, 3);
  assert.equal(run0.ship.hullHp, 1);
  assert.ok(run0.ship.equipped.includes("basic-cockpit"), "starter kit aboard");

  // Legal jump to an adjacent node
  const firstHop = run0.map.nodes[0].links[0];
  state = runReducer(state, { type: "jump", nodeId: firstHop });
  let run = state.run as RunState;
  assert.equal(run.map.current, firstHop, "moved");
  assert.equal(run.visas, 2, "visa spent");
  assert.equal(run.alert, false);
  const hopKind = run.map.nodes[firstHop].kind;
  const expectArena = hopKind === NodeKind.Combat && !run.map.nodes[firstHop].cleared;
  assert.equal(run.screen === "arena", expectArena, "combat routes to the arena");

  // Non-adjacent jump is a no-op
  const far = run.map.nodes.findLast(n => !run.map.nodes[firstHop].links.includes(n.id) && n.id !== firstHop)!;
  const before = run;
  state = runReducer(state, { type: "jump", nodeId: far.id });
  assert.deepEqual(state.run, before, "cannot jump beyond links");

  // Illegal jump: drain visas, jump → alert + arena
  state = runReducer(state, { type: "patch", patch: { visas: 0, screen: "map" } });
  const next = (state.run as RunState).map.nodes[firstHop].links[0];
  state = runReducer(state, { type: "jump", nodeId: next });
  run = state.run as RunState;
  assert.equal(run.alert, true, "authorities summoned");
  assert.equal(run.screen, "arena", "straight into the ambush");
  assert.equal(run.visas, 0, "no visa spent on an illegal jump");

  // Gate: teleport the ship next to the gate and walk through
  const gate = run.map.nodes[run.map.nodes.length - 1];
  const gateNeighbor = gate.links[0];
  state = runReducer(state, {
    type: "patch",
    patch: { alert: false, screen: "map", visas: 1, map: { ...run.map, current: gateNeighbor } },
  });
  state = runReducer(state, { type: "jump", nodeId: gate.id });
  run = state.run as RunState;
  assert.equal(run.sector, 2, "sector advanced");
  assert.equal(run.map.current, 0, "fresh map, back at the start node");
  assert.equal(run.alert, false, "the gate wipes the record");
  assert.deepEqual(run.map, generateSectorMap(777, 2), "sector 2 map is the seeded one");
}

// ── encounters scale and stay deterministic ───────────────────
{
  const spawn = { x: 4000, y: 4000 };
  const s1 = raiderEncounter(777, 1, 3, spawn);
  const s1again = raiderEncounter(777, 1, 3, spawn);
  assert.deepEqual(s1, s1again, "encounters are seeded");
  assert.equal(s1.length, 2, "sector 1: two raiders");

  const s5 = raiderEncounter(777, 5, 3, spawn);
  assert.ok(s5.length > s1.length, "later sectors bring more ships");
  assert.ok(s5.length <= 5, "capped at 5");

  for (const e of [...s1, ...s5]) {
    assert.ok(e.equipped.filter(id => id !== null).every(id => isItemId(id)), "raider gear is real");
    const d = Math.hypot(e.pos.x - spawn.x, e.pos.y - spawn.y);
    assert.ok(d >= 1000, `spawns keep their distance (got ${Math.round(d)})`);
  }

  const authorities = authorityEncounter(777, 1, spawn);
  assert.equal(authorities.length, 3, "three flagships");
  const shieldCount = authorities[0].equipped.filter(id => id === "basic-shield").length;
  assert.equal(shieldCount, 4, "authority ships are quadruple-shielded");
}

// ── save round-trip with the full run shape ───────────────────
{
  const run = newRun(31337);
  run.ship.hullHp = 0.42;
  run.cargo.push("basic-weapon");
  saveRun(run);
  assert.deepEqual(loadRun(), run, "map, stock, hull damage, and cargo all survive the round trip");
}

// ── persistent hull damage reaches the arena ──────────────────
{
  const ship = new Ship({ x: 0, y: 0 }, CH_SLP, [], "player", 0.5);
  assert.ok(Math.abs(ship.hullFraction - 0.5) < 1e-9, "ship starts at persisted hull integrity");
}

// ── dev kill-all routes through the normal death path ─────────
{
  const realRandom = Math.random;
  Math.random = () => 0.3; // guaranteed loot rolls
  const belt = new AsteroidBelt(8000, 8000, 400, 0);
  const idle = { update: () => ({ thrust: 0, turn: 0, aimWorld: null, fire: false, powerMode: null }) };
  const pad17 = (ids: (string | null)[]) => { const f = [...ids]; while (f.length < 17) f.push(null); return f; };
  const arena = new Arena(belt, [
    { hull: CH_SLP, equipped: resolveItems(pad17([null])), pos: { x: 4000, y: 4000 }, team: "player", control: idle },
    { hull: CH_SLP, equipped: resolveItems(pad17(["basic-weapon", "basic-shield"])), pos: { x: 5000, y: 4000 }, team: "enemy", control: idle },
    { hull: CH_SLP, equipped: resolveItems(pad17(["basic-thruster"])), pos: { x: 5500, y: 4500 }, team: "enemy", control: idle },
  ]);
  arena.killAllEnemies();
  assert.equal(arena.enemiesAlive, 0, "kill-all clears the field");
  assert.equal(arena.status, "victory");
  assert.equal(arena.loot.length, 3, "loot still drops through the normal death path");
  Math.random = realRandom;
}

console.log("phase4 run loop: all assertions passed");
