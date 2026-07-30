import type { Rect, V2 } from "../../types";

const SIZE = 150;  // minimap side length in screen pixels
const PAD = 10;   // screen pixels from canvas edge

export class Minimap {
  private readonly worldW: number;
  private readonly worldH: number;
  private readonly beltWidth: number;

  constructor(worldW: number, worldH: number, beltWidth = 400) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.beltWidth = beltWidth;
  }

  /**
   * Draw the minimap overlay. Must be called in screen space — i.e. after
   * Camera.restoreTransform so the camera transform is no longer active.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    shipPos: Readonly<V2>,
    shipHeading: number,
    visibleRect: Rect,
    canvasW: number,
    canvasH: number,
  ): void {
    const s = SIZE;
    const ox = canvasW - PAD - s;   // top-left x of minimap
    const oy = canvasH - PAD - s;   // top-left y of minimap
    const scx = s / this.worldW;    // world → minimap x scale
    const scy = s / this.worldH;    // world → minimap y scale

    ctx.save();

    // Clip everything to the minimap rectangle
    ctx.beginPath();
    ctx.rect(ox, oy, s, s);
    ctx.clip();

    // Background
    ctx.fillStyle = "rgba(0, 0, 20, 0.82)";
    ctx.fillRect(ox, oy, s, s);

    // Asteroid belt zone — filled strips along each edge
    const bw = this.beltWidth * scx;
    const bh = this.beltWidth * scy;
    ctx.fillStyle = "rgba(90, 60, 25, 0.70)";
    ctx.fillRect(ox, oy, s, bh);  // top
    ctx.fillRect(ox, oy + s - bh, s, bh);  // bottom
    ctx.fillRect(ox, oy, bw, s);   // left
    ctx.fillRect(ox + s - bw, oy, bw, s);   // right

    // Camera visible rect
    ctx.strokeStyle = "rgba(120, 175, 255, 0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      ox + visibleRect.x * scx,
      oy + visibleRect.y * scy,
      visibleRect.w * scx,
      visibleRect.h * scy,
    );

    // Ship — small triangle pointing along heading
    const px = ox + shipPos.x * scx;
    const py = oy + shipPos.y * scy;
    const cos = Math.cos(shipHeading);
    const sin = Math.sin(shipHeading);
    const r = 4;  // half-size in screen pixels

    ctx.fillStyle = "#4cf";
    ctx.beginPath();
    // nose
    ctx.moveTo(px + cos * r * 1.6, py + sin * r * 1.6);
    // left wing
    ctx.lineTo(px - sin * r - cos * r * 0.7, py + cos * r - sin * r * 0.7);
    // right wing
    ctx.lineTo(px + sin * r - cos * r * 0.7, py - cos * r - sin * r * 0.7);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = "rgba(80, 115, 210, 0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, s, s);

    ctx.restore();
  }
}
