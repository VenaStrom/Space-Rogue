import type { Rect, V2 } from "../../types";

export class Camera {
  public pos: V2 = { x: 0, y: 0 };
  public zoom = 1;

  /** Semi-axes of the dead zone ellipse, in ship-lengths. */
  public deadZoneX = 2;
  public deadZoneY = 2;

  /**
   * Push the camera just enough so the ship stays inside the dead-zone ellipse
   * centered on the camera. The ellipse has semi-axes
   * (deadZoneX * shipLength, deadZoneY * shipLength) in world units.
   */
  public update(shipPos: Readonly<V2>, shipLength: number) {
    const rx = this.deadZoneX * shipLength;
    const ry = this.deadZoneY * shipLength;

    const dx = shipPos.x - this.pos.x;
    const dy = shipPos.y - this.pos.y;

    if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1) {
      // Angle in normalized ellipse space → boundary point in world space
      const angle = Math.atan2(dy / ry, dx / rx);
      this.pos.x = shipPos.x - rx * Math.cos(angle);
      this.pos.y = shipPos.y - ry * Math.sin(angle);
    }
  }

  /** Apply world-to-screen transform. Call before drawing world objects. */
  public applyTransform(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.pos.x, -this.pos.y);
  }

  /** Restore transform. Call after drawing world objects. */
  public restoreTransform(ctx: CanvasRenderingContext2D) {
    ctx.restore();
  }

  /** Returns the rectangle of world space currently visible on screen. */
  public visibleRect(canvasW: number, canvasH: number): Rect {
    const hw = (canvasW / 2) / this.zoom;
    const hh = (canvasH / 2) / this.zoom;
    return { x: this.pos.x - hw, y: this.pos.y - hh, w: hw * 2, h: hh * 2 };
  }
}
