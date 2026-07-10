import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyChromePwaRenderingGuards } from "@/lib/chromePwaRenderingGuard";
import { registerAppServiceWorker } from "@/lib/pwaRegistration";

applyChromePwaRenderingGuards();

registerAppServiceWorker();

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
