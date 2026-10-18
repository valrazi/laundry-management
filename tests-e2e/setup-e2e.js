/**
 * Environment untuk uji end-to-end manual.
 *
 * Memuat .env apa adanya (TIDAK memaksa dry-run, TIDAK mengganti database).
 * Nilai FONNTE_DRY_RUN / DATABASE_URL sepenuhnya ditentukan oleh .env.
 */

try {
  process.loadEnvFile(".env");
} catch {
  // .env tidak ditemukan — andalkan variabel lingkungan yang ada.
}
