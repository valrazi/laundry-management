/**
 * Autentikasi & otorisasi: lapisan yang bergantung pada runtime Next.js
 * (cookie, redirect). Logika penyimpanan session ada di `session.js`.
 *
 * Semua fungsi di modul ini hanya boleh dipanggil dari server (Server
 * Component, Server Action, atau Route Handler).
 */

import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

import { ROLES } from "./constants";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  createSessionRecord,
  deleteSessionByToken,
  getUserBySessionToken,
  hashSessionToken,
  sanitizeUser,
} from "./session";

export {
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS,
  createSessionRecord,
  getUserBySessionToken,
  sanitizeUser,
};

/** Membuat session dan menyimpan token pada cookie HttpOnly. */
export async function createSession(userId) {
  const session = await createSessionRecord(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
  return session;
}

/** Menghapus session aktif (logout). */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await deleteSessionByToken(token);
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Hash token session yang sedang aktif (atau null). */
export async function getCurrentSessionId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return hashSessionToken(token);
}

/**
 * Mengambil user yang sedang login dari cookie.
 * Di-memoize per request agar tidak query berulang.
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getUserBySessionToken(token);
});

/** Rute beranda sesuai role. */
export function homePathForRole(role) {
  return role === ROLES.ADMIN ? "/admin/dashboard" : "/customer/dashboard";
}

// ------------------------------------------------------------------
// Penjaga akses untuk komponen/halaman (melakukan redirect)
// ------------------------------------------------------------------

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  // Belum login di area admin -> arahkan ke pintu masuk khusus admin.
  if (!user) redirect("/admin/login");
  if (user.role !== ROLES.ADMIN) redirect("/customer/dashboard");
  return user;
}

export async function requireCustomer() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== ROLES.CUSTOMER) redirect("/admin/dashboard");
  return user;
}

// ------------------------------------------------------------------
// Penjaga akses untuk Server Action / Route Handler (tanpa redirect)
// ------------------------------------------------------------------

/** Mengembalikan user admin atau null. */
export async function getAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== ROLES.ADMIN) return null;
  return user;
}

/** Mengembalikan user pelanggan atau null. */
export async function getCustomerUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== ROLES.CUSTOMER) return null;
  return user;
}
