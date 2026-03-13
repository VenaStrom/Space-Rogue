import type { Rect, V2 } from "../../types";

/** World-units of look-ahead per unit of velocity (units/step). */
const LEAD_K = 20;
/** Exponential smoothing factor applied each physics step (0 = no lead, 1 = instant). */
const LEAD_ALPHA = 0.05;

export class Camera {
  public pos: V2 = { x: 0, y: 0 };
  public zoom = 0.6;

  /** Semi-axes of the dead zone ellipse, in ship-lengths. */
  public deadZoneX = 2;
  public deadZoneY = 2;

  /**
   * Dead-zone tracking position, decoupled from the lead offset.
   * The dead zone is applied here; `pos` is derived by adding the lead.
   */
  private basePos: V2 = { x: 0, y: 0 };
  private leadX = 0;
  private leadY = 0;

  /** Initialize the camera centred on a world position (call once at startup). */
  public centerOn(p: Readonly<V2>): void {
    this.basePos.x = p.x;
    this.basePos.y = p.y;
    this.pos.x = p.x;
    this.pos.y = p.y;
  }

  /**
   * Advance the camera by one physics step.
   *
   * The dead zone keeps the ship inside an ellipse centred on `basePos`.
   * A velocity-proportional look-ahead is smoothed toward `vel * LEAD_K`
   * and added on top, shifting the view ahead of the ship at speed and
   * easing back to centre when the ship slows.
   */
  public update(shipPos: Readonly<V2>, shipVel: Readonly<V2>, shipLength: number, canvasW: number, canvasH: number) {
    // Viewport half-extents in world units at the current zoom level.
    const hw = (canvasW / 2) / this.zoom;
    const hh = (canvasH / 2) / this.zoom;

    // --- Smooth look-ahead ---
    this.leadX += (shipVel.x * LEAD_K - this.leadX) * LEAD_ALPHA;
    this.leadY += (shipVel.y * LEAD_K - this.leadY) * LEAD_ALPHA;

    // --- Dead zone, viewport-clamped ---
    // Give at most half the viewport to the dead zone so there is always
    // room for the lead offset without the ship leaving the screen.
    const rx = Math.min(this.deadZoneX * shipLength, hw * 0.5);
    const ry = Math.min(this.deadZoneY * shipLength, hh * 0.5);

    // --- Clamp lead to the remaining viewport budget (10% safety margin) ---
    const maxLeadX = hw * 0.9 - rx;
    const maxLeadY = hh * 0.9 - ry;
    this.leadX = Math.max(-maxLeadX, Math.min(maxLeadX, this.leadX));
    this.leadY = Math.max(-maxLeadY, Math.min(maxLeadY, this.leadY));

    const dx = shipPos.x - this.basePos.x;
    const dy = shipPos.y - this.basePos.y;

    if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1) {
      const angle = Math.atan2(dy / ry, dx / rx);
      this.basePos.x = shipPos.x - rx * Math.cos(angle);
      this.basePos.y = shipPos.y - ry * Math.sin(angle);
    }

    // --- Final camera position ---
    this.pos.x = this.basePos.x + this.leadX;
    this.pos.y = this.basePos.y + this.leadY;
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
