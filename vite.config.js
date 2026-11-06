import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Electron loads the built renderer from file://, so assets must be relative.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
