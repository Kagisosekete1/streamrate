import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyChromePwaRenderingGuards } from "@/lib/chromePwaRenderingGuard";
// @ts-ignore - virtual module from vite-plugin-pwa
import { registerSW } from "virtual:pwa-register";

applyChromePwaRenderingGuards();

// Register service worker for PWA, but immediately activate fresh builds so
// installed Chrome Android PWAs do not keep serving a stale bugged shell.
// Register the PWA service worker. We deliberately do NOT auto-call
// updateSW(true) on every new build — that caused the app to reload multiple
// times in a row on desktop/mobile PWAs. The <UpdateBanner /> surfaces a
// user-controlled refresh instead.
registerSW({
  immediate: true,
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
