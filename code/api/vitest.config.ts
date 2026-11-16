import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The database test files reset shared tables (admin users, sessions),
    // so run files one at a time instead of in parallel.
    fileParallelism: false,
    // Tests use process.env directly; these defaults make the suite
    // runnable without a .env file.
    env: {
      NODE_ENV: "test",
      PORT: "3002",
      LOG_LEVEL: "silent",
      DATABASE_URL:
        "postgres://myuser:mypassword@localhost:5432/nailsalon?sslmode=disable",
      SESSION_SECRET: "test-secret-at-least-32-characters-long-xxxxxx",
      CORS_ORIGIN: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
    },
  },
});