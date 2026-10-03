import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["tests/**/*.test.ts"], env: { CREATORAI_JOBS_FILE: "memory", CREATORAI_B7_FILE: "memory", CREATORAI_DB_FILE: "memory", NODE_ENV: "test" } },
});
