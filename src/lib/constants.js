/**
 * Konstanta domain aplikasi.
 *
 * Semua nilai enum, label Bahasa Indonesia, warna badge, aturan transisi
 * status, dan daftar event notifikasi didefinisikan di satu tempat agar
 * tidak terjadi duplikasi logika antara UI dan server.
 */

export const ROLES = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
};

export const ROLE_LABELS = {
  ADMIN: "Admin",
  CUSTOMER: "Pelanggan",
};

// ------------------------------------------------------------------
// Status pesanan
// ------------------------------------------------------------------

export const ORDER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export const ORDER_STATUS_LABELS = {
  PENDING: "Menunggu Konfirmasi",
  CONFIRMED: "Dikonfirmasi",
  PROCESSING: "Sedang Diproses",
  READY_FOR_PICKUP: "Siap Diambil",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

/** Kelas Tailwind untuk badge status pesanan. */
export const ORDER_STATUS_BADGE = {
  PENDING: "bg-amber-100 text-amber-800 ring-amber-200",
  CONFIRMED: "bg-sky-100 text-sky-800 ring-sky-200",
  PROCESSING: "bg-blue-100 text-blue-800 ring-blue-200",
  READY_FOR_PICKUP: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 ring-rose-200",
};

/**
 * Aturan transisi status pada alur normal.
 * Status COMPLETED dan CANCELLED bersifat terminal.
 */
export const ORDER_STATUS_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Status yang dianggap "pesanan aktif" pada dashboard. */
export const ACTIVE_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_PICKUP",
];

/** Urutan tampilan status pada filter/report. */
export const ORDER_STATUS_LIST = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
];

// ------------------------------------------------------------------
// Satuan harga layanan
// ------------------------------------------------------------------

export const PRICE_UNITS = {
  KG: "KG",
  ITEM: "ITEM",
};

export const PRICE_UNIT_LABELS = {
  KG: "per Kilogram (kg)",
  ITEM: "per Item (pcs)",
};

export const PRICE_UNIT_SHORT = {
  KG: "/kg",
  ITEM: "/item",
};

// ------------------------------------------------------------------
// Status pembayaran
// ------------------------------------------------------------------

export const PAYMENT_STATUS = {
  UNPAID: "UNPAID",
  WAITING_VERIFICATION: "WAITING_VERIFICATION",
  PAID: "PAID",
  REJECTED: "REJECTED",
};

export const PAYMENT_STATUS_LABELS = {
  UNPAID: "Belum Dibayar",
  WAITING_VERIFICATION: "Menunggu Verifikasi",
  PAID: "Lunas",
  REJECTED: "Ditolak",
};

export const PAYMENT_STATUS_BADGE = {
  UNPAID: "bg-slate-100 text-slate-700 ring-slate-200",
  WAITING_VERIFICATION: "bg-amber-100 text-amber-800 ring-amber-200",
  PAID: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 ring-rose-200",
};

export const PAYMENT_STATUS_LIST = [
  "UNPAID",
  "WAITING_VERIFICATION",
  "PAID",
  "REJECTED",
];

// ------------------------------------------------------------------
// Status log notifikasi
// ------------------------------------------------------------------

/** Jenis catatan pada riwayat keputusan pembayaran. */
export const PAYMENT_REVIEW_ACTION = {
  SUBMITTED: "SUBMITTED",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

export const PAYMENT_REVIEW_ACTION_LABELS = {
  SUBMITTED: "Bukti Transfer Diunggah",
  VERIFIED: "Pembayaran Diverifikasi",
  REJECTED: "Pembayaran Ditolak",
};

export const NOTIFICATION_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
};

export const NOTIFICATION_STATUS_LABELS = {
  PENDING: "Menunggu",
  SENT: "Terkirim",
  FAILED: "Gagal",
};

export const NOTIFICATION_STATUS_BADGE = {
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
  SENT: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  FAILED: "bg-rose-100 text-rose-800 ring-rose-200",
};

// ------------------------------------------------------------------
// Event notifikasi WhatsApp
// ------------------------------------------------------------------

/**
 * Daftar event notifikasi yang didukung.
 * `orderStatus` menandakan event dipicu oleh perubahan status pesanan.
 */
export const NOTIFICATION_EVENTS = [
  {
    eventKey: "ORDER_CREATED",
    name: "Pesanan Dibuat",
    orderStatus: null,
    description: "Dikirim setelah pesanan pelanggan berhasil disimpan.",
    defaultMessage:
      "Halo {{customerName}}, pesanan laundry kamu dengan nomor {{orderNumber}} berhasil dibuat. Kamu bisa melihat detail pesanan di sini: {{orderUrl}}. Terima kasih telah menggunakan layanan kami!",
  },
  {
    eventKey: "ORDER_CONFIRMED",
    name: "Pesanan Dikonfirmasi",
    orderStatus: "CONFIRMED",
    description: "Dikirim ketika status pesanan berubah menjadi Dikonfirmasi.",
    defaultMessage:
      "Halo {{customerName}}, pesanan {{orderNumber}} sudah kami konfirmasi. Total biaya saat ini {{totalPrice}}. Terima kasih!",
  },
  {
    eventKey: "ORDER_PROCESSING",
    name: "Pesanan Sedang Diproses",
    orderStatus: "PROCESSING",
    description: "Dikirim ketika status pesanan berubah menjadi Sedang Diproses.",
    defaultMessage:
      "Halo {{customerName}}, pesanan {{orderNumber}} saat ini sedang diproses. Terima kasih telah menunggu.",
  },
  {
    eventKey: "ORDER_READY_FOR_PICKUP",
    name: "Pesanan Siap Diambil",
    orderStatus: "READY_FOR_PICKUP",
    description: "Dikirim ketika pesanan selesai diproses dan siap diambil.",
    defaultMessage:
      "Halo {{customerName}}, pesanan {{orderNumber}} sudah selesai diproses dan siap diambil. Terima kasih!",
  },
  {
    eventKey: "ORDER_COMPLETED",
    name: "Pesanan Selesai",
    orderStatus: "COMPLETED",
    description: "Dikirim ketika pesanan sudah diserahkan ke pelanggan.",
    defaultMessage:
      "Halo {{customerName}}, pesanan {{orderNumber}} telah selesai. Terima kasih telah menggunakan layanan kami.",
  },
  {
    eventKey: "ORDER_CANCELLED",
    name: "Pesanan Dibatalkan",
    orderStatus: "CANCELLED",
    description: "Dikirim ketika pesanan dibatalkan.",
    defaultMessage:
      "Halo {{customerName}}, pesanan {{orderNumber}} telah dibatalkan. Silakan hubungi kami jika ada pertanyaan.",
  },
  {
    eventKey: "PAYMENT_PAID",
    name: "Pembayaran Diterima",
    orderStatus: null,
    description: "Dikirim setelah admin memverifikasi pembayaran pelanggan.",
    defaultMessage:
      "Halo {{customerName}}, pembayaran untuk pesanan {{orderNumber}} telah kami terima dan diverifikasi. Total {{totalPrice}}. Terima kasih!",
  },
  {
    eventKey: "PAYMENT_REJECTED",
    name: "Pembayaran Ditolak",
    orderStatus: null,
    description:
      "Dikirim ketika admin menolak bukti pembayaran dan pelanggan perlu mengunggah ulang.",
    defaultMessage:
      "Halo {{customerName}}, bukti pembayaran untuk pesanan {{orderNumber}} belum dapat kami verifikasi. Silakan unggah ulang bukti transfer melalui {{orderUrl}}.",
  },
];

export const NOTIFICATION_EVENT_KEYS = NOTIFICATION_EVENTS.map(
  (event) => event.eventKey,
);

/** Pemetaan status pesanan -> event notifikasi. */
export const ORDER_STATUS_EVENT_MAP = {
  CONFIRMED: "ORDER_CONFIRMED",
  PROCESSING: "ORDER_PROCESSING",
  READY_FOR_PICKUP: "ORDER_READY_FOR_PICKUP",
  COMPLETED: "ORDER_COMPLETED",
  CANCELLED: "ORDER_CANCELLED",
};

/** Variabel template yang diizinkan. */
export const TEMPLATE_VARIABLES = [
  { key: "customerName", label: "Nama pelanggan" },
  { key: "orderNumber", label: "Nomor pesanan" },
  { key: "orderStatus", label: "Status pesanan" },
  { key: "serviceName", label: "Nama layanan" },
  { key: "weight", label: "Berat aktual (kg)" },
  { key: "totalPrice", label: "Total biaya" },
  { key: "orderUrl", label: "Link detail pesanan" },
];

export const TEMPLATE_VARIABLE_KEYS = TEMPLATE_VARIABLES.map((v) => v.key);

// ------------------------------------------------------------------
// Kunci pengaturan sistem (SystemSetting)
// ------------------------------------------------------------------

export const SETTING_KEYS = {
  PAYMENT_BANK_NAME: "payment_bank_name",
  PAYMENT_ACCOUNT_NUMBER: "payment_account_number",
  PAYMENT_ACCOUNT_NAME: "payment_account_name",
  PAYMENT_INSTRUCTIONS: "payment_instructions",
  WHATSAPP_ENABLED: "whatsapp_enabled",
};

export const DEFAULT_SETTINGS = {
  [SETTING_KEYS.PAYMENT_BANK_NAME]: "Bank BCA",
  [SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER]: "1234567890",
  [SETTING_KEYS.PAYMENT_ACCOUNT_NAME]: "Laundry Bersih Jaya",
  [SETTING_KEYS.PAYMENT_INSTRUCTIONS]:
    "Silakan transfer sesuai total biaya pesanan ke rekening di atas, lalu unggah bukti transfer pada halaman detail pesanan.",
  [SETTING_KEYS.WHATSAPP_ENABLED]: "true",
};

// ------------------------------------------------------------------
// Paginasi & upload
// ------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50];
export const MAX_PAGE_SIZE = 100;

export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const ALLOWED_RECEIPT_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
export const DEFAULT_MAX_UPLOAD_SIZE_MB = 5;
