import { Route, RunScreen } from "../types";
import { useMetaState } from "../context/meta-state";
import { useRunState } from "../context/run-state";

const SCREEN_LABEL: Record<RunScreen, string> = {
  map: "Map",
  refit: "Refit",
  arena: "Arena",
};

export function RunView() {
  const { setRoute } = useMetaState();
  const { phase, run, setScreen, die, backToMenu } = useRunState();

  if (phase === "dead" && run !== null) {
    return <main className="p-6 flex flex-col items-center gap-6 pt-24">
      <h2 className="text-2xl font-semibold tracking-widest uppercase text-red-400">Ship destroyed</h2>
      <p className="text-sm text-gray-400">
        Made it to sector {run.sector} with {run.credits} cr aboard.
      </p>
      <button type="button"
        className="px-4 py-3 rounded border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 transition-colors"
        onClick={() => {
          backToMenu();
          setRoute(Route.Menu);
        }}
      >
        Back to menu
      </button>
    </main>;
  }

  if (phase !== "active" || run === null) {
    return <main className="p-6 flex flex-col items-center gap-6 pt-24">
      <p className="text-sm text-gray-500">No active run.</p>
      <button type="button"
        className="px-4 py-3 rounded border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 transition-colors"
        onClick={() => setRoute(Route.Menu)}
      >
        Back to menu
      </button>
    </main>;
  }

  return <main className="p-6 flex flex-col gap-4">
    {/* Run header */}
    <div className="flex items-center gap-6 text-sm">
      <span className="uppercase tracking-widest text-gray-500">Sector {run.sector}</span>
      <span className="text-yellow-400">{run.credits} cr</span>
      <span className="text-blue-300">{run.visas} visas</span>
      <span className="text-gray-600">cargo {run.cargo.length}</span>
      <span className="ml-auto text-xs text-gray-700 font-mono">seed {run.seed}</span>
    </div>

    {/* Screen tabs */}
    <div className="flex rounded overflow-hidden border border-gray-700 w-fit">
      {Object.values(RunScreen).map((screen) => (
        <button type="button"
          key={screen}
          className={`px-4 py-1.5 text-sm transition-colors ${run.screen === screen
            ? "bg-gray-700 text-white"
            : "bg-gray-900 text-gray-400 hover:bg-gray-800"
            }`}
          onClick={() => setScreen(screen)}
        >
          {SCREEN_LABEL[screen]}
        </button>
      ))}
    </div>

    {/* Screen body — placeholders until later phases land */}
    <section className="border border-gray-800 rounded-xl bg-gray-950 p-8 min-h-64 flex flex-col items-center justify-center gap-3 text-center">
      {run.screen === RunScreen.Map ? <>
        <p className="text-gray-400">Sector map</p>
        <p className="text-xs text-gray-600 max-w-sm">Node graph, jumps, and visas land in a later phase.</p>
      </> : null}
      {run.screen === RunScreen.Refit ? <>
        <p className="text-gray-400">Refit</p>
        <p className="text-xs text-gray-600 max-w-sm">The workshop moves in here once it reads run state.</p>
      </> : null}
      {run.screen === RunScreen.Arena ? <>
        <p className="text-gray-400">Arena</p>
        <p className="text-xs text-gray-600 max-w-sm">Combat encounters land in a later phase.</p>
        <button type="button"
          className="mt-2 px-3 py-1.5 text-xs rounded border border-red-900 bg-gray-950 text-red-400 hover:bg-red-950 transition-colors"
          onClick={die}
        >
          Self-destruct (dev)
        </button>
      </> : null}
    </section>
  </main>;
}
