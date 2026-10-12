/**
 * Aturan bisnis pesanan.
 *
 * Modul ini adalah satu-satunya tempat aturan berikut ditulis ulang:
 * - pembuatan nomor pesanan unik
 * - perhitungan subtotal item & total pesanan (KG dan ITEM)
 * - aturan transisi status pesanan
 * - pencatatan riwayat status
 *
 * Semua fungsi murni (pure) dipisahkan agar mudah diuji.
 */

import { randomBytes } from "node:crypto";

import prisma from "@/lib/prisma";
import { Decimal } from "@/lib/decimal";
import { JAKARTA_TIME_ZONE } from "@/lib/format";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ORDER_STATUS,
  ORDER_STATUS_EVENT_MAP,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS,
  PRICE_UNITS,
} from "@/lib/constants";

import { notifyOrderEvent } from "./notificationService";

const ORDER_NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Token acak untuk nomor pesanan (tanpa karakter ambigu I/O/0/1). */
function randomToken(length) {
  const bytes = randomBytes(length);
  let output = "";
  for (let index = 0; index < length; index += 1) {
    output += ORDER_NUMBER_ALPHABET[bytes[index] % ORDER_NUMBER_ALPHABET.length];
  }
  return output;
}

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

/** Nomor pesanan unik, contoh: LDR-20261012-7KQ2M */
export function generateOrderNumber(date = new Date()) {
  return `LDR-${jakartaDateStamp(date)}-${randomToken(5)}`;
}

export function isUniqueConstraintError(error) {
  return error?.code === "P2002";
}

// ------------------------------------------------------------------
// Perhitungan harga (fungsi murni — diuji pada tests/orders.test.js)
// ------------------------------------------------------------------

/** Subtotal satu item sesuai satuannya. */
export function computeItemSubtotal({
  priceUnitSnapshot,
  priceSnapshot,
  weight,
  quantity,
}) {
  const price = new Decimal(priceSnapshot ?? 0);
  if (priceUnitSnapshot === PRICE_UNITS.KG) {
    if (weight === null || weight === undefined || weight === "") {
      return new Decimal(0);
    }
    return price.times(new Decimal(weight));
  }
  if (quantity === null || quantity === undefined || quantity === "") {
    return new Decimal(0);
  }
  return price.times(new Decimal(quantity));
}

/**
 * Menghitung subtotal, total, dan berat aktual pesanan.
 * Setiap item dihitung sendiri-sendiri agar pesanan campuran KG & ITEM
 * (atau beberapa layanan berbeda satuan) tetap benar.
 */
export function calculateOrderTotals(items, additionalCost = 0) {
  let subtotal = new Decimal(0);
  let weightTotal = new Decimal(0);
  let hasKgService = false;
  let hasPendingWeight = false;

  const computedItems = items.map((item) => {
    const itemSubtotal = computeItemSubtotal(item);

    if (item.priceUnitSnapshot === PRICE_UNITS.KG) {
      hasKgService = true;
      const weight = item.weight;
      if (weight === null || weight === undefined || weight === "") {
        hasPendingWeight = true;
      } else {
        weightTotal = weightTotal.plus(new Decimal(weight));
      }
    }

    subtotal = subtotal.plus(itemSubtotal);
    return { ...item, subtotal: itemSubtotal };
  });

  const cost = new Decimal(additionalCost || 0);
  const orderWeight =
    hasKgService && !hasPendingWeight && weightTotal.greaterThan(0)
      ? weightTotal
      : null;

  return {
    items: computedItems,
    subtotal,
    additionalCost: cost,
    totalPrice: subtotal.plus(cost),
    weight: orderWeight,
    hasKgService,
    hasPendingWeight,
  };
}

// ------------------------------------------------------------------
// Aturan transisi status (fungsi murni)
// ------------------------------------------------------------------

/**
 * Memvalidasi transisi status pesanan.
 * `force` hanya boleh dipakai oleh alur koreksi admin yang tercatat.
 */
export function canTransition(from, to, { force = false } = {}) {
  if (from === to) {
    return { ok: false, isCorrection: false, message: "Status tidak berubah." };
  }
  const allowed = ORDER_STATUS_TRANSITIONS[from] || [];
  if (allowed.includes(to)) {
    return { ok: true, isCorrection: false, message: null };
  }
  if (force) {
    return { ok: true, isCorrection: true, message: null };
  }
  return {
    ok: false,
    isCorrection: false,
    message: `Status tidak dapat diubah dari "${
      ORDER_STATUS_LABELS[from] || from
    }" menjadi "${ORDER_STATUS_LABELS[to] || to}".`,
  };
}

/** Apakah pesanan dianggap aktif (belum selesai/dibatalkan). */
export function isActiveStatus(status) {
  return (
    status !== ORDER_STATUS.COMPLETED && status !== ORDER_STATUS.CANCELLED
  );
}

// ------------------------------------------------------------------
// Query pembantu
// ------------------------------------------------------------------

export function normalizePagination({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(Math.floor(pageSize), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize };
}

/** Rentang tanggal pada zona Asia/Jakarta (untuk filter laporan). */
export function jakartaDateRange(from, to) {
  const range = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000+07:00`);
  if (to) range.lte = new Date(`${to}T23:59:59.999+07:00`);
  return range;
}

const orderListInclude = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  payment: { select: { id: true, status: true, amount: true } },
  _count: { select: { items: true } },
};

const orderDetailInclude = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  items: { orderBy: { createdAt: "asc" } },
  payment: {
    include: {
      verifiedBy: { select: { id: true, name: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { reviewedBy: { select: { id: true, name: true } } },
      },
    },
  },
  statusHistory: {
    orderBy: { createdAt: "asc" },
    include: { changedBy: { select: { id: true, name: true, role: true } } },
  },
  notificationLogs: { orderBy: { createdAt: "desc" }, take: 20 },
};

/** Membangun klausa `where` untuk daftar pesanan admin. */
export function buildOrderListWhere({
  q = "",
  status = "",
  paymentStatus = "",
  from = "",
  to = "",
  customerId = "",
} = {}) {
  const where = {};

  if (customerId) where.customerId = customerId;

  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { customer: { is: { name: { contains: q } } } },
      { customer: { is: { email: { contains: q } } } },
      { customer: { is: { phone: { contains: q } } } },
    ];
  }

  if (status) where.status = status;
  if (paymentStatus) where.payment = { is: { status: paymentStatus } };

  if (from || to) {
    where.createdAt = jakartaDateRange(from, to);
  }

  return where;
}

// ------------------------------------------------------------------
// Pembuatan pesanan
// ------------------------------------------------------------------

/**
 * Membuat pesanan baru untuk pelanggan yang sedang login.
 * Harga, satuan, dan nama layanan selalu diambil dari database (snapshot),
 * bukan dari data yang dikirim browser.
 */
export async function createOrder({ customerId, items, customerNotes = null }) {
  const requestedIds = Array.from(new Set(items.map((item) => item.serviceId)));

  const services = await prisma.service.findMany({
    where: { id: { in: requestedIds }, isActive: true },
  });

  if (services.length !== requestedIds.length) {
    return {
      ok: false,
      message:
        "Beberapa layanan tidak tersedia atau sudah dinonaktifkan. Silakan muat ulang halaman.",
    };
  }

  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const draftItems = [];

  for (const item of items) {
    const service = serviceMap.get(item.serviceId);
    const isKg = service.priceUnit === PRICE_UNITS.KG;
    const quantity = isKg ? null : item.quantity;

    if (!isKg && (!Number.isInteger(quantity) || quantity < 1)) {
      return {
        ok: false,
        message: `Jumlah item untuk layanan "${service.name}" wajib diisi minimal 1.`,
      };
    }

    draftItems.push({
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      priceSnapshot: service.price,
      priceUnitSnapshot: service.priceUnit,
      quantity,
      weight: null,
    });
  }

  const totals = calculateOrderTotals(draftItems, 0);

  const orderData = {
    customerId,
    status: ORDER_STATUS.PENDING,
    weight: totals.weight ? totals.weight.toFixed(2) : null,
    subtotal: totals.subtotal.toFixed(2),
    additionalCost: totals.additionalCost.toFixed(2),
    totalPrice: totals.totalPrice.toFixed(2),
    customerNotes: customerNotes || null,
  };

  const itemsCreate = totals.items.map((item) => ({
    serviceId: item.serviceId,
    serviceNameSnapshot: item.serviceNameSnapshot,
    priceSnapshot: new Decimal(item.priceSnapshot).toFixed(2),
    priceUnitSnapshot: item.priceUnitSnapshot,
    quantity: item.quantity,
    weight: null,
    subtotal: item.subtotal.toFixed(2),
  }));

  let created = null;
  let lastError = null;

  // Nomor pesanan wajib unik. Bila terjadi tabrakan (sangat jarang),
  // transaksi diulang dengan nomor baru.
  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            ...orderData,
            orderNumber: generateOrderNumber(),
            items: { create: itemsCreate },
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            oldStatus: null,
            newStatus: ORDER_STATUS.PENDING,
            changedByUserId: customerId,
            notes: "Pesanan dibuat oleh pelanggan.",
          },
        });

        // Satu pembayaran aktif per pesanan dibuat bersamaan dengan pesanan.
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: order.totalPrice,
            status: PAYMENT_STATUS.UNPAID,
          },
        });

        return order;
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < 4) {
        lastError = error;
        continue;
      }
      console.error("[pesanan] gagal membuat pesanan:", error?.message || error);
      return {
        ok: false,
        message: "Gagal menyimpan pesanan. Silakan coba lagi.",
      };
    }
  }

  if (!created) {
    console.error("[pesanan] nomor pesanan tidak unik:", lastError?.message);
    return {
      ok: false,
      message: "Gagal membuat nomor pesanan. Silakan coba lagi.",
    };
  }

  // Notifikasi dikirim SETELAH transaksi commit. Kegagalan WhatsApp tidak
  // mempengaruhi pesanan yang sudah tersimpan.
  await notifyOrderEvent("ORDER_CREATED", created.id);

  return { ok: true, order: created };
}

// ------------------------------------------------------------------
// Pembaruan status
// ------------------------------------------------------------------

/**
 * Mengubah status pesanan dengan validasi transisi dan pencatatan riwayat.
 * Notifikasi hanya dikirim bila status benar-benar berubah.
 */
export async function updateOrderStatus({
  orderId,
  status: newStatus,
  actorUserId,
  notes = null,
  force = false,
}) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  if (order.status === newStatus) {
    // Tidak ada perubahan status => tidak ada event baru, tidak ada notifikasi.
    return {
      ok: true,
      changed: false,
      order,
      message: `Status pesanan masih "${
        ORDER_STATUS_LABELS[newStatus] || newStatus
      }". Tidak ada notifikasi yang dikirim.`,
    };
  }

  const transition = canTransition(order.status, newStatus, { force });
  if (!transition.ok) {
    return { ok: false, message: transition.message };
  }

  const historyNotes = transition.isCorrection
    ? `[KOREKSI ADMIN] ${notes || "Perubahan status di luar alur normal."}`
    : notes || null;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        completedAt:
          newStatus === ORDER_STATUS.COMPLETED ? new Date() : null,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        oldStatus: order.status,
        newStatus,
        changedByUserId: actorUserId,
        notes: historyNotes,
      },
    });

    return next;
  });

  const eventKey = ORDER_STATUS_EVENT_MAP[newStatus];
  if (eventKey) {
    await notifyOrderEvent(eventKey, orderId);
  }

  return {
    ok: true,
    changed: true,
    order: updated,
    isCorrection: transition.isCorrection,
    message: `Status pesanan diubah menjadi "${
      ORDER_STATUS_LABELS[newStatus] || newStatus
    }".`,
  };
}

// ------------------------------------------------------------------
// Pembaruan berat aktual, jumlah item, dan biaya tambahan
// ------------------------------------------------------------------

/**
 * Memperbarui rincian pesanan (berat aktual / jumlah item / biaya tambahan /
 * catatan admin) lalu menghitung ulang seluruh nilai uang di server.
 */
export async function updateOrderDetails({
  orderId,
  items = [],
  additionalCost = 0,
  adminNotes = null,
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }
  if (order.status === ORDER_STATUS.CANCELLED) {
    return {
      ok: false,
      message: "Pesanan yang dibatalkan tidak dapat diubah rinciannya.",
    };
  }

  const itemMap = new Map(order.items.map((item) => [item.id, item]));
  for (const input of items) {
    if (!itemMap.has(input.id)) {
      return { ok: false, message: "Terdapat item pesanan yang tidak dikenal." };
    }
  }

  const mergedItems = order.items.map((item) => {
    const input = items.find((candidate) => candidate.id === item.id);
    if (!input) return item;
    if (item.priceUnitSnapshot === PRICE_UNITS.KG) {
      return { ...item, weight: input.weight ?? null };
    }
    return { ...item, quantity: input.quantity ?? null };
  });

  const totals = calculateOrderTotals(mergedItems, additionalCost);

  const updated = await prisma.$transaction(async (tx) => {
    await Promise.all(
      totals.items.map((item) =>
        tx.orderItem.update({
          where: { id: item.id },
          data: {
            weight: item.weight ?? null,
            quantity: item.quantity ?? null,
            subtotal: item.subtotal.toFixed(2),
          },
        }),
      ),
    );

    const next = await tx.order.update({
      where: { id: orderId },
      data: {
        subtotal: totals.subtotal.toFixed(2),
        additionalCost: totals.additionalCost.toFixed(2),
        totalPrice: totals.totalPrice.toFixed(2),
        weight: totals.weight ? totals.weight.toFixed(2) : null,
        adminNotes: adminNotes || null,
      },
    });

    // Selama pembayaran belum lunas, nilai tagihan disinkronkan.
    // Pembayaran yang sudah PAID menyimpan nilai historisnya.
    await tx.payment.updateMany({
      where: { orderId, status: { not: PAYMENT_STATUS.PAID } },
      data: { amount: totals.totalPrice.toFixed(2) },
    });

    return next;
  });

  return {
    ok: true,
    order: updated,
    totals,
    message: "Rincian pesanan berhasil diperbarui.",
  };
}

// ------------------------------------------------------------------
// Pengambilan data
// ------------------------------------------------------------------

export async function listCustomerOrders(customerId, { page, pageSize } = {}) {
  const pagination = normalizePagination({ page, pageSize });
  const where = { customerId };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderListInclude,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}

/** Detail pesanan untuk pelanggan — WAJIB cocok dengan pemiliknya. */
export async function getCustomerOrderDetail(customerId, orderId) {
  return prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: orderDetailInclude,
  });
}

export async function listAdminOrders(query = {}) {
  const pagination = normalizePagination(query);
  const where = buildOrderListWhere(query);

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderListInclude,
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}

export async function getAdminOrderDetail(orderId) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: orderDetailInclude,
  });
}
