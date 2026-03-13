export class Starscape {
  private readonly offscreen: OffscreenCanvas;
  public readonly worldWidth: number;
  public readonly worldHeight: number;

  constructor(worldWidth: number, worldHeight: number, starCount = 1500) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    this.offscreen = new OffscreenCanvas(worldWidth, worldHeight);
    const ctx = this.offscreen.getContext("2d")!;

    ctx.fillStyle = "#00001a";
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * worldWidth;
      const y = Math.random() * worldHeight;
      const roll = Math.random();

      // ~80% dim single-pixel, ~15% medium, ~5% bright/larger
      const size   = roll < 0.80 ? 1 : roll < 0.95 ? 1.5 : 2.5;
      const bright = Math.floor(Math.random() * 80 + (roll < 0.80 ? 120 : 180));

      ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
      ctx.fillRect(x, y, size, size);
    }
  }

  /**
   * Draw the starscape. Must be called while the camera transform is active
   * so the world-space position is correct.
   */
  public render(ctx: CanvasRenderingContext2D) {
    ctx.drawImage(this.offscreen, 0, 0);
  }
}
