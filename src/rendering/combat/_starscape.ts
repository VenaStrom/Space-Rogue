import type { Rect } from "../../types";

interface Star {
  x: number;
  y: number;
  size: number;
  style: string;
}

export class Starscape {
  private readonly stars: Star[];
  public readonly worldWidth: number;
  public readonly worldHeight: number;

  constructor(worldWidth: number, worldHeight: number, starCount = 1500) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    const raw: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * worldWidth;
      const y = Math.random() * worldHeight;
      const roll = Math.random();

      // ~80% dim single-pixel, ~15% medium, ~5% bright/larger
      const size = roll < 0.80 ? 1 : roll < 0.95 ? 1.5 : 2.5;
      const bright = Math.floor(Math.random() * 80 + (roll < 0.80 ? 120 : 180));

      raw.push({ x, y, size, style: `rgb(${bright},${bright},${bright})` });
    }

    // Sort by style string so consecutive stars with the same color can share a single fillStyle assignment, minimizing canvas state changes.
    raw.sort((a, b) => (a.style < b.style ? -1 : a.style > b.style ? 1 : 0));
    this.stars = raw;
  }

  /**
   * Draw only the stars inside visibleRect. Must be called while the camera
   * transform is active so world-space coordinates are correct.
   *
   * Drawing only visible stars per-frame (instead of blitting a full-world
   * OffscreenCanvas) keeps cost proportional to the number of stars on screen
   * rather than the total world size.
   */
  public render(ctx: CanvasRenderingContext2D, visibleRect: Rect) {
    const x1 = visibleRect.x;
    const y1 = visibleRect.y;
    const x2 = x1 + visibleRect.w;
    const y2 = y1 + visibleRect.h;

    let lastStyle = '';
    for (const star of this.stars) {
      if (star.x < x1 || star.x > x2 || star.y < y1 || star.y > y2) continue;
      if (star.style !== lastStyle) {
        ctx.fillStyle = star.style;
        lastStyle = star.style;
      }
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }
}
