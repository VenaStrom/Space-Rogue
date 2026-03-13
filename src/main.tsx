import "./global.tw.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app.tsx";
import { GameStateProvider, MetaStateProvider } from "./context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MetaStateProvider>
      <GameStateProvider>
        <App />
      </GameStateProvider>
    </MetaStateProvider>
  </StrictMode>,
);