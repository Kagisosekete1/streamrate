import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Register service worker for PWA
registerSW({
  onNeedRefresh() {
    console.log("New content available, refreshing...");
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
