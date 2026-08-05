import assert from "node:assert/strict";

// localStorage stub — no module touches storage at import time, only inside functions
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
  key: () => null,
  get length() { return store.size; },
};

import { runReducer } from "../src/context/run-state/run-state.internal";
import { saveRun, loadRun, clearSave, parseRunState } from "../src/save/save";
import { getItemDef, itemFitsSlot } from "../src/items/index";
import { CH_SLP, emptyFit, getHullDef } from "../src/ships/index";

// ── hull + items ──────────────────────────────────────────────
assert.equal(getHullDef("ch-slp")?.name, "CH-SLP");
assert.equal(CH_SLP.slots.length, 17);
assert.equal(emptyFit(CH_SLP).equipped.length, 17);

const thruster = getItemDef("basic-thruster");
const weapon = getItemDef("basic-weapon");
assert.ok(thruster && weapon);
const thrusterSlot = CH_SLP.slots[6];
const weaponSlot = CH_SLP.slots[0];
const weakUtilitySlot = CH_SLP.slots[11];
assert.equal(itemFitsSlot(thruster, thrusterSlot), true, "thruster fits thruster slot");
assert.equal(itemFitsSlot(thruster, weaponSlot), false, "thruster does not fit weapon slot");
assert.equal(itemFitsSlot(weapon, weakUtilitySlot), false, "weapon does not fit utility slot");

// ── run lifecycle reducer ─────────────────────────────────────
let state = runReducer({ phase: "menu", run: null }, { type: "start", seed: 1234 });
assert.equal(state.phase, "active");
assert.ok(state.run);
assert.equal(state.run.sector, 1);
assert.equal(state.run.seed, 1234);
assert.equal(state.run.ship.hullId, "ch-slp");

state = runReducer(state, { type: "set-screen", screen: "refit" });
assert.equal(state.run?.screen, "refit");

state = runReducer(state, { type: "patch", patch: { credits: 999, visas: 1 } });
assert.equal(state.run?.credits, 999);

// ── save / load round trip ────────────────────────────────────
assert.equal(loadRun(), null, "no save yet");
saveRun(state.run!);
const loaded = loadRun();
assert.deepEqual(loaded, state.run, "round trip preserves the run");

// tampered save: unknown item id dropped, junk rejected
const raw = JSON.parse(store.get("space-rogue.save.v2")!);
raw.run.ship.equipped[0] = "no-such-item";
raw.run.cargo = ["basic-weapon", "nonsense"];
assert.equal(parseRunState(raw.run)?.ship.equipped[0], null, "unknown equipped id dropped");
assert.deepEqual(parseRunState(raw.run)?.cargo, ["basic-weapon"], "unknown cargo id dropped");
assert.equal(parseRunState({ seed: "nope" }), null, "garbage rejected");
assert.equal(parseRunState({ ...raw.run, ship: { hullId: "ghost-hull", equipped: [], hullHp: 1 } }), null, "unknown hull rejects save");

// die / abandon clear-down
state = runReducer(state, { type: "die" });
assert.equal(state.phase, "dead");
state = runReducer(state, { type: "back-to-menu" });
assert.equal(state.phase, "menu");
clearSave();
assert.equal(loadRun(), null, "cleared");

console.log("phase0 foundations: all assertions passed");
