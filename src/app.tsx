import { Route } from "./types";
import { WorkshopView, CombatView } from "./views";
import { useMetaState } from "./context/meta-state";
import { FullscreenIcon } from "lucide-react";

function App() {
  const {
    route,
  } = useMetaState();

  return (<>
    <header>
      <h2>
        Space Rogue
      </h2>

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
