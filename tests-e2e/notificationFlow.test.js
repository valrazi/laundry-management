/**
 * UJI END-TO-END MANUAL — Alur pesanan yang memicu notifikasi WhatsApp.
 *
 * PENTING:
 * - Memakai database DEVELOPMENT (.env → DATABASE_URL).
 * - Memakai FONNTE_TOKEN ASLI dan MENGIRIM PESAN WHATSAPP SUNGGUHAN
 *   ke nomor pelanggan uji, sesuai persetujuan pengguna.
 * - Data pesanan uji TIDAK dihapus agar dapat diperiksa pada halaman admin.
 *
 * Jalankan: npx vitest run --config vitest.e2e.config.mjs --reporter=verbose
 */

import { afterAll, describe, expect, it } from "vitest";

import prisma from "@/lib/prisma";
import { ORDER_STATUS, PRICE_UNITS } from "@/lib/constants";
import { getFonnteConfig } from "@/lib/fonnte";
import {
  createOrder,
  updateOrderDetails,
  updateOrderStatus,
} from "@/services/orderService";

const CUSTOMER_ID = "cmv4mmeyc0001ftyw68d8wy8j"; // Budi Santoso (nomor uji)
const ADMIN_ID = "cmv4mmew60000ftywjy1w8ljx"; // Admin Laundry
const NOTE_TAG = "[UJI NOTIFIKASI]";

const state = {
  orderA: null, // pesanan utama: KG + ITEM, sampai COMPLETED
  orderB: null, // pesanan kedua: dibatalkan
  results: [],
};

/** Log notifikasi terbaru untuk kombinasi event + pesanan. */
function latestLog(eventKey, orderId) {
  return prisma.notificationLog.findFirst({
    where: { eventKey, orderId },
    orderBy: { createdAt: "desc" },
  });
}

/** Memeriksa satu log notifikasi benar-benar terkirim (bukan simulasi). */
function expectDelivered(log, eventKey) {
  expect(log, `log ${eventKey} tidak ditemukan`).toBeTruthy();
  expect(log.status, `${eventKey} status=${log.status} err=${log.errorMessage}`).toBe("SENT");
  expect(log.isDryRun, `${eventKey} masih berstatus dry-run`).toBe(false);
  expect(log.errorMessage).toBeNull();
  state.results.push({
    event: eventKey,
    status: log.status,
    target: log.recipientPhone,
    response: log.providerResponse,
    attempt: log.attempt,
  });
  console.log(`   ✓ ${eventKey} → SENT (percobaan ${log.attempt}) | ${log.providerResponse}`);
  console.log(`     Pesan: ${log.messageSnapshot}`);
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Alur pesanan yang memicu notifikasi WhatsApp (Fonnte asli)", () => {
  it("0. Mode kirim asli aktif dan token terkonfigurasi", () => {
    const config = getFonnteConfig();
    console.log(
      `   FONNTE_DRY_RUN=${process.env.FONNTE_DRY_RUN} | token terisi=${config.token.length > 0} | api=${config.apiUrl}`,
    );
    expect(config.dryRun).toBe(false);
    expect(config.token.length).toBeGreaterThan(0);
  });

  it("1. Pesanan dibuat pelanggan → notifikasi ORDER_CREATED", async () => {
    const kg = await prisma.service.findFirst({
      where: { isActive: true, priceUnit: PRICE_UNITS.KG },
      orderBy: { createdAt: "asc" },
    });
    const item = await prisma.service.findFirst({
      where: { isActive: true, priceUnit: PRICE_UNITS.ITEM },
      orderBy: { createdAt: "asc" },
    });
    expect(kg, "layanan KG aktif tidak tersedia").toBeTruthy();
    expect(item, "layanan ITEM aktif tidak tersedia").toBeTruthy();

    const result = await createOrder({
      customerId: CUSTOMER_ID,
      items: [
        { serviceId: kg.id, quantity: null },
        { serviceId: item.id, quantity: 2 },
      ],
      customerNotes: `${NOTE_TAG} pesanan utama (KG + ITEM)`,
    });

    expect(result.ok, result.message).toBe(true);
    state.orderA = result.order;
    console.log(`   Pesanan A dibuat: ${result.order.orderNumber} (${result.order.id})`);

    const log = await latestLog("ORDER_CREATED", result.order.id);
    expectDelivered(log, "ORDER_CREATED");
  });

  it("2. Admin mencatat berat aktual & biaya tambahan (tanpa notifikasi)", async () => {
    const order = await prisma.order.findUnique({
      where: { id: state.orderA.id },
      include: { items: true },
    });

    const itemInputs = order.items.map((orderItem) =>
      orderItem.priceUnitSnapshot === PRICE_UNITS.KG
        ? { id: orderItem.id, weight: 3.5 }
        : { id: orderItem.id, quantity: 2 },
    );

    const before = await prisma.notificationLog.count({
      where: { orderId: state.orderA.id },
    });

    const result = await updateOrderDetails({
      orderId: order.id,
      items: itemInputs,
      additionalCost: 2000,
      adminNotes: `${NOTE_TAG} biaya tambahan antar-jemput`,
    });

    expect(result.ok, result.message).toBe(true);
    expect(Number(result.order.weight)).toBe(3.5);
    console.log(
      `   Berat aktual: ${result.order.weight} kg | Subtotal: ${result.order.subtotal} | Biaya tambahan: ${result.order.additionalCost} | Total: ${result.order.totalPrice}`,
    );

    const after = await prisma.notificationLog.count({
      where: { orderId: state.orderA.id },
    });
    expect(after, "perubahan rincian tidak boleh memicu notifikasi").toBe(before);
  });

  it("3. Transisi PENDING → CONFIRMED → PROCESSING → READY_FOR_PICKUP → COMPLETED", async () => {
    const steps = [
      [ORDER_STATUS.CONFIRMED, "ORDER_CONFIRMED"],
      [ORDER_STATUS.PROCESSING, "ORDER_PROCESSING"],
      [ORDER_STATUS.READY_FOR_PICKUP, "ORDER_READY_FOR_PICKUP"],
      [ORDER_STATUS.COMPLETED, "ORDER_COMPLETED"],
    ];

    for (const [status, eventKey] of steps) {
      const result = await updateOrderStatus({
        orderId: state.orderA.id,
        status,
        actorUserId: ADMIN_ID,
        notes: `${NOTE_TAG} uji transisi`,
      });

      expect(result.ok, result.message).toBe(true);
      expect(result.changed).toBe(true);

      const log = await latestLog(eventKey, state.orderA.id);
      expectDelivered(log, eventKey);
    }

    const finalOrder = await prisma.order.findUnique({
      where: { id: state.orderA.id },
    });
    expect(finalOrder.status).toBe(ORDER_STATUS.COMPLETED);
    expect(finalOrder.completedAt).toBeTruthy();
  });

  it("4. Pesanan kedua dibatalkan → notifikasi ORDER_CANCELLED", async () => {
    const item = await prisma.service.findFirst({
      where: { isActive: true, priceUnit: PRICE_UNITS.ITEM },
      orderBy: { createdAt: "asc" },
    });

    const created = await createOrder({
      customerId: CUSTOMER_ID,
      items: [{ serviceId: item.id, quantity: 1 }],
      customerNotes: `${NOTE_TAG} pesanan untuk uji pembatalan`,
    });
    expect(created.ok, created.message).toBe(true);
    state.orderB = created.order;
    console.log(`   Pesanan B dibuat: ${created.order.orderNumber} (${created.order.id})`);

    const createdLog = await latestLog("ORDER_CREATED", created.order.id);
    expectDelivered(createdLog, "ORDER_CREATED");

    const result = await updateOrderStatus({
      orderId: created.order.id,
      status: ORDER_STATUS.CANCELLED,
      actorUserId: ADMIN_ID,
      notes: `${NOTE_TAG} uji pembatalan`,
    });
    expect(result.ok, result.message).toBe(true);

    const log = await latestLog("ORDER_CANCELLED", created.order.id);
    expectDelivered(log, "ORDER_CANCELLED");
  });

  it("5. Status tidak berubah → tidak ada notifikasi duplikat", async () => {
    const before = await prisma.notificationLog.count({
      where: { orderId: state.orderA.id },
    });

    const result = await updateOrderStatus({
      orderId: state.orderA.id,
      status: ORDER_STATUS.COMPLETED,
      actorUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(false);

    const after = await prisma.notificationLog.count({
      where: { orderId: state.orderA.id },
    });
    expect(after).toBe(before);
    console.log("   ✓ Tidak ada notifikasi duplikat.");
  });

  it("6. Transisi tidak valid ditolak → tidak ada notifikasi", async () => {
    const before = await prisma.notificationLog.count({
      where: { orderId: state.orderA.id },
    });

    // COMPLETED bersifat terminal; CONFIRMED tidak diizinkan tanpa koreksi.
    const result = await updateOrderStatus({
      orderId: state.orderA.id,
      status: ORDER_STATUS.CONFIRMED,
      actorUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("tidak dapat diubah");

    const after = await prisma.notificationLog.count({
      where: { orderId: state.orderA.id },
    });
    expect(after).toBe(before);
    console.log(`   ✓ Ditolak: ${result.message}`);
  });

  it("7. Riwayat status tercatat lengkap", async () => {
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: state.orderA.id },
      orderBy: { createdAt: "asc" },
    });
    const chain = history.map((h) => `${h.oldStatus ?? "-"}→${h.newStatus}`);
    console.log(`   Riwayat pesanan A: ${chain.join(", ")}`);
    expect(chain).toEqual([
      "-→PENDING",
      "PENDING→CONFIRMED",
      "CONFIRMED→PROCESSING",
      "PROCESSING→READY_FOR_PICKUP",
      "READY_FOR_PICKUP→COMPLETED",
    ]);
  });

  it("8. Ringkasan seluruh notifikasi terkirim", async () => {
    const logs = await prisma.notificationLog.findMany({
      where: { orderId: { in: [state.orderA.id, state.orderB.id] } },
      orderBy: { createdAt: "asc" },
    });

    console.log("\n   === RINGKASAN NOTIFIKASI ===");
    for (const log of logs) {
      console.log(
        `   [${log.status}] ${log.eventKey} → ${log.recipientPhone} | attempt=${log.attempt} | ${log.providerResponse}`,
      );
    }

    const failed = logs.filter((log) => log.status !== "SENT");
    expect(failed, `${failed.length} notifikasi gagal terkirim`).toHaveLength(0);
    expect(logs.length).toBe(7);
    console.log(`\n   Total ${logs.length} notifikasi terkirim ke nomor uji.`);
  });
});
