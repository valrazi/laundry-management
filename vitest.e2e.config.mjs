import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Konfigurasi uji end-to-end MANUAL.
 *
 * Berbeda dengan `vitest.config.mjs` (yang memakai database uji terpisah dan
 * memaksa dry-run), konfigurasi ini sengaja memakai:
 *   - database development (.env -> DATABASE_URL)
 *   - kredensial Fonnte asli (.env -> FONNTE_TOKEN)
 *
 * Jalankan hanya saat ingin memverifikasi pengiriman WhatsApp sungguhan:
 *   npx vitest run --config vitest.e2e.config.mjs
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests-e2e/**/*.test.js"],
    setupFiles: ["tests-e2e/setup-e2e.js"],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
});
