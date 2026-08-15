import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Runtime avatar and upload previews use blob/data URLs that bypass Next's optimizer.
    files: [
      "app/chat/page.tsx",
      "app/client-profile/edit/page.tsx",
      "app/complete-client-profile/page.tsx",
      "app/complete-profile/page.tsx",
      "app/profile/**/page.tsx",
      "app/profile/edit/page.tsx",
      "app/projects/**",
      "components/site-header.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "public/**",
    "next-env.d.ts",
    "packages/*/dist/**",
    // Standalone Node migration/seed scripts use CommonJS for direct execution.
    "scripts/**/*.js",
  ]),
]);

export default eslintConfig;
