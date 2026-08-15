import vinext from "vinext";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(({ command }) => ({
  server: {
    ...(isCodexSeatbeltSandbox
      ? {
          watch: {
            useFsEvents: false,
            usePolling: true,
          },
        }
      : {}),
    hmr: {
      overlay: false,
    },
  },

  plugins: [
    vinext(),
    ...(command === "build" ? [nitro()] : []),
  ],
}));