import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
// Turns off the stylistic rules Prettier owns.
import prettier from "eslint-config-prettier/flat";

/**
 * eslint-config-next v16 ships native flat configs on its subpath exports, so
 * these are spread directly rather than routed through `FlatCompat`.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: [".next/**", "coverage/**", "node_modules/**", "next-env.d.ts", "public/**"],
  },
];

export default eslintConfig;
