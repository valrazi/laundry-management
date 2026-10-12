/**
 * Utilitas format tampilan & normalisasi nilai.
 * Zona waktu seluruh tampilan diseragamkan ke Asia/Jakarta.
 */

export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: JAKARTA_TIME_ZONE,
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: JAKARTA_TIME_ZONE,
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: JAKARTA_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("id-ID");

const weightFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format nilai uang sesuai standar Indonesia, contoh: "Rp 25.000,00". */
export function formatCurrency(value) {
  const number = toNumber(value);
  if (number === null) return currencyFormatter.format(0);
  return currencyFormatter.format(number);
}

/** Format angka desimal (mis. berat) tanpa simbol mata uang. */
export function formatNumber(value) {
  const number = toNumber(value);
  if (number === null) return "0";
  return numberFormatter.format(number);
}

/** Format berat aktual, contoh: "3,5 kg". */
export function formatWeight(value) {
  const number = toNumber(value);
  if (number === null) return "-";
  return `${weightFormatter.format(number)} kg`;
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return "-";
  return `${dateTimeFormatter.format(date)} WIB`;
}

export function formatDate(value) {
  const date = toDate(value);
  if (!date) return "-";
  return dateFormatter.format(date);
}

/** Format tanggal ringkas untuk input/CSV, contoh: "12/10/2026". */
export function formatShortDate(value) {
  const date = toDate(value);
  if (!date) return "-";
  return shortDateFormatter.format(date);
}

/** Format tanggal untuk nilai `yyyy-MM-dd` (dipakai input type="date"). */
export function toDateInputValue(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ------------------------------------------------------------------
// Normalisasi nomor WhatsApp (Indonesia)
// ------------------------------------------------------------------

/**
 * Menormalkan nomor telepon ke format internasional tanpa tanda "+".
 * Contoh: "0812-3456-7890" -> "62812345678 90" (tanpa spasi).
 *
 * Aturan:
 * - Nomor lokal yang diawali "0" -> diganti prefix "62".
 * - Nomor yang diawali "8" -> ditambahkan prefix "62".
 * - Nomor yang sudah diawali "62" -> dibiarkan (tidak digandakan).
 * - Nomor internasional lain (mis. "1...") -> dibiarkan apa adanya.
 */
export function normalizePhone(raw) {
  if (typeof raw !== "string") return "";
  let digits = raw.trim().replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  digits = digits.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

/** Cek apakah nomor telepon valid setelah dinormalisasi. */
export function isValidPhone(raw) {
  const normalized = normalizePhone(raw);
  return /^[1-9]\d{6,14}$/.test(normalized);
}

/** Menyamarkan nomor telepon untuk tampilan log, contoh: "62812****890". */
export function maskPhone(raw) {
  const normalized = normalizePhone(raw);
  if (normalized.length <= 6) return normalized;
  return `${normalized.slice(0, 5)}****${normalized.slice(-3)}`;
}

/** Membuat inisial nama untuk avatar sederhana. */
export function initialsOf(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}
