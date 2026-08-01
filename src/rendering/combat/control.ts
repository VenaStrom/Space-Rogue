import type { V2 } from "../../types";
import { normalizeRadians } from "../utils";
import type { Camera } from "./camera";
import { PHYSICS_HZ, PowerMode, type Ship } from "./ship";

/** What a controller wants the ship to do this physics step. */
export type ControlIntents = {
  /** -1 (reverse) .. 1 (full forward). */
  thrust: number;
  /** -1 (counter-clockwise) .. 1 (clockwise). */
  turn: number;
  /** World point weapons should aim at, or null to hold fire. */
  aimWorld: V2 | null;
  fire: boolean;
  /** Requested power routing, or null to keep the current mode. */
  powerMode: PowerMode | null;
};

export const IDLE_INTENTS: ControlIntents = { thrust: 0, turn: 0, aimWorld: null, fire: false, powerMode: null };

/** What a controller may observe. */
export type WorldView = {
  ships: readonly Ship[];
};

/**
 * The control seam. The cockpit (below), bridges (Phase 3), doctrine computers
 * (post-MVP), and enemy AI all produce intents through this interface — the
 * Ship itself never knows who is flying it.
 */
export type ControlSource = {
  update(self: Ship, world: WorldView): ControlIntents;
  attach?(): void;
  detach?(): void;
};

function nearestFoe(self: Ship, world: WorldView): Ship | null {
  let best: Ship | null = null;
  let bestDistSq = Infinity;
  for (const other of world.ships) {
    if (other.team === self.team || !other.inArena) continue;
    const dx = other.position.x - self.position.x;
    const dy = other.position.y - self.position.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistSq) { bestDistSq = dSq; best = other; }
  }
  return best;
}

/**
 * First-order intercept point: aim where the target will be by the time a
 * projectile (units/s) arrives. Falls back to the target itself when unarmed.
 */
function leadPoint(self: Ship, target: Ship): V2 {
  const speedPerStep = self.projectileSpeed / PHYSICS_HZ;
  if (speedPerStep <= 0) return { ...target.position };
  const dist = Math.hypot(target.position.x - self.position.x, target.position.y - self.position.y);
  const steps = dist / speedPerStep;
  return {
    x: target.position.x + target.velocity.x * steps,
    y: target.position.y + target.velocity.y * steps,
  };
}

/**
 * Direct cockpit control: WASD/arrows fly, mouse aims (twin-stick), LMB fires.
 * The starter-cockpit design auto-fires turrets so new players aren't punished —
 * toggled with T.
 */
export class PlayerControl implements ControlSource {
  private held = new Set<string>();
  private mouseCanvas: V2 = { x: 0, y: 0 };
  private mouseDown = false;
  public autoFire = false;
  private requestedMode: PowerMode = PowerMode.Balanced;

  private keydown = (e: KeyboardEvent) => {
    if (e.key === "t" || e.key === "T") this.autoFire = !this.autoFire;
    if (e.key === "1") this.requestedMode = PowerMode.Weapons;
    if (e.key === "2") this.requestedMode = PowerMode.Shields;
    if (e.key === "3") this.requestedMode = PowerMode.Engines;
    if (e.key === "4" || e.key === "j" || e.key === "J") this.requestedMode = PowerMode.Jump;
    if (e.key === "0") this.requestedMode = PowerMode.Balanced;
    this.held.add(e.key);
  };
  private keyup = (e: KeyboardEvent) => { this.held.delete(e.key); };
  private mousemove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseCanvas = {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  };
  private mousedown = (e: MouseEvent) => { if (e.button === 0) this.mouseDown = true; };
  private mouseup = (e: MouseEvent) => { if (e.button === 0) this.mouseDown = false; };

  private readonly canvas: HTMLCanvasElement;
  private readonly camera: Camera;

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.camera = camera;
  }

  public attach(): void {
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    this.canvas.addEventListener("mousemove", this.mousemove);
    this.canvas.addEventListener("mousedown", this.mousedown);
    window.addEventListener("mouseup", this.mouseup);
  }

  public detach(): void {
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    this.canvas.removeEventListener("mousemove", this.mousemove);
    this.canvas.removeEventListener("mousedown", this.mousedown);
    window.removeEventListener("mouseup", this.mouseup);
  }

  private anyHeld(...keys: string[]): boolean {
    return keys.some(k => this.held.has(k));
  }

  public update(self: Ship, world: WorldView): ControlIntents {
    const thrust = (this.anyHeld("w", "W", "ArrowUp") ? 1 : 0)
      + (this.anyHeld("s", "S", "ArrowDown") ? -1 : 0);
    const turn = (this.anyHeld("d", "D", "ArrowRight") ? 1 : 0)
      + (this.anyHeld("a", "A", "ArrowLeft") ? -1 : 0);

    const cursorWorld = this.camera.screenToWorld(
      this.mouseCanvas, this.canvas.width, this.canvas.height,
    );

    const powerMode = this.requestedMode;

    // Turret assist: when on and the player isn't manually firing, track the
    // nearest foe with lead and shoot on its own.
    if (this.autoFire && !this.mouseDown) {
      const foe = nearestFoe(self, world);
      if (foe !== null) {
        const dist = Math.hypot(foe.position.x - self.position.x, foe.position.y - self.position.y);
        if (dist <= self.weaponRange) {
          return { thrust, turn, aimWorld: leadPoint(self, foe), fire: true, powerMode };
        }
      }
      return { thrust, turn, aimWorld: cursorWorld, fire: false, powerMode };
    }

    return { thrust, turn, aimWorld: cursorWorld, fire: this.mouseDown, powerMode };
  }
}

/**
 * Enemy AI v1: close to a preferred range, back off when crowded, aim with
 * lead, fire when the target is in reach. Deliberately dumb but fun.
 */
export class EnemyAI implements ControlSource {
  private readonly preferredRange: number;

  constructor(preferredRange = 550) {
    this.preferredRange = preferredRange;
  }

  public update(self: Ship, world: WorldView): ControlIntents {
    const target = nearestFoe(self, world);
    if (target === null) return IDLE_INTENTS;

    const dx = target.position.x - self.position.x;
    const dy = target.position.y - self.position.y;
    const dist = Math.hypot(dx, dy);
    const bearing = Math.atan2(dy, dx);
    const off = normalizeRadians(bearing - self.heading);

    const turn = Math.max(-1, Math.min(1, off * 3));

    let thrust = 0;
    if (Math.abs(off) < 1.0) {
      if (dist > this.preferredRange * 1.15) thrust = 1;
      else if (dist < this.preferredRange * 0.6) thrust = -0.6;
      else thrust = 0.2;
    }

    const inReach = dist <= self.weaponRange * 0.95;
    return {
      thrust,
      turn,
      aimWorld: inReach ? leadPoint(self, target) : null,
      fire: inReach,
      powerMode: null,
    };
  }
}
