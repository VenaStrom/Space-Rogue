import { ItemCategory, type HullDef, type V2 } from "../../types";
import type { ItemDef, ThrusterStats, WeaponStats } from "../../items";
import { Angle, normalizeRadians } from "../utils";
import type { ControlIntents } from "./control";

export const PHYSICS_HZ = 60;
const THRUST_SCALE = 0.08;
const DEFAULT_HULL_HP = 100;
const HIT_FLASH_STEPS = 6;

const DEFAULT_HULL: V2[] = [
  { x: 67, y: 0 },
  { x: -33, y: -25 },
  { x: -33, y: 25 },
];

export type Team = "player" | "enemy";

const TEAM_COLOR: Record<Team, string> = {
  player: "green",
  enemy: "#a33",
};

/** A hull slot with an equipped thruster, hydrated for the sim. */
type ActiveThruster = {
  hardpoint: V2;
  stats: ThrusterStats;
  trail: V2[];
};

/** A hull slot with an equipped weapon, hydrated for the sim (per-step units). */
type ActiveWeapon = {
  hardpoint: V2;
  stats: WeaponStats;
  /** Steps until the next trigger pull is allowed. */
  cooldownLeft: number;
  /** Shots remaining in the current burst. */
  burstLeft: number;
  /** Steps until the next in-burst shot. */
  burstTimer: number;
};

export type DamageHit = {
  amount: number;
  /** Unit direction the damage was travelling (world space). */
  dir: V2;
  /** World-space impact point. */
  point: V2;
};

export type ProjectileSpawn = {
  pos: V2;
  vel: V2;
  /** Steps to live. */
  ttl: number;
  damage: number;
  team: Team;
};

type ShieldState = {
  capacity: number;
  current: number;
  /** Points per step. */
  chargeRate: number;
  /** Steps after the last hit before charging resumes. */
  chargeDelay: number;
};

export class Ship {
  private pos: V2;
  private vel: V2 = { x: 0, y: 0 };
  private angle: Angle = Angle.zero;
  private angularVel = 0;
  private hullVertices: V2[];

  public readonly team: Team;

  private thrusters: ActiveThruster[];
  private weapons: ActiveWeapon[];
  /** Hull vertices at the trailing edge, used for RCS trails when no thrusters are equipped. */
  private rcsPoints: V2[] = [];
  private rcsTrails: V2[][] = [];
  /** Velocity added per forward-key physics step. */
  private readonly avgThrust: number;
  /** Max angular velocity in rad/step. */
  private readonly avgMaxTurnPerStep: number;

  private maxHp = DEFAULT_HULL_HP;
  private hp = DEFAULT_HULL_HP;
  private shield: ShieldState | null = null;
  private stepsSinceHit = Number.MAX_SAFE_INTEGER;
  private hitFlash = 0;

  private readonly radius: number;
  private readonly lengthUnits: number;

  private get cosScale() { return Math.cos(this.angle.radians); }
  private get sinScale() { return Math.sin(this.angle.radians); }

  public get position(): Readonly<V2> { return this.pos; }
  public get velocity(): Readonly<V2> { return this.vel; }
  public get heading(): number { return this.angle.radians; }
  public get shipLength(): number { return this.lengthUnits; }
  public get colliderRadius(): number { return this.radius; }
  public get alive(): boolean { return this.hp > 0; }
  public get hullFraction(): number { return Math.max(0, this.hp) / this.maxHp; }
  public get shieldFraction(): number {
    return this.shield ? this.shield.current / this.shield.capacity : 0;
  }
  public get hasShield(): boolean { return this.shield !== null; }
  /** Longest weapon reach in world units (0 when unarmed). */
  public get weaponRange(): number {
    return this.weapons.reduce((best, w) => {
      return Math.max(best, w.stats.projectileSpeed * w.stats.lifetime);
    }, 0);
  }
  /** Highest projectile speed among mounted weapons, units/s (0 when unarmed). */
  public get projectileSpeed(): number {
    return this.weapons.reduce((best, w) => Math.max(best, w.stats.projectileSpeed), 0);
  }
  /** Cooldown fraction (0 = ready) per mounted weapon, for HUD pips. */
  public get weaponReadiness(): { fraction: number; burst: boolean }[] {
    return this.weapons.map(w => ({
      fraction: w.cooldownLeft / Math.max(1, w.stats.cooldown * PHYSICS_HZ),
      burst: w.stats.burst > 1,
    }));
  }

  public pushOut(dx: number, dy: number, nx: number, ny: number): void {
    this.pos.x += dx;
    this.pos.y += dy;
    const vDotN = this.vel.x * nx + this.vel.y * ny;
    if (vDotN < 0) {
      this.vel.x -= vDotN * nx;
      this.vel.y -= vDotN * ny;
    }
  }

  constructor(
    pos: V2 = { x: 0, y: 0 },
    hull?: Pick<HullDef, "vertices" | "slots">,
    equipped?: (ItemDef | null)[],
    team: Team = "player",
  ) {
    this.pos = pos;
    this.team = team;
    this.hullVertices = hull?.vertices ?? DEFAULT_HULL;

    const maxReach = Math.max(...this.hullVertices.map(v => Math.hypot(v.x, v.y)));
    this.radius = maxReach * 0.6;
    const xs = this.hullVertices.map(v => v.x);
    this.lengthUnits = Math.max(...xs) - Math.min(...xs);

    this.thrusters = [];
    this.weapons = [];
    (hull?.slots ?? []).forEach((slot, i) => {
      const item = equipped?.[i];
      if (!item) return;
      if (item.category === ItemCategory.Thruster) {
        this.thrusters.push({ hardpoint: slot.hardpoint, stats: item.stats, trail: [] });
      } else if (item.category === ItemCategory.Weapon) {
        this.weapons.push({
          hardpoint: slot.hardpoint,
          stats: item.stats,
          cooldownLeft: 0,
          burstLeft: 0,
          burstTimer: 0,
        });
      } else if (item.category === ItemCategory.Shield) {
        // Multiple shields stack capacity and charge; the slowest delay wins.
        const s = item.stats;
        this.shield = {
          capacity: (this.shield?.capacity ?? 0) + s.capacity,
          current: (this.shield?.current ?? 0) + s.capacity,
          chargeRate: (this.shield?.chargeRate ?? 0) + s.chargeRate / PHYSICS_HZ,
          chargeDelay: Math.max(this.shield?.chargeDelay ?? 0, s.chargeDelay * PHYSICS_HZ),
        };
      }
    });

    if (this.thrusters.length > 0) {
      const n = this.thrusters.length;
      this.avgThrust = this.thrusters.reduce((sum, t) => sum + t.stats.thrust, 0) / n;
      this.avgMaxTurnPerStep =
        this.thrusters.reduce((sum, t) => sum + t.stats.maxTurnRate, 0) / n / PHYSICS_HZ;
    } else {
      // No thrusters — very slow RCS-only movement
      this.avgThrust = 0.15;
      this.avgMaxTurnPerStep = (Math.PI / 4) / PHYSICS_HZ; // 45 deg/s

      // Trailing vertices: those within 2 units of the most-negative x
      const minX = Math.min(...this.hullVertices.map(v => v.x));
      this.rcsPoints = this.hullVertices
        .filter(v => v.x <= minX + 2)
        .map(v => ({ ...v }));
      this.rcsTrails = this.rcsPoints.map(() => []);
    }
  }

  /**
   * THE damage seam. Every hit in the game routes through here with its
   * direction and impact point, so shield zones and per-component damage can
   * plug in later without touching any caller.
   */
  public applyDamage(hit: DamageHit): void {
    if (!this.alive) return;
    let remaining = hit.amount;
    if (this.shield && this.shield.current > 0) {
      const absorbed = Math.min(this.shield.current, remaining);
      this.shield.current -= absorbed;
      remaining -= absorbed;
    }
    // Chip damage: the hull always takes a sliver even through shields.
    const chip = remaining === 0 ? hit.amount * 0.05 : 0;
    this.hp -= remaining + chip;
    this.stepsSinceHit = 0;
    this.hitFlash = HIT_FLASH_STEPS;
  }

  public physicsUpdate(intents: ControlIntents, delta: number) {
    if (!this.alive) {
      // Wrecks drift: damped translation only, no control authority.
      this.pos.x += this.vel.x * delta;
      this.pos.y += this.vel.y * delta;
      this.vel.x *= 0.985;
      this.vel.y *= 0.985;
      this.angle = this.angle.add(this.angularVel * delta);
      this.angularVel *= 0.98;
      return;
    }

    const cos = this.cosScale;
    const sin = this.sinScale;

    const thrustIntent = Math.max(-1, Math.min(1, intents.thrust));
    const thrusting = thrustIntent > 0.01;

    if (thrustIntent > 0) {
      this.vel.x += cos * this.avgThrust * THRUST_SCALE * thrustIntent * delta;
      this.vel.y += sin * this.avgThrust * THRUST_SCALE * thrustIntent * delta;
    } else if (thrustIntent < 0) {
      this.vel.x += cos * this.avgThrust * THRUST_SCALE * 0.75 * thrustIntent * delta;
      this.vel.y += sin * this.avgThrust * THRUST_SCALE * 0.75 * thrustIntent * delta;
    }

    const turnIntent = Math.max(-1, Math.min(1, intents.turn));
    const maxTurn = this.avgMaxTurnPerStep;
    if (turnIntent !== 0) {
      this.angularVel = Math.max(-maxTurn, Math.min(maxTurn, this.angularVel + 0.005 * turnIntent * delta));
    }

    this.angularVel *= 0.85;
    this.angle = this.angle.add(this.angularVel * delta);

    const fwdCos = this.cosScale;
    const fwdSin = this.sinScale;
    const vFwd = this.vel.x * fwdCos + this.vel.y * fwdSin;
    const vLat = this.vel.x * -fwdSin + this.vel.y * fwdCos;

    const dampedFwd = vFwd * 0.993;
    const dampedLat = vLat * 0.65;

    this.vel.x = dampedFwd * fwdCos - dampedLat * fwdSin;
    this.vel.y = dampedFwd * fwdSin + dampedLat * fwdCos;

    this.pos.x += this.vel.x * delta;
    this.pos.y += this.vel.y * delta;

    // Shield recharge
    if (this.shield) {
      this.stepsSinceHit += delta;
      if (this.stepsSinceHit >= this.shield.chargeDelay && this.shield.current < this.shield.capacity) {
        this.shield.current = Math.min(this.shield.capacity, this.shield.current + this.shield.chargeRate * delta);
      }
    }
    if (this.hitFlash > 0) this.hitFlash -= delta;

    // Update per-thruster trails at their world-space hardpoint positions
    for (const t of this.thrusters) {
      const wx = this.pos.x + t.hardpoint.x * fwdCos - t.hardpoint.y * fwdSin;
      const wy = this.pos.y + t.hardpoint.x * fwdSin + t.hardpoint.y * fwdCos;

      if (thrusting) {
        t.trail.push({ x: wx, y: wy });
        if (t.trail.length > t.stats.trailLength) t.trail.shift();
      } else if (t.trail.length > 0) {
        t.trail.shift(); // drain trail when not thrusting
      }
    }

    // RCS trails at trailing hull vertices (only active when no thrusters are equipped)
    for (let i = 0; i < this.rcsPoints.length; i++) {
      const pt = this.rcsPoints[i];
      const wx = this.pos.x + pt.x * fwdCos - pt.y * fwdSin;
      const wy = this.pos.y + pt.x * fwdSin + pt.y * fwdCos;
      if (thrusting) {
        this.rcsTrails[i].push({ x: wx, y: wy });
        if (this.rcsTrails[i].length > 10) this.rcsTrails[i].shift();
      } else if (this.rcsTrails[i].length > 0) {
        this.rcsTrails[i].shift();
      }
    }
  }

  /**
   * Tick weapons; every shot fired is handed to `spawn`. Weapons only fire
   * toward `aimWorld` when it lies inside their firing arc (centered on ship
   * forward). Started bursts finish on their own.
   */
  public updateWeapons(
    intents: ControlIntents,
    delta: number,
    spawn: (p: ProjectileSpawn) => void,
  ): void {
    const cos = this.cosScale;
    const sin = this.sinScale;

    for (const w of this.weapons) {
      w.cooldownLeft = Math.max(0, w.cooldownLeft - delta);
      w.burstTimer = Math.max(0, w.burstTimer - delta);

      const wx = this.pos.x + w.hardpoint.x * cos - w.hardpoint.y * sin;
      const wy = this.pos.y + w.hardpoint.x * sin + w.hardpoint.y * cos;

      const aim = intents.aimWorld;
      let aimAngle: number | null = null;
      if (aim !== null && this.alive) {
        const a = Math.atan2(aim.y - wy, aim.x - wx);
        const off = normalizeRadians(a - this.angle.radians);
        const halfArc = (w.stats.arc / 2) * (Math.PI / 180);
        if (Math.abs(off) <= halfArc) aimAngle = a;
      }

      const fireShot = (angle: number) => {
        const speed = w.stats.projectileSpeed / PHYSICS_HZ;
        spawn({
          pos: { x: wx, y: wy },
          vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          ttl: w.stats.lifetime * PHYSICS_HZ,
          damage: w.stats.damage,
          team: this.team,
        });
      };

      // Continue an in-flight burst (falls back to ship forward if aim left the arc)
      if (w.burstLeft > 0 && w.burstTimer <= 0) {
        fireShot(aimAngle ?? this.angle.radians);
        w.burstLeft -= 1;
        w.burstTimer = w.stats.burstInterval * PHYSICS_HZ;
        continue;
      }

      // New trigger pull
      if (intents.fire && aimAngle !== null && w.cooldownLeft <= 0) {
        fireShot(aimAngle);
        w.cooldownLeft = w.stats.cooldown * PHYSICS_HZ;
        w.burstLeft = w.stats.burst - 1;
        w.burstTimer = w.stats.burstInterval * PHYSICS_HZ;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.alive) this.renderTrails(ctx);

    const originalFillStyle = ctx.fillStyle;
    ctx.fillStyle = !this.alive
      ? "#3d3d3d"
      : this.hitFlash > 0
        ? "#e8e8e8"
        : TEAM_COLOR[this.team];

    const cos = Math.cos(this.angle.radians);
    const sin = Math.sin(this.angle.radians);

    ctx.beginPath();
    for (let i = 0; i < this.hullVertices.length; i++) {
      const v = this.hullVertices[i];
      const wx = this.pos.x + v.x * cos - v.y * sin;
      const wy = this.pos.y + v.x * sin + v.y * cos;
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.closePath();
    ctx.fill();

    // Shield ring: opacity tracks charge
    if (this.alive && this.shield && this.shield.current > 0) {
      const frac = this.shield.current / this.shield.capacity;
      ctx.strokeStyle = `rgba(80, 200, 255, ${0.12 + frac * 0.35})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.radius * 1.25, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = originalFillStyle;
  }

  private renderTrails(ctx: CanvasRenderingContext2D): void {
    const prevLineWidth = ctx.lineWidth;
    const prevStrokeStyle = ctx.strokeStyle;
    const prevLineCap = ctx.lineCap;
    ctx.lineCap = "round";

    for (const t of this.thrusters) {
      const pts = t.trail;
      const n = pts.length;
      if (n < 2) continue;

      for (let i = 1; i < n; i++) {
        const frac = i / (n - 1); // 0 = oldest → 1 = newest
        ctx.lineWidth = frac * t.stats.trailWidth;
        ctx.strokeStyle = `rgba(${t.stats.trailColor}, ${frac * 0.75})`;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    }

    for (const trail of this.rcsTrails) {
      const n = trail.length;
      if (n < 2) continue;
      for (let i = 1; i < n; i++) {
        const frac = i / (n - 1);
        ctx.lineWidth = frac * 3;
        ctx.strokeStyle = `rgba(255, 60, 60, ${frac * 0.65})`;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
    }

    ctx.lineWidth = prevLineWidth;
    ctx.strokeStyle = prevStrokeStyle;
    ctx.lineCap = prevLineCap;
  }
}
