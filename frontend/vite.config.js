import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: env.VITE_HOST === "true" ? true : env.VITE_HOST || true,
      port: Number(env.VITE_PORT) || 5173,
      strictPort: true,
      //allowedHosts: "all",
      proxy: {
        "/api": env.VITE_API_PROXY || "http://localhost:3000",
      },
    },
  };
});
