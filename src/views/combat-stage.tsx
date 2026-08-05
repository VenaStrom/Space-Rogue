import { useEffect, useRef } from "react";
import {
  Arena, AsteroidBelt, BridgeControl, Camera, EnemyAI, Minimap, PLAYER_SPAWN, PlayerControl, Starscape,
  type ArenaStatus, type EncounterShip, type Ship,
} from "../rendering/combat";
import type { ItemDef } from "../items";
import { CommandKind, ItemCategory, type HullDef, type V2 } from "../types";

const PHYS_STEP_MS = 1000 / 60; // fixed 60 Hz physics tick
const WORLD_W = 8000;
const WORLD_H = 8000;

export type StageEnemy = {
  hull: HullDef;
  equipped: (ItemDef | null)[];
  pos: V2;
};

export type CombatResult = {
  status: Exclude<ArenaStatus, "fighting">;
  lootItemIds: string[];
  /** Player hull integrity when the fight ended, 0..1. */
  hullFraction: number;
};

type HelmControl = PlayerControl | BridgeControl;

type StatsElements = {
  renderFps: HTMLElement;
  physFrames: HTMLElement;
  camZoom: HTMLElement;
};

/** The command slot decides how the ship is flown — the whole point of the design. */
function helmFor(equipped: (ItemDef | null)[], canvas: HTMLCanvasElement, camera: Camera): HelmControl {
  const command = equipped.find(d => d?.category === ItemCategory.Command);
  if (command?.category === ItemCategory.Command && command.stats.kind === CommandKind.Bridge) {
    return new BridgeControl(canvas, camera);
  }
  return new PlayerControl(canvas, camera);
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
  control: HelmControl,
  status: ArenaStatus,
  enemiesAlive: number,
  allowRestart: boolean,
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

    // Power routing + helm indicators
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
    if (control instanceof PlayerControl) {
      ctx.fillStyle = control.autoFire ? "#ffd75e" : "rgba(255,255,255,0.25)";
      ctx.fillText(`AUTO ${control.autoFire ? "ON" : "OFF"} [T]`, x, pipY - 12);
    } else {
      ctx.fillStyle = "#c98aff";
      const focus = control.focusTarget !== null ? "FOCUS LOCKED" : "no focus";
      ctx.fillText(`BRIDGE · NAV ${control.navPoints.length}/${player.navPointLimit} · ${focus}`, x, pipY - 12);
      if (control.timeScale < 1) {
        ctx.fillStyle = "#e2b8ff";
        ctx.fillText("TACTICAL TIME", x, pipY - 48);
      }
    }
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
    if (allowRestart) {
      ctx.font = "16px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText("press R to restart", w / 2, h / 2 + 24);
    }
    ctx.textAlign = "left";
  }
}

type StageProps = {
  hull: HullDef;
  equipped: (ItemDef | null)[];
  hullFraction?: number;
  enemies: StageEnemy[];
  /** Fired exactly once when the fight resolves. */
  onEnd?: (result: CombatResult) => void;
  /** Dev sandbox: R rebuilds the encounter after it ends. */
  allowRestart?: boolean;
};

function main(
  ctx: CanvasRenderingContext2D,
  stats: StatsElements,
  { hull, equipped, hullFraction = 1, enemies, onEnd, allowRestart = false }: StageProps,
): () => void {
  const starscape = new Starscape(WORLD_W, WORLD_H);
  const belt = new AsteroidBelt(WORLD_W, WORLD_H);
  const minimap = new Minimap(WORLD_W, WORLD_H);
  const camera = new Camera();
  const control = helmFor(equipped, ctx.canvas, camera);
  control.attach();

  function buildArena(): Arena {
    const entries: EncounterShip[] = [
      { hull, equipped, pos: { ...PLAYER_SPAWN }, team: "player", control, hullFraction },
      ...enemies.map((e): EncounterShip => ({
        hull: e.hull,
        equipped: e.equipped,
        pos: { ...e.pos },
        team: "enemy",
        control: new EnemyAI(),
      })),
    ];
    return new Arena(belt, entries);
  }

  let arena = buildArena();
  let ended = false;
  camera.centerOn(arena.playerShip!.position);

  // Scroll to zoom
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    camera.zoom = Math.max(0.15, Math.min(4, camera.zoom * factor));
  };
  ctx.canvas.addEventListener("wheel", onWheel, { passive: false });

  const onKeydown = (e: KeyboardEvent) => {
    if (allowRestart && (e.key === "r" || e.key === "R") && arena.status !== "fighting") {
      arena = buildArena();
      ended = false;
      camera.centerOn(arena.playerShip!.position);
    }
    // Dev builds only: K deletes every hostile through the normal death path
    if (import.meta.env.DEV && (e.key === "k" || e.key === "K") && arena.status === "fighting") {
      arena.killAllEnemies();
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

    // Drain accumulator in fixed physics steps; count steps per render frame.
    // Bridge tactical time dilates the simulation, not the render loop.
    accumulatedMS += deltaMS * control.timeScale;
    let physSteps = 0;
    while (accumulatedMS >= PHYS_STEP_MS) {
      arena.update(1); // delta=1 is always one fixed step
      accumulatedMS -= PHYS_STEP_MS;
      physSteps++;
    }

    if (!ended && arena.status !== "fighting") {
      ended = true;
      const player = arena.playerShip;
      onEnd?.({
        status: arena.status,
        lootItemIds: arena.status === "victory" ? arena.loot.map(l => l.itemId) : [],
        hullFraction: player?.hullFraction ?? 0,
      });
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
    if (player !== null && control instanceof BridgeControl) control.renderWorld(ctx, player);
    camera.restoreTransform(ctx);

    const blips = [
      ...arena.ships
        .filter(s => s.team === "enemy" && s.inArena)
        .map(s => ({ pos: s.position, color: "#e05a5a" })),
      ...arena.loot.map(l => ({ pos: l.pos, color: "#ffc850" })),
    ];
    if (player !== null) {
      minimap.render(ctx, player.position, player.heading, camera.visibleRect(w, h), w, h, blips);
    }

    drawHud(ctx, player, control, arena.status, arena.enemiesAlive, allowRestart);

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

export function CombatStage(props: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const physRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLSpanElement>(null);
  // Capture the stage inputs once at mount — a fight runs on the fit it started with
  const propsRef = useRef(props);

  useEffect(() => {
    if (!canvasRef.current || !fpsRef.current || !physRef.current || !zoomRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    return main(
      ctx,
      { renderFps: fpsRef.current, physFrames: physRef.current, camZoom: zoomRef.current },
      propsRef.current,
    );
  }, []);

  return <div className="relative flex justify-center items-center max-w-fit">
    <canvas
      ref={canvasRef}
      height={600}
      width={800}
      className="bg-gray-900 aspect-4/3 w-full rounded-sm block"
    />
    <div className="absolute top-2 left-2 text-white text-xs font-mono leading-tight pointer-events-none select-none">
      <span ref={fpsRef}>-- fps</span><br />
      <span ref={physRef}>-- phys</span><br />
      <span ref={zoomRef}>-- zoom</span>
    </div>
  </div>;
}

export const STAGE_CONTROLS_HINT =
  "cockpit: WASD fly · mouse aim · LMB fire · T turret auto — bridge: LMB plot nav / click enemy to focus · RMB manual fire · C clear · SPACE tactical time — both: 1/2/3 power wpn/shd/eng · 4 spool jump · 0 balanced · scroll zoom"
  + (import.meta.env.DEV ? " · K kill-all (dev)" : "");
