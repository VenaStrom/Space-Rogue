import { useEffect, useRef } from "react";
import { Camera, Ship } from "../rendering/combat";

const PHYS_STEP_MS = 1000 / 60; // fixed 60 Hz physics tick

function main(ctx: CanvasRenderingContext2D) {
  const ship = new Ship();
  ship.hookControls();

  const camera = new Camera();
  // Start camera centered on ship
  camera.pos = { x: ship.position.x, y: ship.position.y };

  // Scroll to zoom
  ctx.canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    camera.zoom = Math.max(0.25, Math.min(4, camera.zoom * factor));
  }, { passive: false });

  let lastTime = performance.now();
  let accumulatedMS = 0;
  let renderFps = 0;

  function frame() {
    const now = performance.now();
    // Clamp to 100 ms to prevent a "spiral of death" after tab suspension
    const deltaMS = Math.min(now - lastTime, 100);
    lastTime = now;
    renderFps = 1000 / deltaMS;

    // Drain accumulator in fixed physics steps
    accumulatedMS += deltaMS;
    while (accumulatedMS >= PHYS_STEP_MS) {
      ship.physicsUpdate(1); // delta=1 is always one fixed step
      accumulatedMS -= PHYS_STEP_MS;
    }

    const { width: w, height: h } = ctx.canvas;

    camera.update(ship.position, ship.shipLength);

    // Render at whatever rate rAF gives
    ctx.clearRect(0, 0, w, h);

    camera.applyTransform(ctx, w, h);
    ship.render(ctx);
    camera.restoreTransform(ctx);

    // HUD drawn in screen space after restoring transform
    ctx.fillStyle = "white";
    ctx.fillText(`${Math.round(renderFps)} FPS`, 10, 20);

    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
}

export function CombatView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    main(ctx);
  }, []);

  return <main>
    <h2>Combat</h2>

    <canvas
      ref={canvasRef}
      height={600}
      width={800}
      className={`
        bg-gray-900  
        aspect-4/3
        w-8/12
        rounded-sm
      `}
    />
  </main>;
}