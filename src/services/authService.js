/**
 * Layanan autentikasi (dapat diuji tanpa runtime Next.js).
 *
 * Dipakai oleh dua pintu masuk yang berbeda:
 * - halaman pelanggan (/login)     -> expectedRole = CUSTOMER
 * - halaman admin (/admin/login)   -> expectedRole = ADMIN
 *
 * Role SELALU dibaca dari database, tidak pernah dari data yang dikirim
 * browser. `expectedRole` hanya menentukan halaman mana yang boleh dipakai.
 */

import { ROLES } from "@/lib/constants";
import { verifyPassword } from "@/lib/password";
import prisma from "@/lib/prisma";
import { sanitizeUser } from "@/lib/session";

/**
 * Hash bcrypt valid yang tidak cocok dengan password apa pun.
 * Dipakai agar proses verifikasi tetap berjalan (waktu respons seragam)
 * meskipun email tidak ditemukan.
 */
const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Ld0kAeGjL8y1zUZLZ4xg5NcKU4pO";

export const AUTH_FAILURE = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INACTIVE: "INACTIVE",
  WRONG_ROLE: "WRONG_ROLE",
};

/**
 * Memvalidasi kredensial login.
 * @returns {Promise<{ok: true, user: object} | {ok: false, reason: string, message: string, role?: string}>}
 */
export async function authenticateCredentials({
  email,
  password,
  expectedRole,
}) {
  const user = await prisma.user.findUnique({ where: { email } });

  const passwordMatches = await verifyPassword(
    password,
    user?.passwordHash || DUMMY_HASH,
  );

  if (!user || !passwordMatches) {
    return {
      ok: false,
      reason: AUTH_FAILURE.INVALID_CREDENTIALS,
      message: "Email atau password salah.",
    };
  }

  if (!user.isActive) {
    return {
      ok: false,
      reason: AUTH_FAILURE.INACTIVE,
      message:
        "Akun Anda sedang dinonaktifkan. Silakan hubungi admin laundry.",
    };
  }

  // Kredensial benar, tetapi mencoba masuk lewat pintu yang salah.
  // Catatan: informasi role hanya diberikan setelah password terbukti benar,
  // sehingga tidak membocorkan keberadaan akun kepada penebak.
  if (expectedRole && user.role !== expectedRole) {
    return {
      ok: false,
      reason: AUTH_FAILURE.WRONG_ROLE,
      role: user.role,
      message:
        user.role === ROLES.ADMIN
          ? "Akun ini adalah akun admin. Silakan masuk melalui halaman login admin."
          : "Akun ini bukan akun admin. Silakan masuk melalui halaman login pelanggan.",
    };
  }

  // passwordHash dibuang sebelum keluar dari fungsi ini agar tidak mungkin
  // ikut terkirim ke klien secara tidak sengaja.
  return { ok: true, user: sanitizeUser(user) };
}
