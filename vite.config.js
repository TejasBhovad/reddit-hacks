import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "game", // Point to your app directory
  build: {
    outDir: "../webroot", // Specify your desired output directory
    emptyOutDir: true, // Clean the output directory before each build
    copyPublicDir: true, // Copies over assets
    sourcemap: true, // Enable sourcemaps
  },
});
