import { builtinModules } from "node:module";
import { defineConfig } from "rolldown/config";

const external = [
  "vscode",
  ...new Set([
    ...builtinModules,
    ...builtinModules.map((moduleId) => `node:${moduleId}`),
  ]),
];

export default defineConfig({
  input: "src/extension.ts",
  platform: "node",
  output: {
    cleanDir: true,
    codeSplitting: false,
    dir: "out",
    entryFileNames: "extension.js",
    format: "cjs",
    sourcemap: true,
  },
  external,
});
