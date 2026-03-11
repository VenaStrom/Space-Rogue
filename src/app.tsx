import { useState } from "react";
import { Route } from "./types";
import { WorkshopView, CombatView } from "./views";

function App() {
  const [route, setRoute] = useState<Route>(Route.workshop);

  return (<>
    <header>
      Space Rogue
    </header>

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
