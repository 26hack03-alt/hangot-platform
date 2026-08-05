import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Data loaders are async callbacks invoked by effects, not synchronous state loops.
      "react-hooks/set-state-in-effect": "off",
      // Session-sensitive navigation intentionally performs full document requests.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    ".vercel/**",
    ".output/**",
    ".nitro/**",
    "node_modules/**",
    "node_modules/.nitro/**",
    "build.log",
    "lint-errors.txt",
    "hangot-google-auth-deploy-package/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
