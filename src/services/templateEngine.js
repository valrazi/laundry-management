/**
 * Mesin rendering template notifikasi.
 *
 * Template TIDAK pernah dievaluasi sebagai JavaScript (tanpa eval /
 * Function constructor). Hanya variabel yang terdaftar pada
 * TEMPLATE_VARIABLES yang diganti dengan nilai yang sudah disanitasi.
 */

import { TEMPLATE_VARIABLE_KEYS } from "@/lib/constants";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Mengambil seluruh nama variabel yang dipakai pada sebuah template. */
export function extractTemplateVariables(template) {
  const text = String(template ?? "");
  const found = new Set();
  let match = VARIABLE_PATTERN.exec(text);
  while (match !== null) {
    found.add(match[1]);
    match = VARIABLE_PATTERN.exec(text);
  }
  VARIABLE_PATTERN.lastIndex = 0;
  return Array.from(found);
}

/**
 * Memvalidasi template saat admin menyimpan.
 * Variabel yang tidak dikenal harus ditolak, bukan dibiarkan diam-diam.
 */
export function validateTemplateMessage(message) {
  const used = extractTemplateVariables(message);
  const unknownVariables = used.filter(
    (key) => !TEMPLATE_VARIABLE_KEYS.includes(key),
  );
  return {
    valid: unknownVariables.length === 0,
    variables: used,
    unknownVariables,
  };
}

/** Membersihkan nilai agar aman dimasukkan ke dalam pesan WhatsApp. */
function sanitizeValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mengganti seluruh variabel pada template dengan nilai yang tersedia.
 * Variabel tak dikenal diganti dengan string kosong (tidak dievaluasi).
 */
export function renderTemplate(template, variables = {}) {
  const text = String(template ?? "");
  const result = text.replace(VARIABLE_PATTERN, (_full, key) => {
    if (!Object.prototype.hasOwnProperty.call(variables, key)) return "";
    return sanitizeValue(variables[key]);
  });
  VARIABLE_PATTERN.lastIndex = 0;
  return result.trim();
}
