import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/embed.jsx",
      name: "GeoOnlineReact",
      formats: ["iife"],
      fileName: () => "geo-react.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "geo-react[extname]",
      },
    },
    outDir: "../assets",
    emptyOutDir: false,
  },
});
