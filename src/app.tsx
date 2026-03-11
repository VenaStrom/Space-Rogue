import { useState } from "react";
import { Route } from "./types";
import WorkshopView from "./views/workshop";

function App() {
  const [route, setRoute] = useState<Route>(Route.home);

  return (<>
    <header>
      Space Rogue
    </header>

    {(() => {
      switch (route) {
        case Route.home:
          return <WorkshopView />;
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
