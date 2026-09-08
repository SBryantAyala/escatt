import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Redirige /api al backend Express para no lidiar con CORS en desarrollo.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
