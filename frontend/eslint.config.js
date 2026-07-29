const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const typescriptPlugin = expoConfig.find((config) => config.plugins?.["@typescript-eslint"])?.plugins?.["@typescript-eslint"];
const reactHooksPlugin = expoConfig.find((config) => config.plugins?.["react-hooks"])?.plugins?.["react-hooks"];

module.exports = defineConfig([
  {
    ignores: [".expo/**", ".git.backup-*/**", "android/**", "dist*/**", "node_modules/**"],
  },
  expoConfig,
  {
    plugins: {
      "@typescript-eslint": typescriptPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);
