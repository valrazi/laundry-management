/**
 * Konfigurasi environment untuk seluruh pengujian.
 *
 * Pengujian integrasi memakai database MySQL TERPISAH (TEST_DATABASE_URL)
 * sehingga data development tidak pernah tersentuh.
 *
 * Pengujian TIDAK memerlukan token WhatsApp asli: FONNTE_DRY_RUN dipaksa
 * aktif, dan kegagalan provider disimulasikan dengan fetch tiruan.
 */

try {
  process.loadEnvFile(".env");
} catch {
  // .env tidak ditemukan — andalkan variabel lingkungan yang ada.
}

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

process.env.FONNTE_DRY_RUN = "true";
process.env.FONNTE_TOKEN = "";
process.env.APP_URL = process.env.APP_URL || "http://localhost:3000";
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
process.env.MAX_UPLOAD_SIZE_MB = process.env.MAX_UPLOAD_SIZE_MB || "5";
