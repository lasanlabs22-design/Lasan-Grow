import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // The owner connection bypasses row-level security. Customer-facing code must use
  // tenantDb(org.id); only sign-in, the platform console and the database layer may reach past it.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              importNames: ["getAdminDb"],
              message: "getAdminDb bypasses row-level security. Use tenantDb(org.id) for workspace data.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/(auth)/actions.js", "app/platform/**", "lib/platform.js", "lib/queries/platform.js", "lib/db/**"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
