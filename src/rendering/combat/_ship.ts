import type { V2 } from "../../types";
import { Angle } from "../utils";

export class Ship {
  private pos: V2 = { x: 400, y: 300 };
  private vel: V2 = { x: 0, y: 0 };
  private acc: V2 = { x: 0, y: 0 };
  private angle: Angle = Angle.zero;

  private color = "green";
  private wingspan = 50;
  private length = 100;

  public render(ctx: CanvasRenderingContext2D) {
    const originalFillStyle = ctx.fillStyle;

    ctx.fillStyle = this.color;

    // Make triangle hull
    ctx.beginPath();
    ctx.moveTo(this.pos.x + Math.cos(this.angle.radians) * this.length, this.pos.y + Math.sin(this.angle.radians) * this.length);
    ctx.lineTo(this.pos.x + Math.cos(this.angle.radians + Math.PI / 2) * this.wingspan / 2, this.pos.y + Math.sin(this.angle.radians + Math.PI / 2) * this.wingspan / 2);
    ctx.lineTo(this.pos.x + Math.cos(this.angle.radians - Math.PI / 2) * this.wingspan / 2, this.pos.y + Math.sin(this.angle.radians - Math.PI / 2) * this.wingspan / 2);
    ctx.closePath();

    ctx.fillStyle = originalFillStyle;
  }
}