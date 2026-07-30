import { Route } from "./types";
import { WorkshopView, CombatView, ShipEditorView } from "./views";
import { useMetaState } from "./context/meta-state";
import { RiFullscreenLine } from "@remixicon/react";

const NAV_ROUTES: { label: string; route: Route }[] = [
  { label: "Workshop", route: Route.Workshop },
  { label: "Ship Editor", route: Route.ShipEditor },
  { label: "Combat", route: Route.Combat },
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

      <nav className="flex gap-1">
        {NAV_ROUTES.map(({ label, route: r }) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoute(r)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              route === r
                ? "bg-gray-700 text-white"
                : "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
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
