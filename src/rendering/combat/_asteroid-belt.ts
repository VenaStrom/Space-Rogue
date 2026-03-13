import type { Rect, V2 } from "../../types";
import type { Ship } from "./_ship";

type Asteroid = {
  x: number;
  y: number;
  /** Bounding circle radius used for culling and collision. */
  radius: number;
  /** Pre-baked absolute vertex positions for the jagged polygon. */
  verts: ReadonlyArray<{ x: number; y: number }>;
};

export class AsteroidBelt {
  private readonly asteroids: Asteroid[];
  public readonly worldWidth: number;
  public readonly worldHeight: number;

  constructor(worldWidth: number, worldHeight: number, beltWidth = 400, count = 700) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.asteroids = [];

    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      const radius = 25 + Math.random() * 55; // 25–80 units

      let cx: number, cy: number;
      switch (side) {
        case 0: cx = Math.random() * worldWidth; cy = Math.random() * beltWidth; break;
        case 1: cx = Math.random() * worldWidth; cy = worldHeight - Math.random() * beltWidth; break;
        case 2: cx = Math.random() * beltWidth; cy = Math.random() * worldHeight; break;
        default: cx = worldWidth - Math.random() * beltWidth; cy = Math.random() * worldHeight;
      }

      // Build an irregular polygon by jittering both the angle and the radius
      // at each vertex so no two asteroids look the same.
      const sides = 7 + Math.floor(Math.random() * 5); // 7–11 sides
      const verts: V2[] = [];
      for (let j = 0; j < sides; j++) {
        const baseAngle = (j / sides) * Math.PI * 2;
        const angle = baseAngle + (Math.random() - 0.5) * (Math.PI / sides);
        const r = radius * (0.60 + Math.random() * 0.40);
        verts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
      }

      this.asteroids.push({ x: cx, y: cy, radius, verts });
    }
  }

  public render(ctx: CanvasRenderingContext2D, visibleRect: Rect): void {
    const x1 = visibleRect.x;
    const y1 = visibleRect.y;
    const x2 = x1 + visibleRect.w;
    const y2 = y1 + visibleRect.h;

    ctx.lineWidth = 1.5;

    for (const m of this.asteroids) {
      if (m.x + m.radius < x1 || m.x - m.radius > x2 ||
        m.y + m.radius < y1 || m.y - m.radius > y2) continue;

      ctx.beginPath();
      ctx.moveTo(m.verts[0].x, m.verts[0].y);
      for (let i = 1; i < m.verts.length; i++) {
        ctx.lineTo(m.verts[i].x, m.verts[i].y);
      }
      ctx.closePath();

      ctx.fillStyle = "#3a3830";
      ctx.fill();
      ctx.strokeStyle = "#706858";
      ctx.stroke();
    }
  }

  /**
   * Resolve collisions between the ship and the belt asteroids, and enforce the
   * hard world boundary. Call once per physics step, after physicsUpdate.
   *
   * Uses circle-vs-circle detection with the asteroid's bounding radius and the
   * ship's collider radius. Overlapping pairs are separated along the contact
   * normal and the ship's velocity component into the obstacle is cancelled.
   */
  public resolveShip(ship: Ship): void {
    // ship.position is a live reference to the internal pos object;
    // pushOut mutates it in place so subsequent reads see updated values.
    const pos = ship.position;
    const r = ship.colliderRadius;

    // Hard world-boundary stops (always enforced regardless of asteroids)
    if (pos.x - r < 0) ship.pushOut(r - pos.x, 0, 1, 0);
    if (pos.x + r > this.worldWidth) ship.pushOut(this.worldWidth - r - pos.x, 0, -1, 0);
    if (pos.y - r < 0) ship.pushOut(0, r - pos.y, 0, 1);
    if (pos.y + r > this.worldHeight) ship.pushOut(0, this.worldHeight - r - pos.y, 0, -1);

    // Circle-vs-circle asteroid collisions
    for (const m of this.asteroids) {
      const dx = pos.x - m.x;
      const dy = pos.y - m.y;
      const minDist = r + m.radius;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minDist * minDist || distSq === 0) continue;

      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      ship.pushOut(nx * (minDist - dist), ny * (minDist - dist), nx, ny);
    }
  }
}
