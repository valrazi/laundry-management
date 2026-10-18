/**
 * Membuat data awal HANYA bila database belum punya pengguna.
 *
 * Dipakai oleh 2-MIGRATE.bat dan 4-UPDATE.bat agar aman dijalankan berulang:
 * seed admin selalu mengatur ulang password admin ke nilai di .env, sehingga
 * tidak boleh dijalankan setiap kali ada update.
 */
import { spawn } from "node:child_process";

try {
  process.loadEnvFile(".env");
} catch {
  console.error("File .env tidak ditemukan.");
  process.exit(1);
}

const { default: prisma } = await import("../src/lib/prisma.js");

let userCount = 0;
try {
  userCount = await prisma.user.count();
} catch (error) {
  console.error("Tidak bisa membaca database:", error?.message || error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
}
await prisma.$disconnect().catch(() => {});

if (userCount > 0) {
  console.log("Data awal sudah ada, seed dilewati.");
  process.exit(0);
}

console.log("Database masih kosong. Membuat data awal...");
const child = spawn(process.execPath, ["prisma/seed.js"], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
