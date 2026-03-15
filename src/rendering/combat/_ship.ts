import type { ShipLoadout, V2 } from "../../types";
import { BasicThrusterSlot } from "../../slots";
import { Angle } from "../utils";

const DEFAULT_HULL: V2[] = [
  { x: 67, y: 0 },
  { x: -33, y: -25 },
  { x: -33, y: 25 },
];

/** A thruster slot that has been fully hydrated with a live item instance. */
type ActiveThruster = {
  hardpoint: V2;
  item: BasicThrusterSlot;
  trail: V2[];
};

const THRUST_SCALE = 0.08;
const PHYSICS_HZ = 60;

export class Ship {
  private pos: V2;
  private vel: V2 = { x: 0, y: 0 };
  private angle: Angle = Angle.zero;
  private angularVel = 0;
  private hullVertices: V2[];

  private thrusters: ActiveThruster[];
  /** Velocity added per forward-key physics step. */
  private readonly avgThrust: number;
  /** Max angular velocity in rad/step. */
  private readonly avgMaxTurnPerStep: number;

  private get cosScale() { return Math.cos(this.angle.radians); }
  private get sinScale() { return Math.sin(this.angle.radians); }

  public get position(): Readonly<V2> { return this.pos; }
  public get velocity(): Readonly<V2> { return this.vel; }
  public get heading(): number { return this.angle.radians; }
  public get shipLength(): number { return this.length; }
  public get colliderRadius(): number { return this.wingspan / 2; }

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

  constructor(pos: V2 = { x: 0, y: 0 }, loadout?: ShipLoadout) {
    this.pos = pos;
    this.hullVertices = loadout?.hullVertices ?? DEFAULT_HULL;

    this.thrusters = (loadout?.thrusterSlots ?? [])
      .filter((s): s is typeof s & { item: BasicThrusterSlot } => s.item instanceof BasicThrusterSlot)
      .map(s => ({ hardpoint: s.hardpoint, item: s.item, trail: [] }));

    if (this.thrusters.length > 0) {
      const n = this.thrusters.length;
      this.avgThrust = this.thrusters.reduce((sum, t) => sum + t.item.thrust, 0) / n;
      this.avgMaxTurnPerStep =
        this.thrusters.reduce((sum, t) => sum + t.item.maxTurnRate, 0) / n / PHYSICS_HZ;
    } else {
      // Fallback constants when no thrusters are equipped
      this.avgThrust = 1;
      this.avgMaxTurnPerStep = 0.045;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    this.renderTrails(ctx);

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
        ctx.lineWidth = frac * t.item.trailWidth;
        ctx.strokeStyle = t.item.trailColor(frac * 0.75);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
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

  public unhookControls() {
    if (typeof window === "undefined") return;
    if (!this.controlsHooked) return;
    this.controlsHooked = false;
    window.removeEventListener("keydown", this.keydownHook);
    window.removeEventListener("keyup", this.keyupHook);
  }

  public debugRender(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "blue";
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x + this.vel.x * 10, this.pos.y + this.vel.y * 10);
    ctx.stroke();

    const cos = this.cosScale;
    const sin = this.sinScale;
    const vLat = this.vel.x * -sin + this.vel.y * cos;
    ctx.strokeStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x + (-sin) * vLat * 10, this.pos.y + cos * vLat * 10);
    ctx.stroke();

    ctx.strokeStyle = "magenta";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 30, this.angle.radians, this.angle.radians + this.angularVel * 100);
    ctx.stroke();
  }

  public physicsUpdate(delta: number) {
    const cos = this.cosScale;
    const sin = this.sinScale;

    let thrusting = false;

    if (
      this.heldKeys.has("w")
      || this.heldKeys.has("W")
      || this.heldKeys.has("ArrowUp")
    ) {
      this.vel.x += cos * this.avgThrust * THRUST_SCALE * delta;
      this.vel.y += sin * this.avgThrust * THRUST_SCALE * delta;
      thrusting = true;
    }
    if (
      this.heldKeys.has("s")
      || this.heldKeys.has("S")
      || this.heldKeys.has("ArrowDown")
    ) {
      this.vel.x -= cos * this.avgThrust * THRUST_SCALE * 0.75 * delta;
      this.vel.y -= sin * this.avgThrust * THRUST_SCALE * 0.75 * delta;
    }

    const maxTurn = this.avgMaxTurnPerStep;
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

    // Update per-thruster trails at their world-space hardpoint positions
    for (const t of this.thrusters) {
      const wx = this.pos.x + t.hardpoint.x * fwdCos - t.hardpoint.y * fwdSin;
      const wy = this.pos.y + t.hardpoint.x * fwdSin + t.hardpoint.y * fwdCos;

      if (thrusting) {
        t.trail.push({ x: wx, y: wy });
        if (t.trail.length > t.item.trailLength) t.trail.shift();
      } else if (t.trail.length > 0) {
        t.trail.shift(); // drain trail when not thrusting
      }
    }
  }
}
