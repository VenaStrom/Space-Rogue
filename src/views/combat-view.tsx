import { useEffect, useRef } from "react";
import {
  Arena, AsteroidBelt, Camera, EnemyAI, Minimap, PlayerControl, Starscape,
  type EncounterShip, type Ship,
} from "../rendering/combat";
import { useGameState } from "../context/game-state";
import { resolveItems, type ItemDef } from "../items";
import { CH_SLP } from "../ships";
import type { HullDef } from "../types";

const PHYS_STEP_MS = 1000 / 60; // fixed 60 Hz physics tick
const WORLD_W = 8000;
const WORLD_H = 8000;

type StatsElements = {
  renderFps: HTMLElement;
  physFrames: HTMLElement;
  camZoom: HTMLElement;
};

type InitialFit = {
  hull: HullDef;
  equipped: (ItemDef | null)[];
};

/** Phase 1 dev encounter: raiders on the player's own hull with a lighter fit. */
const RAIDER_EQUIPPED_IDS = [
  "basic-weapon", "basic-weapon", null, null, null, null,
  "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
  "basic-shield", null, null, null, null, null, "static-reactor",
];

function raider(pos: { x: number; y: number }): EncounterShip {
  return {
    hull: CH_SLP,
    equipped: resolveItems(RAIDER_EQUIPPED_IDS),
    pos,
    team: "enemy",
    control: new EnemyAI(),
  };
}

const POWER_MODE_COLOR: Record<string, string> = {
  balanced: "rgba(255,255,255,0.6)",
  weapons: "#ffd75e",
  shields: "#59c8ff",
  engines: "#8dff8d",
  jump: "#c98aff",
};

function drawHud(
  ctx: CanvasRenderingContext2D,
  player: Ship | null,
  control: PlayerControl,
  status: "fighting" | "victory" | "defeat" | "escaped",
  enemiesAlive: number,
): void {
  const { width: w, height: h } = ctx.canvas;

  if (player !== null) {
    const barW = 200;
    const x = 14;
    let y = h - 30;

    // Hull
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x, y, barW, 12);
    ctx.fillStyle = "#57c957";
    ctx.fillRect(x, y, barW * player.hullFraction, 12);

    // Shield above it
    if (player.hasShield) {
      y -= 16;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, y, barW, 12);
      ctx.fillStyle = "#59c8ff";
      ctx.fillRect(x, y, barW * player.shieldFraction, 12);
    }

    // Jump drive charge above that
    const jump = player.jumpCharge;
    if (jump !== null) {
      y -= 16;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, y, barW, 12);
      ctx.fillStyle = player.jumpReady ? "#e2b8ff" : "#9d5ec9";
      ctx.fillRect(x, y, barW * jump, 12);
      if (player.jumpReady) {
        ctx.font = "10px monospace";
        ctx.fillStyle = "#1a1a1a";
        ctx.fillText("JUMP READY — press 4 to spool out", x + 6, y + 9);
      }
    }

    // Weapon cooldown pips
    const pips = player.weaponReadiness;
    const pipY = y - 22;
    pips.forEach((pip, i) => {
      const px = x + i * 18;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px, pipY, 14, 14);
      const ready = pip.fraction <= 0;
      ctx.fillStyle = ready
        ? (pip.burst ? "#c98aff" : "#ffd75e")
        : "rgba(255, 255, 255, 0.25)";
      const fillH = 14 * (1 - Math.min(1, pip.fraction));
      ctx.fillRect(px, pipY + 14 - fillH, 14, fillH);
    });

    // Power routing + turret-assist indicators
    ctx.font = "11px monospace";
    if (player.hasReactor) {
      const mode = player.currentPowerMode;
      ctx.fillStyle = POWER_MODE_COLOR[mode] ?? "rgba(255,255,255,0.6)";
      ctx.fillText(
        player.canReroute ? `PWR ▸ ${mode.toUpperCase()} [1-4, 0]` : "PWR ▸ FIXED",
        x, pipY - 24,
      );
      if (player.powerHealth < 1) {
        ctx.fillStyle = "#ff8d5e";
        ctx.fillText(`UNDERPOWERED ×${player.powerHealth.toFixed(2)}`, x, pipY - 36);
      }
    } else {
      ctx.fillStyle = "#ff8d5e";
      ctx.fillText("NO REACTOR — EMERGENCY POWER", x, pipY - 24);
    }
    ctx.fillStyle = control.autoFire ? "#ffd75e" : "rgba(255,255,255,0.25)";
    ctx.fillText(`AUTO ${control.autoFire ? "ON" : "OFF"} [T]`, x, pipY - 12);
  }

  // Enemy counter
  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "right";
  ctx.fillText(`hostiles: ${enemiesAlive}`, w - 14, 20);
  ctx.textAlign = "left";

  // End-state overlay
  if (status !== "fighting") {
    const headline = status === "victory" ? "VICTORY"
      : status === "escaped" ? "JUMPED OUT"
        : "SHIP DESTROYED";
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.font = "bold 42px monospace";
    ctx.fillStyle = status === "victory" ? "#8dff8d" : status === "escaped" ? "#c98aff" : "#ff8d8d";
    ctx.fillText(headline, w / 2, h / 2 - 10);
    ctx.font = "16px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("press R to restart", w / 2, h / 2 + 24);
    ctx.textAlign = "left";
  }
}

function main(ctx: CanvasRenderingContext2D, stats: StatsElements, fit: InitialFit): () => void {
  const starscape = new Starscape(WORLD_W, WORLD_H);
  const belt = new AsteroidBelt(WORLD_W, WORLD_H);
  const minimap = new Minimap(WORLD_W, WORLD_H);
  const camera = new Camera();
  const control = new PlayerControl(ctx.canvas, camera);
  control.attach();

  function buildArena(): Arena {
    return new Arena(belt, [
      {
        hull: fit.hull,
        equipped: fit.equipped,
        pos: { x: 550, y: 4000 },
        team: "player",
        control,
      },
      raider({ x: 1900, y: 3400 }),
      raider({ x: 2300, y: 4200 }),
      raider({ x: 1700, y: 4800 }),
    ]);
  }

  let arena = buildArena();
  camera.centerOn(arena.playerShip!.position);

  // Scroll to zoom
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    camera.zoom = Math.max(0.15, Math.min(4, camera.zoom * factor));
  };
  ctx.canvas.addEventListener("wheel", onWheel, { passive: false });

  // Restart after victory/defeat
  const onKeydown = (e: KeyboardEvent) => {
    if ((e.key === "r" || e.key === "R") && arena.status !== "fighting") {
      arena = buildArena();
      camera.centerOn(arena.playerShip!.position);
    }
  };
  window.addEventListener("keydown", onKeydown);

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
      arena.update(1); // delta=1 is always one fixed step
      accumulatedMS -= PHYS_STEP_MS;
      physSteps++;
    }

    const { width: w, height: h } = ctx.canvas;
    const player = arena.playerShip;

    if (player !== null) {
      camera.update(player.position, player.velocity, player.shipLength, w, h);
    }

    // Render at whatever rate rAF gives
    ctx.clearRect(0, 0, w, h);

    camera.applyTransform(ctx, w, h);
    starscape.render(ctx, camera.visibleRect(w, h));
    belt.render(ctx, camera.visibleRect(w, h));
    arena.render(ctx);
    camera.restoreTransform(ctx);

    const blips = [
      ...arena.ships
        .filter(s => s.team === "enemy" && s.alive)
        .map(s => ({ pos: s.position, color: "#e05a5a" })),
      ...arena.loot.map(l => ({ pos: l.pos, color: "#ffc850" })),
    ];
    if (player !== null) {
      minimap.render(ctx, player.position, player.heading, camera.visibleRect(w, h), w, h, blips);
    }

    drawHud(ctx, player, control, arena.status, arena.enemiesAlive);

    // Update DOM HUD (direct textContent mutation avoids React re-renders)
    stats.renderFps.textContent = `${Math.round(1000 / deltaMS).toString().padStart(2, " ")} fps`;
    stats.physFrames.textContent = `${physSteps.toString().padStart(2, " ")} phys`;
    stats.camZoom.textContent = `${camera.zoom.toFixed(2)}x zoom`;

    rafHandle = window.requestAnimationFrame(frame);
  }

  rafHandle = window.requestAnimationFrame(frame);

  return () => {
    window.cancelAnimationFrame(rafHandle);
    window.removeEventListener("keydown", onKeydown);
    ctx.canvas.removeEventListener("wheel", onWheel);
    control.detach();
  };
}

export function CombatView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const physRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLSpanElement>(null);
  const { hull, equipped } = useGameState();
  // Capture the fit once at mount time — changes in the editor take effect on re-entering combat
  const fitRef = useRef<InitialFit>({ hull, equipped: resolveItems(equipped) });

  useEffect(() => {
    if (!canvasRef.current || !fpsRef.current || !physRef.current || !zoomRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    return main(ctx, { renderFps: fpsRef.current, physFrames: physRef.current, camZoom: zoomRef.current }, fitRef.current);
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

    <p className="mt-2 text-xs text-gray-600 font-mono">
      WASD fly · mouse aim · LMB fire · T turret auto · 1/2/3 power to wpn/shd/eng · 4 spool jump · 0 balanced · scroll zoom · R restart
    </p>
  </main>;
}
