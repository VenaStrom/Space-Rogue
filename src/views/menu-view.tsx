import { Route } from "../types";
import { useMetaState } from "../context/meta-state";
import { useRunState } from "../context/run-state";

export function MenuView() {
  const { setRoute } = useMetaState();
  const { phase, run, startRun, abandonRun } = useRunState();

  const hasRun = phase === "active" && run !== null;

  return <main className="p-6 flex flex-col items-center gap-6 pt-24">
    <h2 className="text-2xl font-semibold tracking-widest uppercase">Space Rogue</h2>

    <div className="flex flex-col gap-3 w-64">
      {hasRun ? <>
        <button type="button"
          className="px-4 py-3 rounded border border-green-700 bg-green-950 text-green-300 hover:bg-green-900 transition-colors"
          onClick={() => setRoute(Route.Run)}
        >
          Continue run
          <span className="block text-xs text-green-600">
            Sector {run.sector} · {run.credits} cr · {run.visas} visas
          </span>
        </button>
        <button type="button"
          className="px-4 py-3 rounded border border-red-900 bg-gray-950 text-red-400 hover:bg-red-950 transition-colors"
          onClick={() => {
            if (window.confirm("Abandon the current run? The save is deleted.")) {
              abandonRun();
            }
          }}
        >
          Abandon run
        </button>
      </> : (
        <button type="button"
          className="px-4 py-3 rounded border border-green-700 bg-green-950 text-green-300 hover:bg-green-900 transition-colors"
          onClick={() => {
            startRun();
            setRoute(Route.Run);
          }}
        >
          New run
        </button>
      )}
    </div>

    <p className="text-xs text-gray-600 max-w-sm text-center">
      Runs auto-save on every change — close the tab whenever, continue later.
    </p>
  </main>;
}
