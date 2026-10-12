/**
 * Pengiriman notifikasi WhatsApp berbasis event.
 *
 * Aturan penting (PRD §9.3, AGENTS.md §11):
 * - Notifikasi hanya dikirim ketika event benar-benar terjadi.
 * - Pengiriman selalu dilakukan SETELAH transaksi database commit.
 * - Kegagalan Fonnte tidak pernah membatalkan transaksi utama; fungsi ini
 *   tidak melemparkan error ke pemanggil.
 */

import prisma from "@/lib/prisma";
import { ORDER_STATUS_LABELS, PRICE_UNITS } from "@/lib/constants";
import { formatCurrency, formatWeight } from "@/lib/format";
import { isWhatsAppEnabled } from "@/lib/settings";
import { isDryRun, sendWhatsAppMessage } from "@/lib/fonnte";

import { renderTemplate } from "./templateEngine";

/** Base URL aplikasi dari environment — tidak pernah di-hardcode. */
export function getAppUrl() {
  return (process.env.APP_URL || "").trim().replace(/\/+$/, "");
}

/** Link detail pesanan. Halaman tetap memerlukan autentikasi. */
export function buildOrderUrl(orderId) {
  const base = getAppUrl();
  if (!base) return "";
  return `${base}/customer/orders/${orderId}`;
}

/** Menyusun nilai variabel template dari data pesanan. */
export function buildOrderNotificationVariables(order) {
  const items = order.items || [];
  const hasKgService = items.some(
    (item) => item.priceUnitSnapshot === PRICE_UNITS.KG,
  );

  let weightText = "-";
  if (order.weight !== null && order.weight !== undefined) {
    weightText = formatWeight(order.weight);
  } else if (hasKgService) {
    weightText = "belum ditimbang";
  }

  return {
    customerName: order.customer?.name ?? "-",
    orderNumber: order.orderNumber,
    orderStatus: ORDER_STATUS_LABELS[order.status] ?? order.status,
    serviceName: items.map((item) => item.serviceNameSnapshot).join(", ") || "-",
    weight: weightText,
    totalPrice: formatCurrency(order.totalPrice),
    orderUrl: buildOrderUrl(order.id),
  };
}

/**
 * Menyimpan log percobaan notifikasi lalu memanggil provider.
 * Status awal PENDING, lalu diperbarui menjadi SENT atau FAILED.
 */
async function dispatchNotification({
  eventKey,
  recipientPhone,
  message,
  orderId = null,
  paymentId = null,
  attempt = 1,
}) {
  const dryRun = isDryRun();

  const log = await prisma.notificationLog.create({
    data: {
      orderId,
      paymentId,
      recipientPhone,
      eventKey,
      messageSnapshot: message,
      status: "PENDING",
      isDryRun: dryRun,
      attempt,
    },
  });

  const result = await sendWhatsAppMessage({
    target: recipientPhone,
    message,
  });

  return prisma.notificationLog.update({
    where: { id: log.id },
    data: {
      status: result.ok ? "SENT" : "FAILED",
      providerResponse: result.providerResponse ?? null,
      errorMessage: result.ok
        ? null
        : result.errorMessage || "Pengiriman gagal.",
      sentAt: result.ok ? new Date() : null,
      isDryRun: result.dryRun,
    },
  });
}

async function resolveTemplate(eventKey) {
  const template = await prisma.notificationTemplate.findUnique({
    where: { eventKey },
  });
  if (!template) {
    return { ok: false, reason: "Template notifikasi belum tersedia." };
  }
  if (!template.isActive) {
    return { ok: false, reason: "Template notifikasi sedang dinonaktifkan." };
  }
  return { ok: true, template };
}

/**
 * Mengirim notifikasi untuk sebuah event pesanan.
 * @param {string} eventKey contoh: "ORDER_CREATED", "ORDER_PROCESSING"
 * @param {string} orderId
 */
export async function notifyOrderEvent(eventKey, orderId) {
  try {
    if (!(await isWhatsAppEnabled())) {
      return { sent: false, skipped: true, reason: "Integrasi WhatsApp nonaktif." };
    }

    const templateResult = await resolveTemplate(eventKey);
    if (!templateResult.ok) {
      return { sent: false, skipped: true, reason: templateResult.reason };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: true },
    });
    if (!order) {
      return { sent: false, skipped: true, reason: "Pesanan tidak ditemukan." };
    }

    const message = renderTemplate(
      templateResult.template.message,
      buildOrderNotificationVariables(order),
    );

    const log = await dispatchNotification({
      eventKey,
      recipientPhone: order.customer.phone,
      message,
      orderId: order.id,
    });

    return { sent: log.status === "SENT", skipped: false, log };
  } catch (error) {
    console.error(
      `[notifikasi] gagal memproses event ${eventKey}:`,
      error?.message || error,
    );
    return { sent: false, skipped: false, reason: "Terjadi kesalahan internal." };
  }
}

/**
 * Mengirim notifikasi terkait pembayaran (PAYMENT_PAID / PAYMENT_REJECTED).
 */
export async function notifyPaymentEvent(eventKey, paymentId) {
  try {
    if (!(await isWhatsAppEnabled())) {
      return { sent: false, skipped: true, reason: "Integrasi WhatsApp nonaktif." };
    }

    const templateResult = await resolveTemplate(eventKey);
    if (!templateResult.ok) {
      return { sent: false, skipped: true, reason: templateResult.reason };
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: { include: { customer: true, items: true } },
      },
    });
    if (!payment || !payment.order) {
      return { sent: false, skipped: true, reason: "Pembayaran tidak ditemukan." };
    }

    const message = renderTemplate(
      templateResult.template.message,
      buildOrderNotificationVariables(payment.order),
    );

    const log = await dispatchNotification({
      eventKey,
      recipientPhone: payment.order.customer.phone,
      message,
      orderId: payment.order.id,
      paymentId: payment.id,
    });

    return { sent: log.status === "SENT", skipped: false, log };
  } catch (error) {
    console.error(
      `[notifikasi] gagal memproses event ${eventKey}:`,
      error?.message || error,
    );
    return { sent: false, skipped: false, reason: "Terjadi kesalahan internal." };
  }
}

/**
 * Pengiriman ulang manual oleh admin.
 * Memakai kembali penerima dan snapshot pesan asli, lalu mencatat
 * percobaan baru sebagai baris log terpisah.
 */
export async function retryNotificationLog(logId) {
  const original = await prisma.notificationLog.findUnique({
    where: { id: logId },
  });
  if (!original) {
    return { ok: false, message: "Log notifikasi tidak ditemukan." };
  }
  if (original.status === "SENT") {
    return {
      ok: false,
      message: "Notifikasi ini sudah berstatus terkirim, tidak dikirim ulang.",
    };
  }

  try {
    const result = await sendWhatsAppMessage({
      target: original.recipientPhone,
      message: original.messageSnapshot,
    });

    const log = await prisma.notificationLog.create({
      data: {
        orderId: original.orderId,
        paymentId: original.paymentId,
        recipientPhone: original.recipientPhone,
        eventKey: original.eventKey,
        messageSnapshot: original.messageSnapshot,
        status: result.ok ? "SENT" : "FAILED",
        providerResponse: result.providerResponse ?? null,
        errorMessage: result.ok
          ? null
          : result.errorMessage || "Pengiriman gagal.",
        sentAt: result.ok ? new Date() : null,
        isDryRun: result.dryRun,
        attempt: original.attempt + 1,
      },
    });

    return {
      ok: result.ok,
      message: result.ok
        ? result.dryRun
          ? "Simulasi pengiriman ulang berhasil dicatat (mode dry-run)."
          : "Notifikasi berhasil dikirim ulang."
        : result.errorMessage || "Pengiriman ulang gagal.",
      log,
    };
  } catch (error) {
    console.error("[notifikasi] gagal mengirim ulang:", error?.message || error);
    return { ok: false, message: "Gagal mengirim ulang notifikasi." };
  }
}
