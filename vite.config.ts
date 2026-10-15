import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { Buffer } from "buffer";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ["buffer"],
      globals: { Buffer: true, global: true, process: false },
    }),
    tailwindcss(),
    tanstackStart({
      server: {
        entry: "./server.ts",
      },
    }),
    viteReact(),
    tsconfigPaths(),
  ],
});
