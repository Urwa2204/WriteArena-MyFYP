import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/auth": { target: "http://localhost:8000", changeOrigin: true },
      "/users": { target: "http://localhost:8000", changeOrigin: true },
      "/rooms": { target: "http://localhost:8000", changeOrigin: true },
      "/feed": { target: "http://localhost:8000", changeOrigin: true },
      "/social": { target: "http://localhost:8000", changeOrigin: true },
      "/messages": { target: "http://localhost:8000", changeOrigin: true },
      "/notifications": { target: "http://localhost:8000", changeOrigin: true },
      "/analytics": { target: "http://localhost:8000", changeOrigin: true },
      "/tournaments": { target: "http://localhost:8000", changeOrigin: true },
      "/admin": { target: "http://localhost:8000", changeOrigin: true },
      "/health": { target: "http://localhost:8000", changeOrigin: true },
      "/ws": { target: "ws://localhost:8000", ws: true, changeOrigin: true },
    },
  },
});
