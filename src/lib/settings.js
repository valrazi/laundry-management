/**
 * Akses pengaturan sistem yang dapat diubah admin (non-rahasia).
 * Token Fonnte TIDAK pernah disimpan di sini — hanya di environment variable.
 */

import prisma from "./prisma";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "./constants";

/** Mengambil seluruh pengaturan sebagai objek key-value. */
export async function getSettings() {
  const rows = await prisma.systemSetting.findMany();
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function getSetting(key) {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (row) return row.value;
  return DEFAULT_SETTINGS[key] ?? null;
}

/** Menyimpan beberapa pengaturan sekaligus dalam satu transaksi. */
export async function updateSettings(entries) {
  const operations = Object.entries(entries).map(([key, value]) =>
    prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: String(value ?? "") },
      update: { value: String(value ?? "") },
    }),
  );
  if (operations.length === 0) return;
  await prisma.$transaction(operations);
}

/** Apakah integrasi WhatsApp global sedang aktif. */
export async function isWhatsAppEnabled() {
  const value = await getSetting(SETTING_KEYS.WHATSAPP_ENABLED);
  return String(value).toLowerCase() === "true";
}

/** Informasi rekening untuk instruksi pembayaran. */
export async function getPaymentInfo() {
  const settings = await getSettings();
  return {
    bankName: settings[SETTING_KEYS.PAYMENT_BANK_NAME],
    accountNumber: settings[SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER],
    accountName: settings[SETTING_KEYS.PAYMENT_ACCOUNT_NAME],
    instructions: settings[SETTING_KEYS.PAYMENT_INSTRUCTIONS],
  };
}
