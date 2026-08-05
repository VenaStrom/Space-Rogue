import assert from "node:assert/strict";
import { Arena } from "../src/rendering/combat/arena";
import { AsteroidBelt } from "../src/rendering/combat/asteroid-belt";
import { Camera } from "../src/rendering/combat/camera";
import { Ship } from "../src/rendering/combat/ship";
import { BridgeControl, IDLE_INTENTS, type ControlIntents } from "../src/rendering/combat/control";
import { resolveItems, type ItemDef } from "../src/items/index";
import { CH_SLP } from "../src/ships/index";
import { CommandKind } from "../src/types/index";

function fit(ids: (string | null)[]): (ItemDef | null)[] {
  const full = [...ids];
  while (full.length < 17) full.push(null);
  return resolveItems(full);
}

const fakeCanvas = { width: 800, height: 600 } as unknown as HTMLCanvasElement;
const intentsWith = (over: Partial<ControlIntents>): ControlIntents => ({ ...IDLE_INTENTS, ...over });

// ── command capability getters ────────────────────────────────
{
  const bridged = new Ship({ x: 0, y: 0 }, CH_SLP, fit([
    null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, "field-bridge", null, "relay-reactor",
  ]));
  assert.equal(bridged.commandKind, CommandKind.Bridge);
  assert.equal(bridged.manualFireAllowed, false);
  assert.equal(bridged.navPointLimit, 3);

  const bare = new Ship({ x: 0, y: 0 }, CH_SLP, fit([null]));
  assert.equal(bare.commandKind, CommandKind.Cockpit, "bare hull falls back to direct control");
  assert.equal(bare.manualFireAllowed, true);
  assert.equal(bare.navPointLimit, 0);
}

// ── gunner cockpit fire-rate buff ─────────────────────────────
{
  function shotsIn(steps: number, commandId: string): number {
    const ship = new Ship({ x: 0, y: 0 }, CH_SLP, fit([
      "basic-weapon", null, null, null, null, null, null, null, null, null,
      null, null, null, null, commandId, null, "relay-reactor",
    ]));
    let shots = 0;
    const aimFire = intentsWith({ aimWorld: { x: 1000, y: 0 }, fire: true });
    for (let i = 0; i < steps; i++) {
      ship.physicsUpdate(IDLE_INTENTS, 1);
      ship.updateWeapons(aimFire, 1, () => { shots++; });
    }
    return shots;
  }
  const standard = shotsIn(5400, "basic-cockpit");
  const gunner = shotsIn(5400, "gunner-cockpit");
  const ratio = gunner / standard;
  assert.ok(ratio > 1.1 && ratio < 1.3, `gunner cockpit ≈1.2× fire rate (got ${ratio.toFixed(3)}: ${gunner}/${standard})`);
}

// ── bridge autopilot: steer, arrive, respect the plot limit ───
{
  const control = new BridgeControl(fakeCanvas, new Camera());
  const ship = new Ship({ x: 0, y: 0 }, CH_SLP, fit([
    null, null, null, null, null, null,
    "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
    null, null, null, null, "field-bridge", null, "relay-reactor",
  ]));

  // Limit respected
  control.plotNav({ x: 500, y: 0 }, ship.navPointLimit);
  control.plotNav({ x: 600, y: 0 }, ship.navPointLimit);
  control.plotNav({ x: 700, y: 0 }, ship.navPointLimit);
  control.plotNav({ x: 800, y: 0 }, ship.navPointLimit);
  assert.equal(control.navPoints.length, 3, "field bridge caps the queue at 3");
  control.clearOrders();

  // Off-axis waypoint: turn toward it, no thrust while facing away
  control.plotNav({ x: 0, y: 500 }, ship.navPointLimit);
  let intents = control.update(ship, { ships: [ship] });
  assert.equal(intents.turn, 1, "hard turn toward the waypoint");
  assert.equal(intents.thrust, 0, "no burn while facing away");
  control.clearOrders();

  // Waypoint dead ahead: full burn, no turn
  control.plotNav({ x: 500, y: 0 }, ship.navPointLimit);
  intents = control.update(ship, { ships: [ship] });
  assert.ok(Math.abs(intents.turn) < 0.01, "no turn needed");
  assert.equal(intents.thrust, 1, "full burn toward a distant waypoint");
  control.clearOrders();

  // Waypoint inside arrival radius: consumed
  control.plotNav({ x: 50, y: 0 }, ship.navPointLimit);
  control.update(ship, { ships: [ship] });
  assert.equal(control.navPoints.length, 0, "arrival consumes the waypoint");
}

// ── focus target beats nearest, manual fire honors the flavor axis ──
{
  function armed(commandId: string): Ship {
    return new Ship({ x: 0, y: 0 }, CH_SLP, fit([
      "basic-weapon", null, null, null, null, null, null, null, null, null,
      null, null, null, null, commandId, null, "relay-reactor",
    ]));
  }
  const near = new Ship({ x: 300, y: 0 }, CH_SLP, fit([null]), "enemy");
  const far = new Ship({ x: 1000, y: 0 }, CH_SLP, fit([null]), "enemy");

  // Focus priority
  const control = new BridgeControl(fakeCanvas, new Camera());
  const self = armed("field-bridge");
  const world = { ships: [self, near, far] };
  let intents = control.update(self, world);
  assert.ok(Math.abs(intents.aimWorld!.x - 300) < 1, "auto-engage picks the nearest foe by default");
  control.setFocus(far);
  intents = control.update(self, world);
  assert.ok(Math.abs(intents.aimWorld!.x - 1000) < 1, "designated focus target wins over nearest");
  assert.equal(intents.fire, true);

  // Manual override: field bridge refuses, tactical bridge honors
  const rmb = { rmbDown: true };
  const fieldCtl = new BridgeControl(fakeCanvas, new Camera());
  Object.assign(fieldCtl, rmb);
  const fieldIntents = fieldCtl.update(armed("field-bridge"), world);
  assert.ok(Math.abs(fieldIntents.aimWorld!.x - 300) < 1, "no-manual-fire bridge ignores RMB and keeps auto-engaging");

  const tacticalCamera = new Camera();
  const tacticalCtl = new BridgeControl(fakeCanvas, tacticalCamera);
  Object.assign(tacticalCtl, rmb);
  const tacticalIntents = tacticalCtl.update(armed("tactical-bridge"), world);
  // Cursor sits at canvas (0,0); expected world point comes from the same camera math
  const expected = tacticalCamera.screenToWorld({ x: 0, y: 0 }, 800, 600);
  assert.ok(Math.abs(tacticalIntents.aimWorld!.x - expected.x) < 1, "manual-fire bridge aims at the cursor on RMB");

  // Tactical time
  const dilated = new BridgeControl(fakeCanvas, new Camera());
  (dilated as unknown as { held: Set<string> }).held.add(" ");
  assert.equal(dilated.timeScale, 0.25, "space dilates time");
  assert.equal(control.timeScale, 1);
}

// ── arena: a field bridge fights the whole battle unattended ──
{
  const realRandom = Math.random;
  Math.random = () => 0.9;
  const belt = new AsteroidBelt(8000, 8000, 400, 0);
  const arena = new Arena(belt, [
    {
      hull: CH_SLP,
      equipped: fit([
        "basic-weapon", "basic-weapon", null, null, null, null,
        "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
        "basic-shield", null, null, null, "field-bridge", null, "relay-reactor",
      ]),
      pos: { x: 4000, y: 4000 },
      team: "player",
      control: new BridgeControl(fakeCanvas, new Camera()),
    },
    {
      hull: CH_SLP,
      equipped: fit([null]),
      pos: { x: 4700, y: 4000 },
      team: "enemy",
      control: { update: () => IDLE_INTENTS },
    },
  ]);

  let victoryAt = -1;
  for (let step = 0; step < 10000; step++) {
    arena.update(1);
    if (arena.status === "victory") { victoryAt = step; break; }
  }
  assert.ok(victoryAt > 0, `bridge auto-engagement wins with zero input (status ${arena.status})`);
  Math.random = realRandom;
}

console.log("phase3 bridges: all assertions passed");
