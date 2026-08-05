import assert from "node:assert/strict";
import { Arena } from "../src/rendering/combat/arena";
import { AsteroidBelt } from "../src/rendering/combat/asteroid-belt";
import { Ship, PowerMode } from "../src/rendering/combat/ship";
import { IDLE_INTENTS, type ControlIntents, type ControlSource } from "../src/rendering/combat/control";
import { resolveItems, type ItemDef } from "../src/items/index";
import { CH_SLP } from "../src/ships/index";
import { ItemCategory } from "../src/types/index";

const HZ = 60;

function fit(ids: (string | null)[]): (ItemDef | null)[] {
  const full = [...ids];
  while (full.length < 17) full.push(null);
  return resolveItems(full);
}

const intentsWith = (over: Partial<ControlIntents>): ControlIntents => ({ ...IDLE_INTENTS, ...over });

// ── reroute gating ────────────────────────────────────────────
{
  // Relay reactor honors mode requests
  const relay = new Ship({ x: 0, y: 0 }, CH_SLP, fit([
    null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, "relay-reactor",
  ]));
  assert.ok(relay.canReroute);
  relay.physicsUpdate(intentsWith({ powerMode: PowerMode.Weapons }), 1);
  assert.equal(relay.currentPowerMode, PowerMode.Weapons, "relay reactor reroutes");

  // Static reactor ignores them
  const fixed = new Ship({ x: 0, y: 0 }, CH_SLP, fit([
    null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, "static-reactor",
  ]));
  assert.equal(fixed.canReroute, false);
  fixed.physicsUpdate(intentsWith({ powerMode: PowerMode.Weapons }), 1);
  assert.equal(fixed.currentPowerMode, PowerMode.Balanced, "static reactor stays balanced");
}

// ── output vs demand ──────────────────────────────────────────
{
  // Demand: 4 guns(4) + 2 burst(4) + 4 thrusters(4) + shield(1) + drive(1) = 14 ≤ relay output 15 → 1.0
  const full = new Ship({ x: 0, y: 0 }, CH_SLP, fit([
    "basic-weapon", "basic-weapon", "basic-weapon", "basic-weapon", "burst-blaster", "burst-blaster",
    "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
    "basic-shield", "stable-drive", null, null, null, null, "relay-reactor",
  ]));
  assert.equal(full.powerHealth, 1, "relay reactor covers the heavy fit");

  // Same fit on the static reactor (output 13) is underpowered: 13/14
  const under = new Ship({ x: 0, y: 0 }, CH_SLP, fit([
    "basic-weapon", "basic-weapon", "basic-weapon", "basic-weapon", "burst-blaster", "burst-blaster",
    "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
    "basic-shield", "stable-drive", null, null, null, null, "static-reactor",
  ]));
  assert.ok(Math.abs(under.powerHealth - 13 / 14) < 1e-9, "demand over output scales down");

  // No reactor: emergency power
  const dead = new Ship({ x: 0, y: 0 }, CH_SLP, fit(["basic-weapon"]));
  assert.equal(dead.hasReactor, false);
  assert.ok(Math.abs(dead.powerHealth - 0.3) < 1e-9, "emergency power without reactor");
}

// ── shield regen scales with power mode ───────────────────────
{
  function regenAfter(mode: PowerMode, steps: number): number {
    const ship = new Ship({ x: 0, y: 0 }, CH_SLP, fit([
      null, null, null, null, null, null, null, null, null, null,
      "basic-shield", null, null, null, null, null, "relay-reactor",
    ]));
    ship.applyDamage({ amount: 45, dir: { x: 1, y: 0 }, point: { x: 0, y: 0 } });
    ship.physicsUpdate(intentsWith({ powerMode: mode }), 1);
    for (let i = 0; i < steps; i++) ship.physicsUpdate(IDLE_INTENTS, 1);
    return ship.shieldFraction;
  }
  const delay = Math.round(2.5 * HZ);
  const boosted = regenAfter(PowerMode.Shields, delay + 2 * HZ);
  const balanced = regenAfter(PowerMode.Balanced, delay + 2 * HZ);
  assert.ok(boosted > balanced * 1.4, `shield mode charges faster (${boosted} vs ${balanced})`);
}

// ── jump spool: trickle vs full feed, and the in-combat gate ──
{
  function shipWithDrive(driveStats?: { chargeTime: number; chargeInCombat: boolean }): Ship {
    const base = fit([
      null, null, null, null, null, null, null, null, null, null,
      null, "stable-drive", null, null, null, null, "relay-reactor",
    ]);
    if (driveStats) {
      const drive = base[11];
      if (drive?.category === ItemCategory.Drive) {
        base[11] = { ...drive, stats: driveStats };
      }
    }
    return new Ship({ x: 0, y: 0 }, CH_SLP, base);
  }

  // Full feed: spooling charges in chargeTime (20s)
  const spooler = shipWithDrive();
  spooler.physicsUpdate(intentsWith({ powerMode: PowerMode.Jump }), 1);
  for (let i = 0; i < 20 * HZ - 1 && !spooler.jumpedOut; i++) spooler.updateDrive(1, true);
  assert.ok(!spooler.jumpedOut, "not out before chargeTime elapses");
  spooler.updateDrive(1, true);
  spooler.updateDrive(1, true);
  assert.ok(spooler.jumpedOut, "jumps the moment the spool completes");

  // Trickle: balanced mode charges at 35%
  const trickler = shipWithDrive();
  for (let i = 0; i < 20 * HZ; i++) trickler.updateDrive(1, true);
  const charge = trickler.jumpCharge!;
  assert.ok(Math.abs(charge - 0.35) < 0.01, `trickle charge ≈ 0.35 after 20s, got ${charge}`);

  // Unstable drive: frozen in combat, charges out of combat
  const unstable = shipWithDrive({ chargeTime: 20, chargeInCombat: false });
  for (let i = 0; i < 5 * HZ; i++) unstable.updateDrive(1, true);
  assert.equal(unstable.jumpCharge, 0, "unstable drive frozen while hostiles present");
  for (let i = 0; i < 5 * HZ; i++) unstable.updateDrive(1, false);
  assert.ok(unstable.jumpCharge! > 0, "unstable drive charges out of combat");
}

// ── arena escape ──────────────────────────────────────────────
{
  const belt = new AsteroidBelt(8000, 8000, 400, 0);
  const fleeing: ControlSource = {
    update: () => intentsWith({ powerMode: PowerMode.Jump }),
  };
  const arena = new Arena(belt, [
    {
      hull: CH_SLP,
      equipped: fit([
        null, null, null, null, null, null, null, null, null, null,
        null, "stable-drive", null, null, null, null, "relay-reactor",
      ]),
      pos: { x: 4000, y: 4000 },
      team: "player",
      control: fleeing,
    },
    {
      hull: CH_SLP,
      equipped: fit([null]),
      pos: { x: 6000, y: 6000 },
      team: "enemy",
      control: { update: () => IDLE_INTENTS },
    },
  ]);

  let escapedAt = -1;
  for (let step = 0; step < 25 * HZ; step++) {
    arena.update(1);
    if (arena.status === "escaped") { escapedAt = step; break; }
  }
  assert.ok(escapedAt > 0, `player spools out and escapes (status: ${arena.status})`);
  assert.ok(Math.abs(escapedAt - 20 * HZ) < 10, `escape lands at ~20s (got step ${escapedAt})`);
}

// Sanity: ItemCategory still closed over six values
assert.equal(Object.values(ItemCategory).length, 6);

console.log("phase2 power: all assertions passed");
