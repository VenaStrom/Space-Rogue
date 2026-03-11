import { useEffect, useRef } from "react";
import { Ship } from "../rendering/combat";

function main(ctx: CanvasRenderingContext2D) {

  const ship = new Ship();

  ship.render(ctx);
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