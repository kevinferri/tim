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
      CRYPTO_ALGORITHM: "aes-192-cbc",
      CRYPTO_SECRET: "test-secret",
      CRYPTO_IV: "0123456789abcdef",
    },
    // Integration tests share one real Postgres instance and mutate the
    // same tables (see src/test/db.ts's resetDb) -- running files in
    // parallel would race. The suite is small enough that sequential
    // execution is still fast.
    fileParallelism: false,
  },
});
