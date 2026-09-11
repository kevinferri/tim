import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globalSetup: "./vitest.global-setup.ts",
    env: {
      CRYPTO_KEY: "jom047BDiEp9APuTMuwRog5o3bCDMuDPNEJzP1mykz0=",
    },
    // Integration tests share one real Postgres instance and mutate the
    // same tables (see src/test/db.ts's resetDb) -- running files in
    // parallel would race. The suite is small enough that sequential
    // execution is still fast.
    fileParallelism: false,
  },
});
