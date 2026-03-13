import { Route } from "./types";
import { WorkshopView, CombatView, ShipEditorView } from "./views";
import { useMetaState } from "./context/meta-state";
import { FullscreenIcon } from "lucide-react";

const NAV_ROUTES: { label: string; route: Route }[] = [
  { label: "Workshop", route: Route.workshop },
  { label: "Ship Editor", route: Route.shipEditor },
  { label: "Combat", route: Route.combat },
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
        onClick={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch((e) => {
              console.error("Failed to exit fullscreen:", e);
            });
          } else {
            document.documentElement.requestFullscreen()
              .catch((e) => {
                console.error("Failed to enter fullscreen:", e);
              });
          }
        }}
        className="bg-transparent p-0"
      >
        <FullscreenIcon size={36} />
      </button>
    </header>

    {/* Router */}
    {(() => {
      switch (route) {
        case Route.workshop:
          return <WorkshopView />;

        case Route.shipEditor:
          return <ShipEditorView />;

        case Route.combat:
          return <CombatView />;

        default:
          return <div>Not found</div>;
      }
    })()}

    <footer>
      © 2026 Vena Ström
    </footer>
  </>);
}

export default App
