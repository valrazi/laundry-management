/**
 * Aturan kode/nomor pesanan.
 *
 * Format: <PREFIX><YYMMDD><2 digit nomor urut harian>
 * Contoh: CS26010201 (Cuci Setrika, 2 Januari 2026, pesanan ke-1 hari itu).
 *
 * Prefix ditentukan dari layanan yang dipesan:
 * - CS = Cuci Setrika
 * - ST = Setrika
 * - EX = Express
 * - LD = layanan lain / tidak dikenali (fallback)
 *
 * Bila satu pesanan memuat beberapa layanan, prefix dengan prioritas tertinggi
 * yang dipakai: Express > Cuci Setrika > Setrika > LD.
 * Nomor urut dihitung terpisah untuk setiap prefix per hari (zona Asia/Jakarta).
 *
 * Modul ini hanya berisi fungsi murni (tanpa akses database) agar mudah diuji
 * dan dapat dipakai juga oleh skrip seed.
 */

import { JAKARTA_TIME_ZONE } from "./format.js";

export const ORDER_CODE_PREFIX = {
  CUCI_SETRIKA: "CS",
  SETRIKA: "ST",
  EXPRESS: "EX",
  DEFAULT: "LD",
};

/** Batas nomor urut harian karena formatnya 2 digit (01-99). */
export const MAX_DAILY_ORDER_SEQUENCE = 99;

/**
 * Urutan prioritas pencocokan prefix. Aturan pertama yang cocok menang,
 * sehingga "Cuci Setrika Express" menghasilkan EX, bukan CS.
 */
const PREFIX_RULES = [
  {
    prefix: ORDER_CODE_PREFIX.EXPRESS,
    matches: (name) => /express/i.test(name),
  },
  {
    prefix: ORDER_CODE_PREFIX.CUCI_SETRIKA,
    matches: (name) => /cuci/i.test(name) && /setrika/i.test(name),
  },
  {
    prefix: ORDER_CODE_PREFIX.SETRIKA,
    matches: (name) => /setrika/i.test(name),
  },
];

/** Tanggal (zona Asia/Jakarta) dalam format YYYYMMDD. */
export function jakartaDateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}`;
}

/** Tanggal (zona Asia/Jakarta) dalam format YYMMDD untuk nomor pesanan. */
export function jakartaDateStampShort(date = new Date()) {
  return jakartaDateStamp(date).slice(2);
}

/**
 * Menentukan prefix kode pesanan dari nama layanan yang dipesan.
 * @param {string[]|string} serviceNames
 */
export function resolveOrderCodePrefix(serviceNames = []) {
  const names = Array.isArray(serviceNames) ? serviceNames : [serviceNames];
  for (const rule of PREFIX_RULES) {
    if (names.some((name) => rule.matches(String(name || "")))) {
      return rule.prefix;
    }
  }
  return ORDER_CODE_PREFIX.DEFAULT;
}

/** Format nomor urut menjadi 2 digit (01-99). */
export function formatOrderSequence(sequence) {
  const value = Number(sequence);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Nomor urut pesanan harus bilangan bulat minimal 1.");
  }
  if (value > MAX_DAILY_ORDER_SEQUENCE) {
    throw new Error(
      `Kapasitas nomor pesanan harian sudah penuh (maksimal ${MAX_DAILY_ORDER_SEQUENCE}).`,
    );
  }
  return String(value).padStart(2, "0");
}

/** Awalan nomor pesanan tanpa nomor urut, mis. "CS260102". */
export function buildOrderNumberPrefix(prefix, date = new Date()) {
  return `${prefix}${jakartaDateStampShort(date)}`;
}

/** Membangun nomor pesanan lengkap, mis. "CS26010201". */
export function buildOrderNumber({ prefix, date = new Date(), sequence }) {
  return `${buildOrderNumberPrefix(prefix, date)}${formatOrderSequence(sequence)}`;
}

/**
 * Mengambil nomor urut dari sebuah nomor pesanan.
 * Mengembalikan null bila nomor tidak sesuai prefix/tanggal yang diminta.
 */
export function extractOrderSequence(orderNumber, prefix, date = new Date()) {
  const key = buildOrderNumberPrefix(prefix, date);
  if (typeof orderNumber !== "string" || !orderNumber.startsWith(key)) {
    return null;
  }
  const suffix = orderNumber.slice(key.length);
  if (!/^\d+$/.test(suffix)) return null;
  const sequence = Number.parseInt(suffix, 10);
  return Number.isInteger(sequence) && sequence > 0 ? sequence : null;
}
