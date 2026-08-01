import "./global.tw.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app.tsx";
import { GameStateProvider, MetaStateProvider, RunStateProvider } from "./context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MetaStateProvider>
      <RunStateProvider>
        <GameStateProvider>
          <App />
        </GameStateProvider>
      </RunStateProvider>
    </MetaStateProvider>
  </StrictMode>,
);