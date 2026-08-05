import { useEffect, useRef } from "react";
import {
  Arena, AsteroidBelt, BridgeControl, Camera, EnemyAI, Minimap, PLAYER_SPAWN, PlayerControl, Starscape,
  type ArenaStatus, type EncounterShip,
} from "../rendering/combat";
import { ItemCategory as IC, CommandKind, type HullDef } from "../types";
import type { ItemDef } from "../items";
import type { V2 } from "../types";

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

/** DOM elements the frame loop mutates directly — no React re-renders at 60 Hz. */
type HudDom = {
  renderFps: HTMLElement;
  physFrames: HTMLElement;
  camZoom: HTMLElement;
  hostiles: HTMLElement;
  hullFill: HTMLElement;
  shieldFill: HTMLElement | null;
  jumpFill: HTMLElement | null;
  jumpLabel: HTMLElement | null;
  pipFills: HTMLElement[];
  mode: HTMLElement;
  helm: HTMLElement;
  warn: HTMLElement;
};

/** The command slot decides how the ship is flown — the whole point of the design. */
function helmFor(equipped: (ItemDef | null)[], canvas: HTMLCanvasElement, camera: Camera): HelmControl {
  const command = equipped.find(d => d?.category === IC.Command);
  if (command?.category === IC.Command && command.stats.kind === CommandKind.Bridge) {
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

function updateHud(hud: HudDom, arena: Arena, control: HelmControl): void {
  hud.hostiles.textContent = `${arena.enemiesAlive}`;
  const player = arena.playerShip;
  if (player === null) return;

  hud.hullFill.style.width = `${Math.round(player.hullFraction * 100)}%`;
  if (hud.shieldFill !== null) {
    hud.shieldFill.style.width = `${Math.round(player.shieldFraction * 100)}%`;
  }
  if (hud.jumpFill !== null && hud.jumpLabel !== null) {
    const charge = player.jumpCharge ?? 0;
    hud.jumpFill.style.width = `${Math.round(charge * 100)}%`;
    hud.jumpFill.style.backgroundColor = player.jumpReady ? "#e2b8ff" : "#9d5ec9";
    hud.jumpLabel.textContent = player.jumpReady ? "READY — 4 to spool out" : `${Math.round(charge * 100)}%`;
  }

  player.weaponReadiness.forEach((pip, i) => {
    const fill = hud.pipFills[i];
    if (fill === undefined) return;
    fill.style.height = `${Math.round((1 - Math.min(1, pip.fraction)) * 100)}%`;
    fill.style.backgroundColor = pip.fraction <= 0
      ? (pip.burst ? "#c98aff" : "#ffd75e")
      : "rgba(255,255,255,0.25)";
  });

  if (player.hasReactor) {
    const mode = player.currentPowerMode;
    hud.mode.textContent = player.canReroute ? `PWR ▸ ${mode.toUpperCase()}` : "PWR ▸ FIXED";
    hud.mode.style.color = POWER_MODE_COLOR[mode] ?? "rgba(255,255,255,0.6)";
  } else {
    hud.mode.textContent = "NO REACTOR";
    hud.mode.style.color = "#ff8d5e";
  }

  if (control instanceof PlayerControl) {
    hud.helm.textContent = `AUTO ${control.autoFire ? "ON" : "OFF"} [T]`;
    hud.helm.style.color = control.autoFire ? "#ffd75e" : "rgba(255,255,255,0.35)";
  } else {
    const focus = control.focusTarget !== null ? "focus locked" : "no focus";
    hud.helm.textContent = `NAV ${control.navPoints.length}/${player.navPointLimit} · ${focus}`;
    hud.helm.style.color = "#c98aff";
  }

  const warns: string[] = [];
  if (player.hasReactor && player.powerHealth < 1) warns.push(`UNDERPOWERED ×${player.powerHealth.toFixed(2)}`);
  if (control instanceof BridgeControl && control.timeScale < 1) warns.push("TACTICAL TIME");
  hud.warn.textContent = warns.join(" · ");
}

function drawEndOverlay(ctx: CanvasRenderingContext2D, status: ArenaStatus, allowRestart: boolean): void {
  if (status === "fighting") return;
  const { width: w, height: h } = ctx.canvas;
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
  hud: HudDom,
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

    drawEndOverlay(ctx, arena.status, allowRestart);

    // All ship status lives in the DOM margin, mutated directly per frame
    updateHud(hud, arena, control);
    hud.renderFps.textContent = `${Math.round(1000 / deltaMS).toString().padStart(2, " ")} fps`;
    hud.physFrames.textContent = `${physSteps.toString().padStart(2, " ")} phys`;
    hud.camZoom.textContent = `${camera.zoom.toFixed(2)}x zoom`;

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

function StatusBar({ label, color, fillRef, labelRef }: {
  label: string;
  color: string;
  fillRef: React.RefObject<HTMLDivElement | null>;
  labelRef?: React.RefObject<HTMLSpanElement | null>;
}) {
  return <div>
    <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500">
      <span>{label}</span>
      {labelRef !== undefined ? <span ref={labelRef} /> : null}
    </div>
    <div className="h-3 bg-black/60 rounded-sm overflow-hidden border border-gray-800">
      <div ref={fillRef} className="h-full" style={{ width: "100%", backgroundColor: color }} />
    </div>
  </div>;
}

export function CombatStage(props: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const physRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLSpanElement>(null);
  const hostilesRef = useRef<HTMLSpanElement>(null);
  const hullRef = useRef<HTMLDivElement>(null);
  const shieldRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef<HTMLDivElement>(null);
  const jumpLabelRef = useRef<HTMLSpanElement>(null);
  const pipsRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);
  const helmRef = useRef<HTMLSpanElement>(null);
  const warnRef = useRef<HTMLSpanElement>(null);
  // Capture the stage inputs once at mount — a fight runs on the fit it started with
  const propsRef = useRef(props);

  // Static facts about the fit, for which HUD rows exist at all
  const defs = props.equipped;
  const weaponCount = defs.filter(d => d?.category === IC.Weapon).length;
  const hasShield = defs.some(d => d?.category === IC.Shield);
  const hasDrive = defs.some(d => d?.category === IC.Drive);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fpsRef.current || !physRef.current || !zoomRef.current) return;
    if (!hostilesRef.current || !hullRef.current || !pipsRef.current) return;
    if (!modeRef.current || !helmRef.current || !warnRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pipFills = [...pipsRef.current.children]
      .map(pip => pip.firstElementChild)
      .filter((el): el is HTMLElement => el instanceof HTMLElement);

    return main(ctx, {
      renderFps: fpsRef.current,
      physFrames: physRef.current,
      camZoom: zoomRef.current,
      hostiles: hostilesRef.current,
      hullFill: hullRef.current,
      shieldFill: shieldRef.current,
      jumpFill: jumpRef.current,
      jumpLabel: jumpLabelRef.current,
      pipFills,
      mode: modeRef.current,
      helm: helmRef.current,
      warn: warnRef.current,
    }, propsRef.current);
  }, []);

  return <div className="flex gap-4 items-start">
    <div className="relative flex justify-center items-center max-w-fit">
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
    </div>

    {/* Ship status margin — plain DOM, mutated by the frame loop */}
    <aside className="w-52 flex flex-col gap-3 font-mono text-xs pt-1">
      <p className="text-gray-500 uppercase tracking-widest text-[10px]">
        Hostiles: <span ref={hostilesRef} className="text-red-400">-</span>
      </p>

      <StatusBar label="Hull" color="#57c957" fillRef={hullRef} />
      {hasShield ? <StatusBar label="Shield" color="#59c8ff" fillRef={shieldRef} /> : null}
      {hasDrive ? <StatusBar label="Jump drive" color="#9d5ec9" fillRef={jumpRef} labelRef={jumpLabelRef} /> : null}

      {weaponCount > 0 ? <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Weapons</p>
        <div ref={pipsRef} className="flex gap-1">
          {Array.from({ length: weaponCount }, (_, i) => (
            <div key={i} className="w-3.5 h-3.5 bg-black/60 border border-gray-800 rounded-xs flex items-end overflow-hidden">
              <div className="w-full" style={{ height: "100%", backgroundColor: "#ffd75e" }} />
            </div>
          ))}
        </div>
      </div> : null}

      <div className="flex flex-col gap-1">
        <span ref={modeRef} />
        <span ref={helmRef} />
        <span ref={warnRef} className="text-orange-400" />
      </div>
    </aside>
  </div>;
}

export const STAGE_CONTROLS_HINT =
  "cockpit: WASD fly · mouse aim · LMB fire · T turret auto — bridge: LMB plot nav / click enemy to focus · RMB manual fire · C clear · SPACE tactical time — both: 1/2/3 power wpn/shd/eng · 4 spool jump · 0 balanced · scroll zoom"
  + (import.meta.env.DEV ? " · K kill-all (dev)" : "");
