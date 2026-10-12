/**
 * Utilitas hash password.
 * Menggunakan bcryptjs (tanpa native binding) agar konsisten di semua
 * platform termasuk Windows.
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  if (typeof plainPassword !== "string" || plainPassword.length === 0) {
    throw new Error("Password tidak boleh kosong.");
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword, passwordHash) {
  if (typeof plainPassword !== "string" || !plainPassword) return false;
  if (typeof passwordHash !== "string" || !passwordHash) return false;
  try {
    return await bcrypt.compare(plainPassword, passwordHash);
  } catch {
    return false;
  }
}

export { SALT_ROUNDS };
