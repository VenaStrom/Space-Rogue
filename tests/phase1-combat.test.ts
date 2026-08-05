import assert from "node:assert/strict";
import { Arena } from "../src/rendering/combat/arena";
import { AsteroidBelt } from "../src/rendering/combat/asteroid-belt";
import { Ship } from "../src/rendering/combat/ship";
import { IDLE_INTENTS, EnemyAI, type ControlSource } from "../src/rendering/combat/control";
import { resolveItems } from "../src/items/index";
import { CH_SLP } from "../src/ships/index";

// ── damage seam unit checks ───────────────────────────────────
{
  const equipped = resolveItems([
    null, null, null, null, null, null, null, null, null, null,
    "basic-shield", null, null, null, null, null, null,
  ]);
  const ship = new Ship({ x: 0, y: 0 }, CH_SLP, equipped, "enemy");

  assert.ok(ship.hasShield);
  assert.equal(ship.shieldFraction, 1);

  // Fully absorbed hit: shield drops, hull takes only chip damage
  ship.applyDamage({ amount: 10, dir: { x: 1, y: 0 }, point: { x: 0, y: 0 } });
  assert.ok(Math.abs(ship.shieldFraction - 35 / 45) < 1e-9, "shield absorbed 10");
  assert.ok(Math.abs(ship.hullFraction - 0.995) < 1e-9, "hull took 5% chip");

  // Overflow hit: shield strips, remainder to hull, no chip
  ship.applyDamage({ amount: 100, dir: { x: 1, y: 0 }, point: { x: 0, y: 0 } });
  assert.equal(ship.shieldFraction, 0, "shield stripped");
  assert.ok(Math.abs(ship.hullFraction - (99.5 - 65) / 100) < 1e-9, "hull took overflow");

  // Regen: nothing during chargeDelay (2.5s = 150 steps), then throttled by emergency power
  for (let i = 0; i < 149; i++) ship.physicsUpdate(IDLE_INTENTS, 1);
  assert.equal(ship.shieldFraction, 0, "no regen inside charge delay");
  for (let i = 0; i < 121; i++) ship.physicsUpdate(IDLE_INTENTS, 1);
  const regenerated = ship.shieldFraction * 45;
  // No reactor equipped → emergency power (0.3×) throttles regen: 7/s × 0.3 × 2s ≈ 4.2
  assert.ok(regenerated > 3.9 && regenerated < 4.6, `~4.2 points after 2s of emergency-power regen, got ${regenerated}`);
}

// ── full scripted fight ───────────────────────────────────────
{
  // Deterministic loot rolls (belt has 0 asteroids so no terrain luck)
  const realRandom = Math.random;
  Math.random = () => 0.3;

  const belt = new AsteroidBelt(8000, 8000, 400, 0);

  const gunner: ControlSource = {
    update(self, world) {
      const foe = world.ships.find(s => s.team !== self.team && s.alive);
      if (!foe) return IDLE_INTENTS;
      return { thrust: 0, turn: 0, aimWorld: { ...foe.position }, fire: true, powerMode: null };
    },
  };
  const sitting: ControlSource = { update: () => IDLE_INTENTS };

  const arena = new Arena(belt, [
    {
      hull: CH_SLP,
      equipped: resolveItems([
        "basic-weapon", null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null, "relay-reactor",
      ]),
      pos: { x: 4000, y: 4000 },
      team: "player",
      control: gunner,
    },
    {
      hull: CH_SLP,
      equipped: resolveItems([
        null, null, null, null, null, null, null, null, null, null,
        "basic-shield", null, null, null, null, null, null,
      ]),
      pos: { x: 4600, y: 4000 },
      team: "enemy",
      control: sitting,
    },
  ]);

  const initialStatus: string = arena.status;
  assert.equal(initialStatus, "fighting");
  assert.equal(arena.enemiesAlive, 1);

  let victoryAt = -1;
  for (let step = 0; step < 6000; step++) {
    arena.update(1);
    if (arena.status === "victory") { victoryAt = step; break; }
  }

  assert.ok(victoryAt > 0, "autocannon eventually kills the sitting duck");
  assert.equal(arena.enemiesAlive, 0);
  const enemy = arena.ships.find(s => s.team === "enemy")!;
  assert.equal(enemy.alive, false);
  assert.equal(arena.loot.length, 1, "shield dropped as loot (roll 0.3 < 0.45)");
  assert.equal(arena.loot[0].itemId, "basic-shield");

  Math.random = realRandom;
}

// ── enemy AI sanity: it closes distance and eventually wins ───
{
  const realRandom = Math.random;
  Math.random = () => 0.9; // no loot needed
  const belt = new AsteroidBelt(8000, 8000, 400, 0);
  const arena = new Arena(belt, [
    {
      hull: CH_SLP,
      equipped: resolveItems(new Array<string | null>(17).fill(null)), // helpless player
      pos: { x: 4000, y: 4000 },
      team: "player",
      control: { update: () => IDLE_INTENTS },
    },
    {
      hull: CH_SLP,
      equipped: resolveItems([
        "basic-weapon", "basic-weapon", null, null, null, null,
        "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
        null, null, null, null, null, null, "static-reactor",
      ]),
      pos: { x: 6500, y: 5500 }, // out of weapon range, off-axis: must fly and turn
      team: "enemy",
      control: new EnemyAI(),
    },
  ]);

  let defeatAt = -1;
  for (let step = 0; step < 20000; step++) {
    arena.update(1);
    if (arena.status === "defeat") { defeatAt = step; break; }
  }
  assert.ok(defeatAt > 0, `enemy AI closes in and destroys the player (got status ${arena.status})`);
  Math.random = realRandom;
}

console.log("phase1 combat: all assertions passed");
