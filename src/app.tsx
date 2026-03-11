import { useState } from "react";
import { Route } from "./types";

function App() {
  const [route, setRoute] = useState<Route>(Route.home);

  return (<>
    <header>
      Space Rogue
    </header>

    {(() => {
      switch (route) {
        case Route.home:
          return <div>Home</div>;
        default:
          return <div>Not found</div>;
      }
    })()}

    <footer>
      Footer
    </footer>
  </>);
}

export default App
