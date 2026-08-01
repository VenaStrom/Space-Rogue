import { Route } from "./types";
import { WorkshopView, CombatView, ShipEditorView, MenuView, RunView } from "./views";
import { useMetaState } from "./context/meta-state";
import { RiFullscreenLine } from "@remixicon/react";

const NAV_ROUTES: { label: string; route: Route; dev?: boolean }[] = [
  { label: "Menu", route: Route.Menu },
  { label: "Run", route: Route.Run },
  { label: "Workshop", route: Route.Workshop, dev: true },
  { label: "Ship Editor", route: Route.ShipEditor, dev: true },
  { label: "Combat", route: Route.Combat, dev: true },
];

function App() {
  const {
    route,
    setRoute,
  } = useMetaState();

  return (<>
    <header>
      <h2>
        Space Rogue
      </h2>

      <nav className="flex gap-1 items-center">
        {NAV_ROUTES.map(({ label, route: r, dev }, i) => (<span key={r} className="flex items-center">
          {dev === true && NAV_ROUTES[i - 1]?.dev !== true
            ? <span className="mx-2 text-xs text-gray-700 uppercase tracking-widest select-none">dev</span>
            : null}
          <button
            type="button"
            onClick={() => setRoute(r)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              route === r
                ? "bg-gray-700 text-white"
                : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800"
            } ${dev === true ? "opacity-70" : ""}`}
          >
            {label}
          </button>
        </span>))}
      </nav>

      {/* Fullscreen button */}
      <button
        type="button"
        onClick={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch((e: unknown) => {
              console.error("Failed to exit fullscreen:", e);
            });
          } else {
            document.documentElement.requestFullscreen()
              .catch((e: unknown) => {
                console.error("Failed to enter fullscreen:", e);
              });
          }
        }}
        className="bg-transparent p-0"
      >
        <RiFullscreenLine size={36} />
      </button>
    </header>

    {/* Router */}
    {(() => {
      switch (route) {
        case Route.Menu:
          return <MenuView />;

        case Route.Run:
          return <RunView />;

        case Route.Workshop:
          return <WorkshopView />;

        case Route.ShipEditor:
          return <ShipEditorView />;

        case Route.Combat:
          return <CombatView />;

        default:
          return <div>Not found</div>;
      }
    })()}

    <footer className="flex justify-between">
      <span>© 2026 Vena Ström</span>
      <span>
        Icons by <a href="https://remixicon.com" target="_blank" rel="noreferrer">Remix Icon</a> and{" "}
        <a href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a> (CC BY 3.0)
      </span>
      <span>Built {__BUILD_DATE__} · {__GIT_HASH__}</span>
    </footer>
  </>);
}

export default App;
