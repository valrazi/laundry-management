/**
 * Skema validasi Zod untuk seluruh input dari klien.
 * Setiap Server Action WAJIB menjalankan validasi di sini sebelum
 * menyentuh database.
 */

import { z } from "zod";

import {
  ORDER_STATUS_LIST,
  PAYMENT_STATUS_LIST,
  PRICE_UNITS,
  SETTING_KEYS,
} from "./constants";
import { isValidPhone, normalizePhone } from "./format";

const trimmedString = (max) => z.string().trim().max(max);

/** Email: di-trim, di-lowercase, lalu divalidasi formatnya. */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { message: "Email wajib diisi." })
  .max(190, { message: "Email terlalu panjang." })
  .email({ message: "Format email tidak valid." });

/** Nomor WhatsApp: divalidasi lalu dinormalisasi ke format 62xxxx. */
export const phoneField = z
  .string()
  .trim()
  .min(1, { message: "Nomor WhatsApp wajib diisi." })
  .max(20, { message: "Nomor WhatsApp terlalu panjang." })
  .refine(isValidPhone, {
    message: "Nomor WhatsApp tidak valid. Contoh: 081234567890.",
  })
  .transform(normalizePhone);

export const passwordField = z
  .string()
  .min(8, { message: "Password minimal 8 karakter." })
  .max(72, { message: "Password maksimal 72 karakter." })
  .regex(/[A-Za-z]/, { message: "Password harus memuat huruf." })
  .regex(/[0-9]/, { message: "Password harus memuat angka." });

/**
 * Normalisasi nilai checkbox dari FormData.
 * Nilai "on" (default HTML) / "true" / "1" dianggap true.
 */
export const checkboxField = z.preprocess(
  (value) =>
    value === true || value === "true" || value === "on" || value === "1",
  z.boolean(),
);

/** Angka opsional yang mengubah string kosong menjadi null. */
const optionalNumber = (inner) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    inner.nullable(),
  );

/** Teks opsional yang mengubah string kosong menjadi null. */
const optionalText = (max) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) return null;
      const text = String(value).trim();
      return text === "" ? null : text;
    },
    z.string().max(max).nullable(),
  );

// ------------------------------------------------------------------
// Autentikasi
// ------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: "Password wajib diisi." }),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, { message: "Nama minimal 3 karakter." })
      .max(120, { message: "Nama maksimal 120 karakter." }),
    email: emailField,
    phone: phoneField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

// ------------------------------------------------------------------
// Profil pelanggan
// ------------------------------------------------------------------

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: "Nama minimal 3 karakter." })
    .max(120, { message: "Nama maksimal 120 karakter." }),
  email: emailField,
  phone: phoneField,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Password saat ini wajib diisi." }),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password baru tidak sama.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Password baru harus berbeda dari password saat ini.",
    path: ["newPassword"],
  });

// ------------------------------------------------------------------
// Layanan
// ------------------------------------------------------------------

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Nama layanan minimal 2 karakter." })
    .max(120, { message: "Nama layanan maksimal 120 karakter." }),
  description: optionalText(1000),
  price: z.coerce
    .number({ message: "Harga harus berupa angka." })
    .positive({ message: "Harga harus lebih dari 0." })
    .max(99_999_999, { message: "Harga terlalu besar." }),
  priceUnit: z.enum([PRICE_UNITS.KG, PRICE_UNITS.ITEM], {
    message: "Satuan harga tidak valid.",
  }),
  isActive: checkboxField,
});

export const toggleServiceSchema = z.object({
  serviceId: z.string().min(1),
  isActive: checkboxField,
});

export const updateServiceSchema = serviceSchema.extend({
  serviceId: z.string().min(1, { message: "Layanan tidak valid." }),
});

// ------------------------------------------------------------------
// Pesanan
// ------------------------------------------------------------------

export const orderItemInputSchema = z.object({
  serviceId: z.string().min(1, { message: "Layanan tidak valid." }),
  quantity: optionalNumber(
    z.coerce
      .number()
      .int({ message: "Jumlah item harus bilangan bulat." })
      .min(1, { message: "Jumlah item minimal 1." })
      .max(999, { message: "Jumlah item maksimal 999." }),
  ),
});

export const createOrderSchema = z.object({
  items: z
    .array(orderItemInputSchema)
    .min(1, { message: "Pilih minimal satu layanan." })
    .max(20, { message: "Maksimal 20 layanan per pesanan." }),
  customerNotes: optionalText(500),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(ORDER_STATUS_LIST, { message: "Status tidak valid." }),
  notes: optionalText(500),
  /** Koreksi khusus admin: melewati aturan transisi normal, tetap dicatat. */
  force: checkboxField.optional().default(false),
});

/**
 * Pembaruan berat aktual, jumlah item, biaya tambahan, dan catatan admin.
 * Nilai berat/jumlah item dikosongkan (null) bila belum tersedia.
 */
export const updateOrderDetailsSchema = z.object({
  orderId: z.string().min(1),
  additionalCost: z.coerce
    .number({ message: "Biaya tambahan harus berupa angka." })
    .min(0, { message: "Biaya tambahan tidak boleh negatif." })
    .max(99_999_999, { message: "Biaya tambahan terlalu besar." }),
  adminNotes: optionalText(1000),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        weight: optionalNumber(
          z.coerce
            .number()
            .min(0, { message: "Berat tidak boleh negatif." })
            .max(1000, { message: "Berat maksimal 1000 kg." }),
        ),
        quantity: optionalNumber(
          z.coerce
            .number()
            .int({ message: "Jumlah item harus bilangan bulat." })
            .min(1, { message: "Jumlah item minimal 1." })
            .max(999, { message: "Jumlah item maksimal 999." }),
        ),
      }),
    )
    .max(20),
});

// ------------------------------------------------------------------
// Pembayaran
// ------------------------------------------------------------------

export const submitReceiptSchema = z.object({
  orderId: z.string().min(1),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1),
});

export const rejectPaymentSchema = z.object({
  paymentId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(5, { message: "Alasan penolakan minimal 5 karakter." })
    .max(500, { message: "Alasan penolakan maksimal 500 karakter." }),
});

// ------------------------------------------------------------------
// Template notifikasi & pengaturan
// ------------------------------------------------------------------

export const notificationTemplateSchema = z.object({
  eventKey: z.string().min(1, { message: "Event tidak valid." }),
  name: z
    .string()
    .trim()
    .min(2, { message: "Nama template minimal 2 karakter." })
    .max(120),
  message: z
    .string()
    .trim()
    .min(10, { message: "Isi pesan minimal 10 karakter." })
    .max(2000, { message: "Isi pesan maksimal 2000 karakter." }),
  isActive: checkboxField,
});

export const retryNotificationSchema = z.object({
  logId: z.string().min(1),
});

export const settingsSchema = z.object({
  [SETTING_KEYS.PAYMENT_BANK_NAME]: z
    .string()
    .trim()
    .min(2, { message: "Nama bank wajib diisi." })
    .max(80),
  [SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER]: z
    .string()
    .trim()
    .min(4, { message: "Nomor rekening minimal 4 karakter." })
    .max(40),
  [SETTING_KEYS.PAYMENT_ACCOUNT_NAME]: z
    .string()
    .trim()
    .min(2, { message: "Nama pemilik rekening wajib diisi." })
    .max(120),
  [SETTING_KEYS.PAYMENT_INSTRUCTIONS]: z
    .string()
    .trim()
    .min(10, { message: "Instruksi pembayaran minimal 10 karakter." })
    .max(1000),
  [SETTING_KEYS.WHATSAPP_ENABLED]: checkboxField,
});

// ------------------------------------------------------------------
// Query daftar (search, filter, paginasi)
// ------------------------------------------------------------------

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  status: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (value) => value === "" || ORDER_STATUS_LIST.includes(value),
      { message: "Filter status tidak valid." },
    ),
  paymentStatus: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (value) => value === "" || PAYMENT_STATUS_LIST.includes(value),
      { message: "Filter status pembayaran tidak valid." },
    ),
  from: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
      message: "Tanggal awal tidak valid.",
    }),
  to: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
      message: "Tanggal akhir tidak valid.",
    }),
});

// ------------------------------------------------------------------
// Helper
// ------------------------------------------------------------------

/** Mengubah FormData menjadi objek biasa (tanpa nilai File). */
export function formDataToObject(formData) {
  const result = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !(key in result)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Menjalankan validasi dan mengembalikan hasil yang seragam.
 * @returns {{ok: true, data: any} | {ok: false, message: string, fieldErrors: Record<string,string>}}
 */
export function parseWith(schema, input) {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  const fieldErrors = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!fieldErrors[path]) fieldErrors[path] = issue.message;
  }
  return {
    ok: false,
    message: "Periksa kembali data yang Anda masukkan.",
    fieldErrors,
  };
}

export const schemas = {
  loginSchema,
  registerSchema,
  profileSchema,
  changePasswordSchema,
  serviceSchema,
  updateServiceSchema,
  toggleServiceSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  updateOrderDetailsSchema,
  submitReceiptSchema,
  verifyPaymentSchema,
  rejectPaymentSchema,
  notificationTemplateSchema,
  retryNotificationSchema,
  settingsSchema,
  listQuerySchema,
};
