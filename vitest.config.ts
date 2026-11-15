import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Pin the timezone before workers spawn so date logic is deterministic.
process.env.TZ = "America/Sao_Paulo";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "forks",
    env: { TZ: "America/Sao_Paulo" },
  },
});
