import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client tunggal (singleton).
 * Pada mode development, Next.js melakukan hot reload sehingga modul dapat
 * dievaluasi ulang; simpan instance pada `globalThis` untuk menghindari
 * pembuatan koneksi baru setiap kali reload.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__laundryPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__laundryPrisma = prisma;
}

export default prisma;
