/**
 * Helper pengujian: pembersihan database & factory data.
 */

import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ROLES } from "@/lib/constants";

const TABLES_IN_ORDER = [
  "notification_logs",
  "payment_reviews",
  "payments",
  "order_status_histories",
  "order_items",
  "orders",
  "services",
  "notification_templates",
  "system_settings",
  "sessions",
  "users",
];

/** Mengosongkan seluruh tabel tanpa menghapus skema. */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of TABLES_IN_ORDER) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

let sequence = 0;
function nextSuffix() {
  sequence += 1;
  return `${Date.now().toString(36)}${sequence}`;
}

export async function createUser({
  name = "Pengguna Uji",
  email,
  phone,
  password = "Rahasia123",
  role = ROLES.CUSTOMER,
  isActive = true,
} = {}) {
  const suffix = nextSuffix();
  return prisma.user.create({
    data: {
      name,
      email: email || `user-${suffix}@example.test`,
      phone: phone || `0812${String(sequence).padStart(8, "0")}`,
      passwordHash: await hashPassword(password),
      role,
      isActive,
    },
  });
}

export async function createCustomerWithPassword(options = {}) {
  const password = options.password || "Rahasia123";
  const user = await createUser({ ...options, password });
  return { user, password };
}

export async function createAdmin() {
  return createUser({ role: ROLES.ADMIN, name: "Admin Uji" });
}

export async function createService({
  name = "Cuci Kering Reguler",
  description = "Layanan uji",
  price = "7000.00",
  priceUnit = "KG",
  isActive = true,
} = {}) {
  return prisma.service.create({
    data: { name: `${name}`, description, price, priceUnit, isActive },
  });
}

/** Membuat template notifikasi aktif untuk event tertentu. */
export async function createTemplate({
  eventKey,
  name = "Template Uji",
  message = "Halo {{customerName}}, pesanan {{orderNumber}} statusnya {{orderStatus}}.",
  isActive = true,
} = {}) {
  return prisma.notificationTemplate.upsert({
    where: { eventKey },
    create: { eventKey, name, message, isActive },
    update: { name, message, isActive },
  });
}

export async function enableWhatsApp() {
  await prisma.systemSetting.upsert({
    where: { key: "whatsapp_enabled" },
    create: { key: "whatsapp_enabled", value: "true" },
    update: { value: "true" },
  });
}

/**
 * Membuat header gambar PNG minimal yang valid (8 byte signature +
 * IHDR chunk) — cukup untuk menguji deteksi magic bytes.
 */
export function buildPngBuffer(extraBytes = 64) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.from("IHDR");
  const body = Buffer.alloc(extraBytes, 0x00);
  return Buffer.concat([signature, ihdr, body]);
}

export function buildJpegBuffer(extraBytes = 32) {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(extraBytes, 0x00),
  ]);
}

export function buildWebpBuffer(extraBytes = 32) {
  return Buffer.concat([
    Buffer.from("RIFF"),
    Buffer.alloc(4, 0),
    Buffer.from("WEBP"),
    Buffer.alloc(extraBytes, 0),
  ]);
}

export { prisma };
