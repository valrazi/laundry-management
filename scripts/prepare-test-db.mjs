/**
 * Menyiapkan database pengujian (laundry_db_test).
 *
 * Prasyarat sekali saja: database `laundry_db_test` harus sudah dibuat.
 * Lihat README bagian "Menjalankan Pengujian".
 *
 * Skrip ini menjalankan `prisma migrate deploy` terhadap TEST_DATABASE_URL
 * sehingga skema pada database uji selalu sama dengan skema aplikasi.
 */

import { spawnSync } from "node:child_process";

try {
  process.loadEnvFile(".env");
} catch {
  // .env tidak ada — gunakan variabel lingkungan yang sudah tersedia.
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.error(
    "TEST_DATABASE_URL belum diatur. Salin .env.example menjadi .env dan isi nilainya.",
  );
  process.exit(1);
}

console.log("Menyiapkan skema database pengujian...");

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  shell: true,
});

process.exit(result.status ?? 1);
