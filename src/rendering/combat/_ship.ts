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
  private controlsHook = (_e: KeyboardEvent) => { };

  public render(ctx: CanvasRenderingContext2D) {
    const originalFillStyle = ctx.fillStyle;

    ctx.fillStyle = this.color;

    // Make triangle hull
    ctx.beginPath();
    ctx.moveTo(this.pos.x + Math.cos(this.angle.radians) * this.length, this.pos.y + Math.sin(this.angle.radians) * this.length);
    ctx.lineTo(this.pos.x + Math.cos(this.angle.radians + Math.PI / 2) * this.wingspan / 2, this.pos.y + Math.sin(this.angle.radians + Math.PI / 2) * this.wingspan / 2);
    ctx.lineTo(this.pos.x + Math.cos(this.angle.radians - Math.PI / 2) * this.wingspan / 2, this.pos.y + Math.sin(this.angle.radians - Math.PI / 2) * this.wingspan / 2);
    ctx.closePath();

    ctx.fill();


    this.debugRender(ctx);

    ctx.fillStyle = originalFillStyle;
  }

  public hookControls() {
    if (typeof window === "undefined") return;
    if (this.controlsHooked) return;

    this.controlsHooked = true;
    this.controlsHook = (e) => {
      const keys: Record<string, string[]> = {
        thrust: ["w", "ArrowUp"],
        reverse: ["s", "ArrowDown"],
        turnLeft: ["a", "ArrowLeft"],
        turnRight: ["d", "ArrowRight"],
      };

      if (keys.thrust.includes(e.key)) {
        this.acc.x += this.cosScale * 0.1;
        this.acc.y += this.sinScale * 0.1;
      }
      if (keys.reverse.includes(e.key)) {
        this.acc.x -= this.cosScale * 0.1;
        this.acc.y -= this.sinScale * 0.1;
      }
      if (keys.turnLeft.includes(e.key)) {
        this.angularAcc -= 0.001;
      }
      if (keys.turnRight.includes(e.key)) {
        this.angularAcc += 0.001;
      }
    };

    window.addEventListener("keydown", this.controlsHook);
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
    window.removeEventListener("keydown", this.controlsHook);
  }

  public physicsUpdate(delta: number) {
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