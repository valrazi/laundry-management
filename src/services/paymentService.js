/**
 * Aturan bisnis pembayaran (transfer manual).
 *
 * Keputusan penting:
 * - Satu pembayaran aktif per pesanan (`Payment.orderId` unik).
 * - Mengunggah bukti transfer TIDAK berarti pembayaran lunas.
 * - Keputusan admin dicatat pada `PaymentReview` sehingga riwayat verifikasi
 *   tetap ada walau pelanggan mengunggah ulang bukti yang ditolak.
 * - Verifikasi pembayaran tidak mengubah status pesanan secara otomatis.
 */

import prisma from "@/lib/prisma";
import { ORDER_STATUS, PAYMENT_REVIEW_ACTION, PAYMENT_STATUS } from "@/lib/constants";
import {
  bufferFromUploadedFile,
  deleteReceiptFile,
  saveReceiptBuffer,
} from "@/lib/uploads";

import { notifyPaymentEvent } from "./notificationService";

const paymentListInclude = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalPrice: true,
      createdAt: true,
      customer: { select: { id: true, name: true, email: true, phone: true } },
    },
  },
};

/** Memastikan setiap pesanan memiliki satu baris pembayaran. */
export async function ensurePaymentRecord(order) {
  if (order.payment) return order.payment;
  return prisma.payment.create({
    data: {
      orderId: order.id,
      amount: order.totalPrice,
      status: PAYMENT_STATUS.UNPAID,
    },
  });
}

/**
 * Menyimpan bukti transfer dari pelanggan.
 * Hanya pemilik pesanan yang dapat mengunggah.
 */
export async function submitPaymentReceipt({ orderId, customerId, file }) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: { payment: true },
  });

  if (!order) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    return {
      ok: false,
      message: "Pesanan sudah dibatalkan sehingga tidak dapat dibayar.",
    };
  }

  const payment = await ensurePaymentRecord(order);

  if (payment.status === PAYMENT_STATUS.PAID) {
    return {
      ok: false,
      message: "Pembayaran pesanan ini sudah diverifikasi sebagai lunas.",
    };
  }

  if (payment.status === PAYMENT_STATUS.WAITING_VERIFICATION) {
    return {
      ok: false,
      message:
        "Bukti transfer sudah diunggah dan sedang menunggu verifikasi admin.",
    };
  }

  const { buffer, declaredMimeType, originalName } =
    await bufferFromUploadedFile(file);

  const saved = await saveReceiptBuffer({
    buffer,
    declaredMimeType,
    originalName,
  });
  if (!saved.ok) {
    return { ok: false, message: saved.message };
  }

  const previousPath = payment.proofFilePath;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.payment.update({
      where: { id: payment.id },
      data: {
        proofFilePath: saved.storedPath,
        proofOriginalName: saved.originalName,
        proofMimeType: saved.mimeType,
        proofSize: saved.size,
        proofUploadedAt: new Date(),
        status: PAYMENT_STATUS.WAITING_VERIFICATION,
        rejectionReason: null,
        verifiedByUserId: null,
        verifiedAt: null,
        amount: order.totalPrice,
      },
    });

    // Catat pengajuan ulang bukti sebagai audit sederhana.
    await tx.paymentReview.create({
      data: {
        paymentId: payment.id,
        action: PAYMENT_REVIEW_ACTION.SUBMITTED,
        reason: "Bukti transfer diunggah pelanggan.",
        amount: order.totalPrice,
        reviewedByUserId: customerId,
      },
    });

    return next;
  });

  // Bersihkan file lama yang sudah tidak dipakai.
  if (previousPath && previousPath !== saved.storedPath) {
    await deleteReceiptFile(previousPath);
  }

  return {
    ok: true,
    payment: updated,
    message:
      "Bukti transfer berhasil diunggah. Pembayaran sekarang menunggu verifikasi admin.",
  };
}

/** Admin memverifikasi pembayaran. */
export async function verifyPayment({ paymentId, adminUserId }) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return { ok: false, message: "Data pembayaran tidak ditemukan." };
  }
  if (!payment.proofFilePath) {
    return { ok: false, message: "Belum ada bukti transfer yang diunggah." };
  }
  if (payment.status === PAYMENT_STATUS.PAID) {
    return { ok: false, message: "Pembayaran ini sudah diverifikasi." };
  }
  if (payment.status !== PAYMENT_STATUS.WAITING_VERIFICATION) {
    return {
      ok: false,
      message: "Pembayaran ini belum diajukan untuk verifikasi.",
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PAYMENT_STATUS.PAID,
        verifiedByUserId: adminUserId,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });

    await tx.paymentReview.create({
      data: {
        paymentId,
        action: PAYMENT_REVIEW_ACTION.VERIFIED,
        amount: payment.amount,
        reviewedByUserId: adminUserId,
      },
    });

    return next;
  });

  await notifyPaymentEvent("PAYMENT_PAID", paymentId);

  return {
    ok: true,
    payment: updated,
    message: "Pembayaran berhasil diverifikasi sebagai lunas.",
  };
}

/** Admin menolak pembayaran disertai alasan. */
export async function rejectPayment({ paymentId, adminUserId, reason }) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return { ok: false, message: "Data pembayaran tidak ditemukan." };
  }
  if (payment.status === PAYMENT_STATUS.PAID) {
    return {
      ok: false,
      message: "Pembayaran yang sudah lunas tidak dapat ditolak.",
    };
  }
  if (payment.status !== PAYMENT_STATUS.WAITING_VERIFICATION) {
    return {
      ok: false,
      message: "Pembayaran ini belum diajukan untuk verifikasi.",
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PAYMENT_STATUS.REJECTED,
        rejectionReason: reason,
        verifiedByUserId: adminUserId,
        verifiedAt: new Date(),
      },
    });

    await tx.paymentReview.create({
      data: {
        paymentId,
        action: PAYMENT_REVIEW_ACTION.REJECTED,
        reason,
        amount: payment.amount,
        reviewedByUserId: adminUserId,
      },
    });

    return next;
  });

  await notifyPaymentEvent("PAYMENT_REJECTED", paymentId);

  return {
    ok: true,
    payment: updated,
    message: "Pembayaran ditolak. Pelanggan dapat mengunggah ulang bukti transfer.",
  };
}

// ------------------------------------------------------------------
// Query
// ------------------------------------------------------------------

export function buildPaymentListWhere({
  q = "",
  paymentStatus = "",
  onlyPending = false,
} = {}) {
  const where = {};

  if (onlyPending) {
    where.status = PAYMENT_STATUS.WAITING_VERIFICATION;
  } else if (paymentStatus) {
    where.status = paymentStatus;
  }

  if (q) {
    where.order = {
      is: {
        OR: [
          { orderNumber: { contains: q } },
          { customer: { is: { name: { contains: q } } } },
          { customer: { is: { email: { contains: q } } } },
        ],
      },
    };
  }

  return where;
}

export async function listPayments({ page = 1, pageSize = 10, ...query } = {}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(Math.floor(pageSize), 1), 100)
    : 10;

  const where = buildPaymentListWhere(query);

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: paymentListInclude,
      orderBy: { updatedAt: "desc" },
      skip: (safePage - 1) * safeSize,
      take: safeSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items,
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
}

export async function getPaymentDetail(paymentId) {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: {
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: true,
        },
      },
      verifiedBy: { select: { id: true, name: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { reviewedBy: { select: { id: true, name: true, role: true } } },
      },
      notificationLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

/**
 * Memeriksa apakah seorang user boleh melihat file bukti transfer.
 * Hanya admin atau pemilik pesanan.
 */
export async function canAccessReceipt(user, payment) {
  if (!user || !payment) return false;
  if (user.role === "ADMIN") return true;
  return payment.order?.customerId === user.id;
}
