/**
 * Nilai uang dan berat wajib dihitung memakai Decimal (bukan Float) agar
 * tidak terjadi galat pembulatan floating point.
 *
 * Modul kecil ini menstandarkan cara mengambil kelas `Prisma.Decimal`
 * sehingga tetap bekerja baik saat di-bundle Next.js maupun saat dijalankan
 * langsung oleh Node (misalnya pada skrip seed).
 */

import prismaClientPackage from "@prisma/client";

const { Prisma } = prismaClientPackage ?? {};

if (!Prisma || !Prisma.Decimal) {
  throw new Error(
    "Prisma.Decimal tidak tersedia. Jalankan `npx prisma generate` terlebih dahulu.",
  );
}

export const Decimal = Prisma.Decimal;

export default Decimal;
