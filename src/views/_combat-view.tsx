import { useEffect, useRef } from "react";
import { Ship } from "../rendering/combat";

function main(ctx: CanvasRenderingContext2D) {

  const ship = new Ship();

  ship.render(ctx);
  ship.hookControls();


  let lastTime = performance.now();

  function frame() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // FPS counter in corner
    ctx.fillStyle = "white";
    const now = performance.now();
    const deltaMS = now - lastTime;
    lastTime = now;
    ctx.fillText(`${Math.round(1000 / deltaMS)} FPS`, 10, 20);

    const physDelta = deltaMS / 16.66666666666667;

    ship.physicsUpdate(physDelta);
    ship.render(ctx);

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