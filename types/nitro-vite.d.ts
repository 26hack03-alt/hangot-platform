declare module "nitro/vite" {
  import type { Plugin } from "vite";
  export function nitro(options?: Record<string, unknown>): Plugin;
}
