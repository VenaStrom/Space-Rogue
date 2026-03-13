import type { V2 } from "../../types";
import { Angle } from "../utils";

export class Ship {
  private pos: V2;
  private vel: V2 = { x: 0, y: 0 };
  private angle: Angle = Angle.zero;
  private angularVel = 0;

  private get cosScale() { return Math.cos(this.angle.radians); }
  private get sinScale() { return Math.sin(this.angle.radians); }

  public get position(): Readonly<V2> { return this.pos; }
  public get velocity(): Readonly<V2> { return this.vel; }
  public get shipLength(): number { return this.length; }
  public get colliderRadius(): number { return this.wingspan / 2; }

  /**
   * Displace the ship by (dx, dy) and cancel any velocity component pointing
   * into the contact normal (nx, ny). Used by the collision resolver.
   */
  public pushOut(dx: number, dy: number, nx: number, ny: number): void {
    this.pos.x += dx;
    this.pos.y += dy;
    const vDotN = this.vel.x * nx + this.vel.y * ny;
    if (vDotN < 0) {
      this.vel.x -= vDotN * nx;
      this.vel.y -= vDotN * ny;
    }
  }

  private color = "green";
  private wingspan = 50;
  private length = 100;

  private controlsHooked = false;
  private heldKeys: Set<string> = new Set();
  private keydownHook = (_e: KeyboardEvent) => { };
  private keyupHook = (_e: KeyboardEvent) => { };

  constructor(pos: V2 = { x: 0, y: 0 }) {
    this.pos = pos;
  }

  public render(ctx: CanvasRenderingContext2D) {
    const originalFillStyle = ctx.fillStyle;

    ctx.fillStyle = this.color;

    const cos = Math.cos(this.angle.radians);
    const sin = Math.sin(this.angle.radians);
    const L = this.length;
    const W = this.wingspan;
    // Offset vertices so this.pos is at the centroid (L/3 from base, 2L/3 from nose)
    const co = L / 3;

    // Make triangle hull centered on centroid
    ctx.beginPath();
    // Nose: forward * (2L/3)
    ctx.moveTo(this.pos.x + cos * (L - co), this.pos.y + sin * (L - co));
    // Left wing: left-perp * (W/2) - forward * (L/3)
    ctx.lineTo(this.pos.x + (-sin * (W / 2) - cos * co), this.pos.y + (cos * (W / 2) - sin * co));
    // Right wing: right-perp * (W/2) - forward * (L/3)
    ctx.lineTo(this.pos.x + (sin * (W / 2) - cos * co), this.pos.y + (-cos * (W / 2) - sin * co));
    ctx.closePath();

    ctx.fill();

    this.debugRender(ctx);

    ctx.fillStyle = originalFillStyle;
  }

  public hookControls() {
    if (typeof window === "undefined") return;
    if (this.controlsHooked) return;

    this.controlsHooked = true;

    this.keydownHook = (e) => { this.heldKeys.add(e.key); };
    this.keyupHook = (e) => { this.heldKeys.delete(e.key); };

    window.addEventListener("keydown", this.keydownHook);
    window.addEventListener("keyup", this.keyupHook);
  }

  public debugRender(ctx: CanvasRenderingContext2D) {
    // Center dot
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Velocity vector
    ctx.strokeStyle = "blue";
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x + this.vel.x * 10, this.pos.y + this.vel.y * 10);
    ctx.stroke();

    // Lateral velocity vector (shows slip — cyan when over-turning)
    const cos = this.cosScale;
    const sin = this.sinScale;
    const vLat = this.vel.x * -sin + this.vel.y * cos;
    ctx.strokeStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x + (-sin) * vLat * 10, this.pos.y + cos * vLat * 10);
    ctx.stroke();

    // Angular velocity arc
    ctx.strokeStyle = "magenta";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 30, this.angle.radians, this.angle.radians + this.angularVel * 100);
    ctx.stroke();
  }

  public unhookControls() {
    if (typeof window === "undefined") return;
    if (!this.controlsHooked) return;

    this.controlsHooked = false;
    window.removeEventListener("keydown", this.keydownHook);
    window.removeEventListener("keyup", this.keyupHook);
  }

  public physicsUpdate(delta: number) {
    const cos = this.cosScale;
    const sin = this.sinScale;

    // Thrust / brake along the ship's facing
    if (this.heldKeys.has("w") || this.heldKeys.has("ArrowUp")) {
      this.vel.x += cos * 0.08 * delta;
      this.vel.y += sin * 0.08 * delta;
    }
    if (this.heldKeys.has("s") || this.heldKeys.has("ArrowDown")) {
      this.vel.x -= cos * 0.06 * delta;
      this.vel.y -= sin * 0.06 * delta;
    }

    // Steering — angular velocity with a hard cap so the turn rate is finite
    const maxTurn = 0.045;
    if (this.heldKeys.has("a") || this.heldKeys.has("ArrowLeft")) {
      this.angularVel = Math.max(this.angularVel - 0.005 * delta, -maxTurn);
    }
    if (this.heldKeys.has("d") || this.heldKeys.has("ArrowRight")) {
      this.angularVel = Math.min(this.angularVel + 0.005 * delta, maxTurn);
    }
    this.angularVel *= 0.85;
    this.angle = this.angle.add(this.angularVel * delta);

    // --- Plane-style directional drag ---
    // Decompose velocity into the ship's (now-updated) forward and lateral axes.
    // Heavy lateral drag steers velocity toward the new heading; the cost is
    // proportional to how far the heading has rotated from the velocity vector,
    // so over-turning bleeds speed hard.
    const fwdCos = this.cosScale; // recalculate after angle update
    const fwdSin = this.sinScale;
    const vFwd = this.vel.x * fwdCos + this.vel.y * fwdSin;
    const vLat = this.vel.x * -fwdSin + this.vel.y * fwdCos;

    const dampedFwd = vFwd * 0.993; // gentle forward drag
    const dampedLat = vLat * 0.65;  // heavy lateral drag — tight turns lose speed fast

    this.vel.x = dampedFwd * fwdCos - dampedLat * fwdSin;
    this.vel.y = dampedFwd * fwdSin + dampedLat * fwdCos;

    this.pos.x += this.vel.x * delta;
    this.pos.y += this.vel.y * delta;
  }
}