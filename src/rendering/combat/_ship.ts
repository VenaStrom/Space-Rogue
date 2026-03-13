import type { V2 } from "../../types";
import { Angle } from "../utils";

const DEFAULT_HULL: V2[] = [
  { x: 67, y: 0 },
  { x: -33, y: -25 },
  { x: -33, y: 25 },
];

export class Ship {
  private pos: V2;
  private vel: V2 = { x: 0, y: 0 };
  private angle: Angle = Angle.zero;
  private angularVel = 0;
  private hullVertices: V2[];

  private get cosScale() { return Math.cos(this.angle.radians); }
  private get sinScale() { return Math.sin(this.angle.radians); }

  public get position(): Readonly<V2> { return this.pos; }
  public get velocity(): Readonly<V2> { return this.vel; }
  public get heading(): number { return this.angle.radians; }
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

  private readonly TRAIL_LEN = 60;
  private trail: V2[] = [];

  private controlsHooked = false;
  private heldKeys: Set<string> = new Set();
  private keydownHook = (_e: KeyboardEvent) => { };
  private keyupHook = (_e: KeyboardEvent) => { };

  constructor(pos: V2 = { x: 0, y: 0 }, hull: V2[] = DEFAULT_HULL) {
    this.pos = pos;
    this.hullVertices = hull;
  }

  public render(ctx: CanvasRenderingContext2D) {
    this.renderTrail(ctx);

    const originalFillStyle = ctx.fillStyle;

    ctx.fillStyle = this.color;

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

    this.debugRender(ctx);

    ctx.fillStyle = originalFillStyle;
  }

  private renderTrail(ctx: CanvasRenderingContext2D): void {
    const pts = this.trail;
    const n = pts.length;
    if (n < 2) return;

    const prevLineWidth = ctx.lineWidth;
    const prevStrokeStyle = ctx.strokeStyle;
    const prevLineCap = ctx.lineCap;
    ctx.lineCap = "round";

    for (let i = 1; i < n; i++) {
      const t = i / (n - 1); // 0 = oldest, 1 = newest
      ctx.lineWidth = t * 6;
      ctx.strokeStyle = `rgba(128, 216, 255, ${(t * 0.75).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    ctx.lineWidth = prevLineWidth;
    ctx.strokeStyle = prevStrokeStyle;
    ctx.lineCap = prevLineCap;
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
    if (
      this.heldKeys.has("w")
      || this.heldKeys.has("W")
      || this.heldKeys.has("ArrowUp")
    ) {
      this.vel.x += cos * 0.08 * delta;
      this.vel.y += sin * 0.08 * delta;
    }
    if (
      this.heldKeys.has("s")
      || this.heldKeys.has("S")
      || this.heldKeys.has("ArrowDown")
    ) {
      this.vel.x -= cos * 0.06 * delta;
      this.vel.y -= sin * 0.06 * delta;
    }

    // Steering — angular velocity with a hard cap so the turn rate is finite
    const maxTurn = 0.045;
    if (
      this.heldKeys.has("a")
      || this.heldKeys.has("A")
      || this.heldKeys.has("ArrowLeft")
    ) {
      this.angularVel = Math.max(this.angularVel - 0.005 * delta, -maxTurn);
    }
    if (
      this.heldKeys.has("d")
      || this.heldKeys.has("D")
      || this.heldKeys.has("ArrowRight")
    ) {
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

    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > this.TRAIL_LEN) this.trail.shift();
  }
}