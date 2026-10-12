/**
 * Penyimpanan session di database (tanpa ketergantungan pada Next.js).
 *
 * Desain:
 * - Token session adalah nilai acak 256-bit yang dikirim ke browser melalui
 *   cookie HttpOnly.
 * - Database hanya menyimpan HASH SHA-256 dari token tersebut, sehingga isi
 *   database tidak dapat dipakai langsung untuk membajak session.
 * - Validasi session selalu membaca database (bukan hanya mempercayai cookie).
 *
 * Modul ini sengaja dipisahkan dari `auth.js` agar dapat diuji tanpa
 * menjalankan runtime request Next.js.
 */

import { createHash, randomBytes } from "node:crypto";

import prisma from "./prisma.js";

export const SESSION_COOKIE_NAME = "laundry_session";
export const SESSION_TTL_DAYS = 30;

/** Hash token session sebelum disimpan/dicari di database. */
export function hashSessionToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

/** Menghapus properti sensitif sebelum data user dipakai komponen/klien. */
export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

/** Membuat baris session baru dan mengembalikan token mentahnya. */
export async function createSessionRecord(userId, { token } = {}) {
  const rawToken = token || randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  // Bersihkan session kedaluwarsa milik user ini agar tabel tidak menumpuk.
  await prisma.session.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

  await prisma.session.create({
    data: { id: hashSessionToken(rawToken), userId, expiresAt },
  });

  return { token: rawToken, expiresAt };
}

/**
 * Memvalidasi token session terhadap database.
 * Mengembalikan data user (tanpa passwordHash) atau null.
 */
export async function getUserBySessionToken(token) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    return null;
  }

  if (!session.user || !session.user.isActive) return null;

  return sanitizeUser(session.user);
}

/** Menghapus satu session berdasarkan token mentah. */
export async function deleteSessionByToken(token) {
  if (!token) return;
  await prisma.session
    .deleteMany({ where: { id: hashSessionToken(token) } })
    .catch(() => undefined);
}
