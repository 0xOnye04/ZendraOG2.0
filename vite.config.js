import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const SHIM_PATHS = {
  child_process: fileURLToPath(new URL("./src/shims/child-process.js", import.meta.url)),
  fs: fileURLToPath(new URL("./src/shims/fs.js", import.meta.url)),
  "fs/promises": fileURLToPath(new URL("./src/shims/fs-promises.js", import.meta.url)),
  "node:fs/promises": fileURLToPath(new URL("./src/shims/fs-promises.js", import.meta.url)),
  "stream/promises": fileURLToPath(new URL("./src/shims/stream-promises.js", import.meta.url)),
  "node:stream/promises": fileURLToPath(new URL("./src/shims/stream-promises.js", import.meta.url)),
  "stream-browserify/promises": fileURLToPath(new URL("./src/shims/stream-promises.js", import.meta.url)),
  readline: fileURLToPath(new URL("./src/shims/readline.js", import.meta.url)),
  path: fileURLToPath(new URL("./src/shims/path.js", import.meta.url)),
  vm: fileURLToPath(new URL("./src/shims/vm.js", import.meta.url)),
};

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        aiTrader: fileURLToPath(new URL("./ai-trader.html", import.meta.url)),
      },
    },
  },
  optimizeDeps: {
    exclude: ["@0gfoundation/0g-compute-ts-sdk"],
  },
  resolve: {
    alias: [
      { find: /^fs\/promises$/, replacement: SHIM_PATHS["fs/promises"] },
      { find: /^node:fs\/promises$/, replacement: SHIM_PATHS["node:fs/promises"] },
      { find: /^stream\/promises$/, replacement: SHIM_PATHS["stream/promises"] },
      { find: /^node:stream\/promises$/, replacement: SHIM_PATHS["node:stream/promises"] },
      { find: /^stream-browserify\/promises$/, replacement: SHIM_PATHS["stream-browserify/promises"] },
      { find: /^readline$/, replacement: SHIM_PATHS.readline },
      { find: /^child_process$/, replacement: SHIM_PATHS.child_process },
      { find: /^fs$/, replacement: SHIM_PATHS.fs },
      { find: /^path$/, replacement: SHIM_PATHS.path },
      { find: /^vm$/, replacement: SHIM_PATHS.vm },
    ],
  },
  server: {
    proxy: {
      "/api/coingecko": {
        target: "https://api.coingecko.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, "/api/v3"),
      },
      "/api/coingecko-pro": {
        target: "https://pro-api.coingecko.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko-pro/, "/api/v3"),
      },
    },
  },
  plugins: [
    nodePolyfills({
      include: ["crypto", "stream", "util", "buffer", "process", "events"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
});
