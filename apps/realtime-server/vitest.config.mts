import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./vitest.global-setup.mts",
    env: {
      CRYPTO_ALGORITHM: "aes-192-cbc",
      CRYPTO_SECRET: "test-secret",
      CRYPTO_IV: "0123456789abcdef",
      JWT_SECRET: "test-jwt-secret",
    },
    // Integration tests share the real Postgres instance apps/chat's suite
    // also uses and mutate the same tables (see src/test/db.ts's
    // resetDb) -- running files in parallel would race.
    fileParallelism: false,
  },
});
