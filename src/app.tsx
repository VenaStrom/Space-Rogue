import { Route } from "./types";
import { WorkshopView, CombatView } from "./views";
import { useMetaState } from "./context/meta-state";

function App() {
  const {
    route,
  } = useMetaState();

  return (<>
    <header>
      Space Rogue
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
