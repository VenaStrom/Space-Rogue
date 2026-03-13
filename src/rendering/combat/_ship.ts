import type { V2 } from "../../types";
import { Angle } from "../utils";

export class Ship {
  private pos: V2 = { x: 400, y: 300 };
  private vel: V2 = { x: 0, y: 0 };
  private acc: V2 = { x: 0, y: 0 };
  private angle: Angle = Angle.zero;
  private angularVel = 0;
  private angularAcc = 0;

  private get cosScale() { return Math.cos(this.angle.radians); }
  private get sinScale() { return Math.sin(this.angle.radians); }

  private color = "green";
  private wingspan = 50;
  private length = 100;

  private controlsHooked = false;
  private heldKeys: Set<string> = new Set();
  private keydownHook = (_e: KeyboardEvent) => { };
  private keyupHook = (_e: KeyboardEvent) => { };

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

    // Acceleration vector
    ctx.strokeStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x + this.acc.x * 1000, this.pos.y + this.acc.y * 1000);
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
    // Continuous input — applied every frame while key is held
    if (this.heldKeys.has("w") || this.heldKeys.has("ArrowUp")) {
      this.acc.x += this.cosScale * 0.05;
      this.acc.y += this.sinScale * 0.05;
    }
    if (this.heldKeys.has("s") || this.heldKeys.has("ArrowDown")) {
      this.acc.x -= this.cosScale * 0.05;
      this.acc.y -= this.sinScale * 0.05;
    }
    if (this.heldKeys.has("a") || this.heldKeys.has("ArrowLeft")) {
      this.angularAcc -= 0.005;
    }
    if (this.heldKeys.has("d") || this.heldKeys.has("ArrowRight")) {
      this.angularAcc += 0.005;
    }

    this.vel.x += this.acc.x * delta;
    this.vel.y += this.acc.y * delta;

    this.pos.x += this.vel.x * delta;
    this.pos.y += this.vel.y * delta;

    this.angularVel += this.angularAcc * delta;
    this.angle = this.angle.add(this.angularVel * delta);

    // Friction
    this.vel.x *= 0.99;
    this.vel.y *= 0.99;
    this.angularVel *= 0.9;

    // Reset acceleration
    this.acc.x = 0;
    this.acc.y = 0;
    this.angularAcc = 0;
  }
}