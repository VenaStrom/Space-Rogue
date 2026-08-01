import type { HullDef, V2 } from "../../types";
import type { ItemDef } from "../../items";
import type { AsteroidBelt } from "./asteroid-belt";
import { IDLE_INTENTS, type ControlSource, type WorldView } from "./control";
import { Ship, type ProjectileSpawn, type Team } from "./ship";

export type Projectile = ProjectileSpawn;

export type ArenaStatus = "fighting" | "victory" | "defeat" | "escaped";

/** Where the player materializes in every encounter; encounters spawn around it. */
export const PLAYER_SPAWN: Readonly<V2> = { x: 4000, y: 4000 };

export type EncounterShip = {
  hull: Pick<HullDef, "vertices" | "slots">;
  equipped: (ItemDef | null)[];
  pos: V2;
  team: Team;
  control: ControlSource;
  /** Starting hull integrity, 0..1 (persistent damage carried into the fight). */
  hullFraction?: number;
};

export type LootDrop = {
  pos: V2;
  itemId: string;
};

const LOOT_DROP_CHANCE = 0.45;

type Combatant = {
  ship: Ship;
  control: ControlSource;
  /** Item ids aboard, used to roll loot on death. */
  aboard: string[];
  wrecked: boolean;
};

/**
 * Owns everything that exists in a combat encounter: ships, projectiles, loot,
 * and the win/lose state. The asteroid belt is passed in (it's also scenery).
 */
export class Arena {
  private combatants: Combatant[] = [];
  private projectiles: Projectile[] = [];
  public readonly loot: LootDrop[] = [];
  private readonly belt: AsteroidBelt;
  private stepCount = 0;

  constructor(belt: AsteroidBelt, entries: EncounterShip[]) {
    this.belt = belt;
    for (const e of entries) {
      const ship = new Ship({ ...e.pos }, e.hull, e.equipped, e.team, e.hullFraction ?? 1);
      const aboard = e.equipped.filter((d): d is ItemDef => d !== null).map(d => d.id);
      this.combatants.push({ ship, control: e.control, aboard, wrecked: false });
    }
  }

  public get ships(): readonly Ship[] {
    return this.combatants.map(c => c.ship);
  }

  public get playerShip(): Ship | null {
    return this.combatants.find(c => c.ship.team === "player")?.ship ?? null;
  }

  public get enemiesAlive(): number {
    return this.combatants.filter(c => c.ship.team === "enemy" && c.ship.inArena).length;
  }

  public get status(): ArenaStatus {
    const player = this.playerShip;
    if (player !== null && !player.alive) return "defeat";
    if (player !== null && player.jumpedOut && this.enemiesAlive > 0) return "escaped";
    if (this.enemiesAlive === 0) return "victory";
    return "fighting";
  }

  public update(delta: number): void {
    this.stepCount += delta;
    const world: WorldView = { ships: this.ships };
    const inCombat = this.enemiesAlive > 0
      && this.combatants.some(c => c.ship.team === "player" && c.ship.inArena);

    // Control + physics + weapons + jump drives
    for (const c of this.combatants) {
      if (c.ship.jumpedOut) continue;
      const intents = c.ship.alive ? c.control.update(c.ship, world) : IDLE_INTENTS;
      c.ship.physicsUpdate(intents, delta);
      c.ship.updateWeapons(intents, delta, (p) => this.projectiles.push(p));
      c.ship.updateDrive(delta, inCombat);
      this.belt.resolveShip(c.ship);
    }

    // Ship-vs-ship separation (wrecks still have mass; jumped ships are gone)
    for (let i = 0; i < this.combatants.length; i++) {
      for (let j = i + 1; j < this.combatants.length; j++) {
        const a = this.combatants[i].ship;
        const b = this.combatants[j].ship;
        if (a.jumpedOut || b.jumpedOut) continue;
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const minDist = a.colliderRadius + b.colliderRadius;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minDist * minDist || distSq === 0) continue;
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const push = (minDist - dist) / 2;
        a.pushOut(-nx * push, -ny * push, -nx, -ny);
        b.pushOut(nx * push, ny * push, nx, ny);
      }
    }

    // Projectiles: integrate, expire, collide
    this.projectiles = this.projectiles.filter((p) => {
      p.pos.x += p.vel.x * delta;
      p.pos.y += p.vel.y * delta;
      p.ttl -= delta;
      if (p.ttl <= 0) return false;
      if (this.belt.hitTestPoint(p.pos)) return false;

      for (const c of this.combatants) {
        const ship = c.ship;
        if (!ship.inArena || ship.team === p.team) continue;
        const dx = ship.position.x - p.pos.x;
        const dy = ship.position.y - p.pos.y;
        const r = ship.colliderRadius;
        if (dx * dx + dy * dy > r * r) continue;

        const speed = Math.hypot(p.vel.x, p.vel.y);
        ship.applyDamage({
          amount: p.damage,
          dir: speed > 0 ? { x: p.vel.x / speed, y: p.vel.y / speed } : { x: 1, y: 0 },
          point: { ...p.pos },
        });
        if (!ship.alive) this.onShipDeath(c);
        return false;
      }
      return true;
    });
  }

  private onShipDeath(c: Combatant): void {
    if (c.wrecked) return;
    c.wrecked = true;
    for (const itemId of c.aboard) {
      if (Math.random() > LOOT_DROP_CHANCE) continue;
      const angle = Math.random() * Math.PI * 2;
      const dist = c.ship.colliderRadius * (0.8 + Math.random());
      this.loot.push({
        pos: {
          x: c.ship.position.x + Math.cos(angle) * dist,
          y: c.ship.position.y + Math.sin(angle) * dist,
        },
        itemId,
      });
    }
  }

  /** Render world-space combat objects. Call inside the camera transform. */
  public render(ctx: CanvasRenderingContext2D): void {
    // Wrecks under living ships
    const sorted = [...this.combatants].sort((a, b) => Number(a.ship.alive) - Number(b.ship.alive));
    for (const c of sorted) c.ship.render(ctx);

    // Projectiles as motion-streaks
    for (const p of this.projectiles) {
      ctx.strokeStyle = p.team === "player" ? "#ffd75e" : "#ff7a5e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.pos.x - p.vel.x * 2, p.pos.y - p.vel.y * 2);
      ctx.lineTo(p.pos.x, p.pos.y);
      ctx.stroke();
    }

    // Loot: pulsing gold diamonds
    const pulse = 0.75 + 0.25 * Math.sin(this.stepCount * 0.08);
    for (const drop of this.loot) {
      ctx.save();
      ctx.translate(drop.pos.x, drop.pos.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = `rgba(255, 200, 80, ${pulse})`;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
    }

    // Enemy status pips above their hulls
    for (const c of this.combatants) {
      const ship = c.ship;
      if (ship.team !== "enemy" || !ship.inArena) continue;
      const x = ship.position.x;
      const y = ship.position.y - ship.colliderRadius - 16;
      const w = 44;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x - w / 2, y, w, 9);
      if (ship.hasShield) {
        ctx.fillStyle = "#59c8ff";
        ctx.fillRect(x - w / 2, y, w * ship.shieldFraction, 4);
      }
      ctx.fillStyle = "#e05a5a";
      ctx.fillRect(x - w / 2, y + 5, w * ship.hullFraction, 4);
    }
  }
}
