import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-tfhe-wasm-for-optimized-deps",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const requestPath = (req.url ?? "").split("?")[0];
          if (requestPath !== "/node_modules/.vite/deps/tfhe_bg.wasm") {
            next();
            return;
          }

          try {
            const wasmPath = resolve(process.cwd(), "node_modules", "tfhe", "tfhe_bg.wasm");
            const buffer = await readFile(wasmPath);
            res.setHeader("Content-Type", "application/wasm");
            res.statusCode = 200;
            res.end(buffer);
          } catch {
            next();
          }
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ["tfhe"],
  },
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
