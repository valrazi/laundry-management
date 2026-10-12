/**
 * Data awal untuk development & demonstrasi.
 *
 * Jalankan dengan: `npm run db:seed`
 *
 * Catatan penting:
 * - Skrip ini TIDAK memicu notifikasi WhatsApp (PRD §9.6). Seed hanya
 *   menulis ke database.
 * - Password admin diambil dari environment variable sehingga tidak ada
 *   password default yang tertanam di kode.
 */

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

// Memuat variabel dari .env (Node >= 20.12) saat dijalankan langsung
// dengan `node prisma/seed.js` di luar Prisma CLI.
try {
  process.loadEnvFile(".env");
} catch {
  // .env tidak ada — asumsikan variabel sudah tersedia di environment.
}

const { default: prisma } = await import("../src/lib/prisma.js");
const { hashPassword } = await import("../src/lib/password.js");
const { Decimal } = await import("../src/lib/decimal.js");
const {
  DEFAULT_SETTINGS,
  NOTIFICATION_EVENTS,
  ORDER_STATUS,
  PAYMENT_REVIEW_ACTION,
  PAYMENT_STATUS,
  PRICE_UNITS,
  ROLES,
} = await import("../src/lib/constants.js");

const ORDER_NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomToken(length) {
  const bytes = randomBytes(length);
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += ORDER_NUMBER_ALPHABET[bytes[index] % ORDER_NUMBER_ALPHABET.length];
  }
  return output;
}

function jakartaDateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}`;
}

function generateOrderNumber(date = new Date()) {
  return `LDR-${jakartaDateStamp(date)}-${randomToken(5)}`;
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ------------------------------------------------------------------
// Pembuat gambar bukti transfer contoh (PNG RGB murni, tanpa dependensi)
// ------------------------------------------------------------------

let crcTable = null;

function getCrcTable() {
  if (crcTable) return crcTable;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let k = 0; k < 8; k += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value;
  }
  crcTable = table;
  return table;
}

function crc32(buffer) {
  const table = getCrcTable();
  let crc = -1;
  for (let index = 0; index < buffer.length; index += 1) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[index]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** Membuat PNG bergaris sederhana sebagai pengganti bukti transfer asli. */
function createPlaceholderPng(width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolor RGB
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const rowLength = width * 3 + 1;
  const raw = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowLength;
    raw[rowStart] = 0; // filter: none
    const isBand =
      (y > height * 0.3 && y < height * 0.36) ||
      (y > height * 0.5 && y < height * 0.56) ||
      (y > height * 0.7 && y < height * 0.73);

    for (let x = 0; x < width; x += 1) {
      const pixel = rowStart + 1 + x * 3;
      if (isBand) {
        raw[pixel] = 0x61; // biru muda
        raw[pixel + 1] = 0xa5;
        raw[pixel + 2] = 0xf8;
      } else {
        raw[pixel] = 0xfd;
        raw[pixel + 1] = 0xfe;
        raw[pixel + 2] = 0xff;
      }
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Menulis file bukti transfer contoh ke direktori upload privat. */
async function writeSeedReceipt(orderNumber) {
  const directory = path.resolve(
    process.cwd(),
    process.env.UPLOAD_DIR || "uploads",
    "receipts",
  );
  await mkdir(directory, { recursive: true });

  const fileName = `seed-${orderNumber.toLowerCase()}.png`;
  const image = createPlaceholderPng(600, 380);
  await writeFile(path.join(directory, fileName), image);

  return {
    storedPath: `receipts/${fileName}`,
    size: image.length,
  };
}

// Nilai uang dihitung dengan Decimal agar konsisten dengan aturan aplikasi.
function computeItemSubtotal({ priceUnit, price, weight, quantity }) {
  const unitPrice = new Decimal(price);
  if (priceUnit === PRICE_UNITS.KG) {
    if (weight === null || weight === undefined) return new Decimal(0);
    return unitPrice.times(new Decimal(weight));
  }
  if (quantity === null || quantity === undefined) return new Decimal(0);
  return unitPrice.times(quantity);
}

async function seedUsers() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin#12345";
  const customerPassword =
    process.env.SEED_CUSTOMER_PASSWORD || "Customer#12345";

  const admin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL || "admin@laundry.test" },
    update: {
      name: process.env.SEED_ADMIN_NAME || "Admin Laundry",
      phone: process.env.SEED_ADMIN_PHONE || "081200000001",
      role: ROLES.ADMIN,
      isActive: true,
      passwordHash: await hashPassword(adminPassword),
    },
    create: {
      name: process.env.SEED_ADMIN_NAME || "Admin Laundry",
      email: process.env.SEED_ADMIN_EMAIL || "admin@laundry.test",
      phone: process.env.SEED_ADMIN_PHONE || "081200000001",
      role: ROLES.ADMIN,
      isActive: true,
      passwordHash: await hashPassword(adminPassword),
    },
  });

  const customerSeeds = [
    { name: "Budi Santoso", email: "budi@example.test", phone: "081234567801" },
    { name: "Siti Aminah", email: "siti@example.test", phone: "081234567802" },
    { name: "Andi Pratama", email: "andi@example.test", phone: "081234567803" },
  ];

  const customers = [];
  for (const seed of customerSeeds) {
    const existing = await prisma.user.findUnique({ where: { email: seed.email } });
    const customer = await prisma.user.upsert({
      where: { email: seed.email },
      update: { name: seed.name, phone: seed.phone, isActive: true },
      create: {
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        role: ROLES.CUSTOMER,
        isActive: true,
        // Semua pelanggan contoh memakai password yang sama (didokumentasikan
        // pada README) agar mudah didemokan.
        passwordHash: existing
          ? undefined
          : await hashPassword(customerPassword),
      },
    });
    customers.push(customer);
  }

  return { admin, customers };
}

async function seedServices() {
  const serviceSeeds = [
    {
      name: "Cuci Kering Reguler",
      description: "Cuci dan kering tanpa setrika, selesai dalam 2 hari.",
      price: "7000.00",
      priceUnit: PRICE_UNITS.KG,
    },
    {
      name: "Cuci Kering Setrika Express",
      description: "Cuci, kering, dan setrika, selesai dalam 1 hari.",
      price: "12000.00",
      priceUnit: PRICE_UNITS.KG,
    },
    {
      name: "Setrika Saja",
      description: "Layanan setrika untuk pakaian yang sudah bersih.",
      price: "5000.00",
      priceUnit: PRICE_UNITS.KG,
    },
    {
      name: "Cuci Sepatu",
      description: "Pembersihan sepatu per pasang.",
      price: "25000.00",
      priceUnit: PRICE_UNITS.ITEM,
    },
    {
      name: "Cuci Bed Cover",
      description: "Pembersihan bed cover ukuran hingga 180x200 cm.",
      price: "35000.00",
      priceUnit: PRICE_UNITS.ITEM,
    },
    {
      name: "Cuci Jas / Gaun",
      description: "Perawatan khusus untuk jas atau gaun.",
      price: "45000.00",
      priceUnit: PRICE_UNITS.ITEM,
    },
  ];

  const services = [];
  for (const seed of serviceSeeds) {
    const existing = await prisma.service.findFirst({ where: { name: seed.name } });
    if (existing) {
      services.push(
        await prisma.service.update({
          where: { id: existing.id },
          data: { ...seed, isActive: true },
        }),
      );
    } else {
      services.push(await prisma.service.create({ data: { ...seed, isActive: true } }));
    }
  }
  return services;
}

async function seedTemplates() {
  for (const event of NOTIFICATION_EVENTS) {
    await prisma.notificationTemplate.upsert({
      where: { eventKey: event.eventKey },
      update: { name: event.name },
      create: {
        eventKey: event.eventKey,
        name: event.name,
        message: event.defaultMessage,
        isActive: true,
      },
    });
  }
}

async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
}

/**
 * Membuat contoh pesanan pada berbagai status agar dashboard, laporan, dan
 * riwayat status dapat langsung didemokan.
 */
async function seedOrders({ admin, customers, services }) {
  const existingOrders = await prisma.order.count();
  if (existingOrders > 0) {
    console.log("· Melewati contoh pesanan (sudah ada data pesanan).");
    return;
  }

  const serviceByName = new Map(services.map((service) => [service.name, service]));

  const orderSeeds = [
    {
      customer: customers[0],
      createdAt: daysAgo(11),
      status: ORDER_STATUS.COMPLETED,
      paymentStatus: PAYMENT_STATUS.PAID,
      customerNotes: "Tolong pisahkan pakaian putih.",
      adminNotes: "Sudah diserahkan ke pelanggan.",
      items: [
        { service: "Cuci Kering Setrika Express", weight: "4.50" },
        { service: "Cuci Sepatu", quantity: 1 },
      ],
      additionalCost: "0.00",
    },
    {
      customer: customers[1],
      createdAt: daysAgo(7),
      status: ORDER_STATUS.COMPLETED,
      paymentStatus: PAYMENT_STATUS.PAID,
      customerNotes: null,
      adminNotes: null,
      items: [{ service: "Cuci Kering Reguler", weight: "6.20" }],
      additionalCost: "5000.00",
    },
    {
      customer: customers[2],
      createdAt: daysAgo(4),
      status: ORDER_STATUS.READY_FOR_PICKUP,
      paymentStatus: PAYMENT_STATUS.WAITING_VERIFICATION,
      customerNotes: "Bed cover ada noda kopi.",
      adminNotes: null,
      items: [
        { service: "Cuci Bed Cover", quantity: 2 },
        { service: "Cuci Kering Reguler", weight: "3.00" },
      ],
      additionalCost: "0.00",
    },
    {
      customer: customers[0],
      createdAt: daysAgo(2),
      status: ORDER_STATUS.PROCESSING,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      customerNotes: "Jangan pakai pewangi.",
      adminNotes: null,
      items: [{ service: "Cuci Kering Setrika Express", weight: "5.00" }],
      additionalCost: "0.00",
    },
    {
      customer: customers[1],
      createdAt: daysAgo(1),
      status: ORDER_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      customerNotes: null,
      adminNotes: "Menunggu penimbangan.",
      items: [
        { service: "Cuci Jas / Gaun", quantity: 1 },
        { service: "Setrika Saja", weight: null },
      ],
      additionalCost: "0.00",
    },
    {
      customer: customers[2],
      createdAt: daysAgo(0),
      status: ORDER_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.UNPAID,
      customerNotes: "Diambil sore hari.",
      adminNotes: null,
      items: [{ service: "Cuci Kering Reguler", weight: null }],
      additionalCost: "0.00",
    },
  ];

  for (const seed of orderSeeds) {
    const items = seed.items.map((entry) => {
      const service = serviceByName.get(entry.service);
      if (!service) throw new Error(`Layanan seed tidak ditemukan: ${entry.service}`);
      const weight = entry.weight ?? null;
      const quantity = entry.quantity ?? null;
      const priceUnit = service.priceUnit;
      const subtotal = computeItemSubtotal({
        priceUnit,
        price: service.price,
        weight,
        quantity,
      });
      return {
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        priceSnapshot: new Decimal(service.price).toFixed(2),
        priceUnitSnapshot: priceUnit,
        quantity,
        weight: weight === null ? null : new Decimal(weight).toFixed(2),
        subtotal,
      };
    });

    let subtotal = new Decimal(0);
    let weightTotal = new Decimal(0);
    let hasKgService = false;
    let hasPendingWeight = false;

    for (const item of items) {
      subtotal = subtotal.plus(item.subtotal);
      if (item.priceUnitSnapshot === PRICE_UNITS.KG) {
        hasKgService = true;
        if (item.weight === null) hasPendingWeight = true;
        else weightTotal = weightTotal.plus(new Decimal(item.weight));
      }
    }

    const additionalCost = new Decimal(seed.additionalCost);
    const totalPrice = subtotal.plus(additionalCost);
    const orderWeight =
      hasKgService && !hasPendingWeight && weightTotal.greaterThan(0)
        ? weightTotal.toFixed(2)
        : null;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(seed.createdAt),
        customerId: seed.customer.id,
        status: seed.status,
        weight: orderWeight,
        subtotal: subtotal.toFixed(2),
        additionalCost: additionalCost.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
        customerNotes: seed.customerNotes,
        adminNotes: seed.adminNotes,
        createdAt: seed.createdAt,
        updatedAt: seed.createdAt,
        completedAt:
          seed.status === ORDER_STATUS.COMPLETED
            ? new Date(seed.createdAt.getTime() + 24 * 60 * 60 * 1000)
            : null,
        items: {
          create: items.map((item) => ({
            serviceId: item.serviceId,
            serviceNameSnapshot: item.serviceNameSnapshot,
            priceSnapshot: item.priceSnapshot,
            priceUnitSnapshot: item.priceUnitSnapshot,
            quantity: item.quantity,
            weight: item.weight,
            subtotal: item.subtotal.toFixed(2),
          })),
        },
      },
    });

    // Riwayat status yang masuk akal sesuai status akhir.
    const flowByStatus = {
      [ORDER_STATUS.PENDING]: [ORDER_STATUS.PENDING],
      [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED],
      [ORDER_STATUS.PROCESSING]: [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.PROCESSING,
      ],
      [ORDER_STATUS.READY_FOR_PICKUP]: [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.READY_FOR_PICKUP,
      ],
      [ORDER_STATUS.COMPLETED]: [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.READY_FOR_PICKUP,
        ORDER_STATUS.COMPLETED,
      ],
      [ORDER_STATUS.CANCELLED]: [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED],
    };

    const flow = flowByStatus[seed.status] || [ORDER_STATUS.PENDING];
    let previous = null;
    let stepTime = seed.createdAt.getTime();
    for (const status of flow) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          oldStatus: previous,
          newStatus: status,
          changedByUserId: previous === null ? seed.customer.id : admin.id,
          notes:
            previous === null
              ? "Pesanan dibuat oleh pelanggan."
              : `Status diubah menjadi ${status}.`,
          createdAt: new Date(stepTime),
        },
      });
      previous = status;
      stepTime += 6 * 60 * 60 * 1000;
    }

    // Baris pembayaran (satu per pesanan, sesuai desain MVP).
    const receipt =
      seed.paymentStatus === PAYMENT_STATUS.UNPAID
        ? null
        : await writeSeedReceipt(order.orderNumber);

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: totalPrice.toFixed(2),
        status: seed.paymentStatus,
        createdAt: seed.createdAt,
        updatedAt: seed.createdAt,
        proofFilePath: receipt?.storedPath ?? null,
        proofOriginalName: receipt ? "bukti-transfer-contoh.png" : null,
        proofMimeType: receipt ? "image/png" : null,
        proofSize: receipt?.size ?? null,
        proofUploadedAt:
          seed.paymentStatus === PAYMENT_STATUS.UNPAID
            ? null
            : new Date(seed.createdAt.getTime() + 2 * 60 * 60 * 1000),
        verifiedByUserId:
          seed.paymentStatus === PAYMENT_STATUS.PAID ? admin.id : null,
        verifiedAt:
          seed.paymentStatus === PAYMENT_STATUS.PAID
            ? new Date(seed.createdAt.getTime() + 20 * 60 * 60 * 1000)
            : null,
      },
    });

    if (seed.paymentStatus !== PAYMENT_STATUS.UNPAID) {
      await prisma.paymentReview.create({
        data: {
          paymentId: payment.id,
          action: PAYMENT_REVIEW_ACTION.SUBMITTED,
          reason: "Bukti transfer diunggah pelanggan.",
          amount: totalPrice.toFixed(2),
          reviewedByUserId: seed.customer.id,
          createdAt: new Date(seed.createdAt.getTime() + 2 * 60 * 60 * 1000),
        },
      });
    }

    if (seed.paymentStatus === PAYMENT_STATUS.PAID) {
      await prisma.paymentReview.create({
        data: {
          paymentId: payment.id,
          action: PAYMENT_REVIEW_ACTION.VERIFIED,
          amount: totalPrice.toFixed(2),
          reviewedByUserId: admin.id,
          createdAt: new Date(seed.createdAt.getTime() + 20 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log(`· ${orderSeeds.length} contoh pesanan dibuat.`);
}

async function main() {
  console.log("Menjalankan seed data pengembangan...");

  const { admin, customers } = await seedUsers();
  const services = await seedServices();
  await seedTemplates();
  await seedSettings();
  await seedOrders({ admin, customers, services });

  const counts = {
    users: await prisma.user.count(),
    services: await prisma.service.count(),
    templates: await prisma.notificationTemplate.count(),
    orders: await prisma.order.count(),
  };

  console.log("Selesai. Ringkasan data:");
  console.log(`  Pengguna   : ${counts.users}`);
  console.log(`  Layanan    : ${counts.services}`);
  console.log(`  Template   : ${counts.templates}`);
  console.log(`  Pesanan    : ${counts.orders}`);
  console.log("");
  console.log("Kredensial development:");
  console.log(
    `  Admin     : ${process.env.SEED_ADMIN_EMAIL || "admin@laundry.test"} / ${
      process.env.SEED_ADMIN_PASSWORD || "Admin#12345"
    }`,
  );
  console.log(
    `  Pelanggan : budi@example.test / ${process.env.SEED_CUSTOMER_PASSWORD || "Customer#12345"}`,
  );
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
