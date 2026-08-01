import { CombatStage, STAGE_CONTROLS_HINT, type StageEnemy } from "./combat-stage";
import { useGameState } from "../context/game-state";
import { resolveItems } from "../items";
import { CH_SLP } from "../ships";
import { PLAYER_SPAWN } from "../rendering/combat";

/** Dev-sandbox encounter: three raiders on the player's own hull. */
const RAIDER_EQUIPPED_IDS = [
  "basic-weapon", "basic-weapon", null, null, null, null,
  "basic-thruster", "basic-thruster", "basic-thruster", "basic-thruster",
  "basic-shield", null, null, null, null, null, "static-reactor",
];

const SANDBOX_ENEMIES: StageEnemy[] = [
  { x: PLAYER_SPAWN.x + 1500, y: PLAYER_SPAWN.y - 600 },
  { x: PLAYER_SPAWN.x + 1800, y: PLAYER_SPAWN.y + 300 },
  { x: PLAYER_SPAWN.x + 1300, y: PLAYER_SPAWN.y + 900 },
].map(pos => ({ hull: CH_SLP, equipped: resolveItems(RAIDER_EQUIPPED_IDS), pos }));

export function CombatView() {
  const { hull, equipped } = useGameState();

  return <main>
    <h2>Combat</h2>
    <CombatStage
      hull={hull}
      equipped={resolveItems(equipped)}
      enemies={SANDBOX_ENEMIES}
      allowRestart={true}
    />
    <p className="mt-2 text-xs text-gray-600 font-mono">
      {STAGE_CONTROLS_HINT} · R restart
    </p>
  </main>;
}
