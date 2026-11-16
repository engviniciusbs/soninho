import { defineConfig } from "vitest/config";

// Pin the timezone before workers spawn so date logic is deterministic.
process.env.TZ = "America/Sao_Paulo";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Skip loading postcss.config.mjs (tailwind) - irrelevant to node tests.
  css: { postcss: {} },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    pool: "forks",
    env: { TZ: "America/Sao_Paulo" },
  },
});
