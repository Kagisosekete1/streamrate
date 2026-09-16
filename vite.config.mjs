import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080 },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      devOptions: { enabled: false },
      injectRegister: null,
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          { urlPattern: ({ request }) => request.mode === "navigate", handler: "NetworkFirst", options: { cacheName: "html", networkTimeoutSeconds: 3 } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i, handler: "CacheFirst", options: { cacheName: "google-fonts", expiration: { maxEntries: 30, maxAgeSeconds: 31536000 } } },
          { urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*$/i, handler: "NetworkOnly" },
          { urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|auth|functions)\/v1\/.*$/i, handler: "NetworkFirst", options: { cacheName: "supabase-api", expiration: { maxEntries: 50, maxAgeSeconds: 300 } } },
          { urlPattern: /^https:\/\/images\.unsplash\.com\/.*$/i, handler: "StaleWhileRevalidate", options: { cacheName: "unsplash-images", expiration: { maxEntries: 100, maxAgeSeconds: 2592000 } } },
        ],
      },
      includeAssets: ["favicon.ico", "logo.png", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "StreamRate", short_name: "StreamRate", description: "Rate, Review Your Favorite Streamers",
        id: "/", start_url: "/", scope: "/", display: "standalone", display_override: ["standalone"],
        background_color: "#ffffff", theme_color: "#ffffff", orientation: "portrait-primary",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/logo.png", sizes: "512x512", type: "image/png" },
        ],
        categories: ["social", "entertainment"], prefer_related_applications: false,
        share_target: { action: "/create-post", method: "GET", params: { text: "content" } },
      },
    }),
  ],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(rootDir, "./src") },
      { find: "react-dom", replacement: path.resolve(rootDir, "./node_modules/react-dom") },
      { find: "react", replacement: path.resolve(rootDir, "./node_modules/react") },
    ],
    dedupe: ["react", "react-dom", "react-router-dom", "react-router"],
  },
  optimizeDeps: {
    force: mode === "development",
    include: ["react-router-dom", "react-router", "@tanstack/react-query", "framer-motion", "lucide-react", "sonner", "react-image-crop", "react-day-picker"],
  },
}));
