import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // The JSON-LD serialiser is a component, so the suite has to be able to
  // render one. Next.js compiles JSX with the automatic runtime; without
  // this, esbuild falls back to the classic transform and looks for a React
  // global that nothing imports.
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
