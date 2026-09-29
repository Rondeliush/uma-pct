import { defineConfig } from "vite"

import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  base: "/uma-pct/",

  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "prompt",

      manifest: {
        name: "UmaPCT",
        short_name: "UmaPCT",
        orientation: "portrait",

        description:
          "Umamusume Performance & Competition Tracker",

        theme_color: "#020617",
        background_color: "#020617",

        display: "standalone",

        start_url: "/uma-pct/",
        scope: "/uma-pct/",

        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
})