import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["../backend/**/*.js", "../frontend/src/**/*.{js,jsx}"],
      exclude: ["../frontend/src/main.jsx"]
    }
  }
});
