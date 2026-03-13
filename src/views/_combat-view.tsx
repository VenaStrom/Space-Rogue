import { useEffect, useRef } from "react";
import { Camera, AsteroidBelt, Minimap, Ship, Starscape } from "../rendering/combat";
import { useGameState } from "../context/game-state";
import type { V2 } from "../types";

const PHYS_STEP_MS = 1000 / 60; // fixed 60 Hz physics tick

type StatsElements = {
  renderFps: HTMLElement;
  physFrames: HTMLElement;
  camZoom: HTMLElement;
};

function main(ctx: CanvasRenderingContext2D, stats: StatsElements, initialHull: V2[]): () => void {
  const ship = new Ship({ x: 550, y: 4000 }, initialHull);
  ship.hookControls();

  const starscape = new Starscape(8000, 8000);
  const asteroidBelt = new AsteroidBelt(8000, 8000);
  const minimap = new Minimap(8000, 8000);
  const camera = new Camera();
  // Start camera centered on ship
  camera.centerOn(ship.position);

  // Scroll to zoom
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    camera.zoom = Math.max(0.15, Math.min(4, camera.zoom * factor));
  };
  ctx.canvas.addEventListener("wheel", onWheel, { passive: false });

  let lastTime = performance.now();
  let accumulatedMS = 0;
  let rafHandle: number;

  function frame() {
    const now = performance.now();
    // Clamp to 100 ms to prevent a "spiral of death" after tab suspension
    const deltaMS = Math.min(now - lastTime, 100);
    lastTime = now;

    // Drain accumulator in fixed physics steps; count steps per render frame
    accumulatedMS += deltaMS;
    let physSteps = 0;
    while (accumulatedMS >= PHYS_STEP_MS) {
      ship.physicsUpdate(1); // delta=1 is always one fixed step
      asteroidBelt.resolveShip(ship);
      accumulatedMS -= PHYS_STEP_MS;
      physSteps++;
    }

    const { width: w, height: h } = ctx.canvas;

    camera.update(ship.position, ship.velocity, ship.shipLength, w, h);

    // Render at whatever rate rAF gives
    ctx.clearRect(0, 0, w, h);

    camera.applyTransform(ctx, w, h);
    starscape.render(ctx, camera.visibleRect(w, h));
    asteroidBelt.render(ctx, camera.visibleRect(w, h));
    ship.render(ctx);
    camera.restoreTransform(ctx);
    minimap.render(ctx, ship.position, ship.heading, camera.visibleRect(w, h), w, h);

    // Update DOM HUD (direct textContent mutation avoids React re-renders)
    stats.renderFps.textContent = `${Math.round(1000 / deltaMS).toString().padStart(2, " ")} fps`;
    stats.physFrames.textContent = `${physSteps.toString().padStart(2, " ")} phys`;
    stats.camZoom.textContent = `${camera.zoom.toFixed(2)}x zoom`;

    rafHandle = window.requestAnimationFrame(frame);
  }

  rafHandle = window.requestAnimationFrame(frame);

  return () => {
    window.cancelAnimationFrame(rafHandle);
    ctx.canvas.removeEventListener("wheel", onWheel);
    ship.unhookControls();
  };
}

export function CombatView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const physRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLSpanElement>(null);
  const { playerShip } = useGameState();
  // Capture hull once at mount time — changes in the editor take effect on re-entering combat
  const hullRef = useRef(playerShip.hullVertices);

  useEffect(() => {
    if (!canvasRef.current || !fpsRef.current || !physRef.current || !zoomRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    return main(ctx, { renderFps: fpsRef.current, physFrames: physRef.current, camZoom: zoomRef.current }, hullRef.current);
  }, []);

  return <main>
    <h2>Combat</h2>

    <div className="relative flex justify-center items-center max-w-fit">
      <canvas
        ref={canvasRef}
        height={600}
        width={800}
        className={`
          bg-gray-900
          aspect-4/3
          w-full
          rounded-sm
          block
        `}
      />
      <div className="absolute top-2 left-2 text-white text-xs font-mono leading-tight pointer-events-none select-none">
        <span ref={fpsRef}>-- fps</span><br />
        <span ref={physRef}>-- phys</span><br />
        <span ref={zoomRef}>-- zoom</span>
      </div>
    </div>
  </main>;
}