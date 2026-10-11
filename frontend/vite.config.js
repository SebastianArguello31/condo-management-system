import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

function getPort(value, defaultValue, name) {
  const text = String(value ?? defaultValue).trim();
  const port = Number(text);

  if (
    !/^\d+$/.test(text) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(`${name} debe ser un entero entre 1 y 65535`);
  }

  return port;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, ["BACKEND_", "FRONTEND_"]);

  const backendPort = getPort(env.BACKEND_PORT, 5000, "BACKEND_PORT");
  const frontendPort = getPort(env.FRONTEND_PORT, 4000, "FRONTEND_PORT");

  if (backendPort === frontendPort) {
    throw new Error(
      "Los puertos del backend y frontend deben ser diferentes"
    );
  }

  return {
    plugins: [react()],
    envDir: projectRoot,

    server: {
      host: "127.0.0.1",
      port: frontendPort,
      strictPort: true,
      proxy: {
        "/condominio": {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
      },
    },

    preview: {
      host: "127.0.0.1",
      port: frontendPort,
      strictPort: true,
    },
  };
});