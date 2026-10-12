import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ORDER_STATUS, PAYMENT_STATUS, PRICE_UNITS, ROLES } from "@/lib/constants";
import prisma from "@/lib/prisma";
import {
  calculateOrderTotals,
  createOrder,
  getAdminOrderDetail,
  getCustomerOrderDetail,
  listAdminOrders,
  updateOrderDetails,
  updateOrderStatus,
} from "@/services/orderService";

import {
  createCustomerWithPassword,
  createService,
  createTemplate,
  createUser,
  enableWhatsApp,
  resetDatabase,
} from "./helpers";

let customerA;
let customerB;
let admin;
let kgService;
let itemService;

beforeAll(async () => {
  await resetDatabase();

  customerA = (
    await createCustomerWithPassword({ email: "pelanggan-a@test.test" })
  ).user;
  customerB = (
    await createCustomerWithPassword({ email: "pelanggan-b@test.test" })
  ).user;
  admin = await createUser({
    role: ROLES.ADMIN,
    email: "admin-uji@test.test",
  });

  kgService = await createService({
    name: "Cuci Kering Uji",
    price: "7000.00",
    priceUnit: PRICE_UNITS.KG,
  });
  itemService = await createService({
    name: "Cuci Sepatu Uji",
    price: "25000.00",
    priceUnit: PRICE_UNITS.ITEM,
  });

  await enableWhatsApp();
  await createTemplate({ eventKey: "ORDER_CREATED" });
  await createTemplate({ eventKey: "ORDER_CONFIRMED" });
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createItemOrder(customer = customerA) {
  const result = await createOrder({
    customerId: customer.id,
    items: [{ serviceId: itemService.id, quantity: 2 }],
    customerNotes: "Uji pesanan",
  });
  expect(result.ok).toBe(true);
  return result.order;
}

describe("createOrder", () => {
  it("membuat pesanan, item, riwayat status awal, dan pembayaran dalam satu transaksi", async () => {
    const order = await createItemOrder();

    expect(order.status).toBe(ORDER_STATUS.PENDING);
    expect(order.orderNumber).toMatch(/^LDR-\d{8}-[A-Z2-9]{5}$/);
    expect(order.subtotal.toString()).toBe("50000");
    expect(order.totalPrice.toString()).toBe("50000");

    const detail = await getAdminOrderDetail(order.id);
    expect(detail.items).toHaveLength(1);
    expect(detail.statusHistory).toHaveLength(1);
    expect(detail.statusHistory[0].oldStatus).toBeNull();
    expect(detail.statusHistory[0].newStatus).toBe(ORDER_STATUS.PENDING);
    expect(detail.statusHistory[0].changedByUserId).toBe(customerA.id);
    expect(detail.payment.status).toBe(PAYMENT_STATUS.UNPAID);
    expect(detail.payment.amount.toString()).toBe("50000");
  });

  it("menyimpan snapshot nama, harga, dan satuan layanan dari database", async () => {
    const order = await createItemOrder();
    const detail = await getAdminOrderDetail(order.id);
    const item = detail.items[0];

    expect(item.serviceNameSnapshot).toBe("Cuci Sepatu Uji");
    expect(item.priceSnapshot.toString()).toBe("25000");
    expect(item.priceUnitSnapshot).toBe(PRICE_UNITS.ITEM);
    expect(item.serviceId).toBe(itemService.id);
  });

  it("tidak memakai harga yang dikirim dari klien", async () => {
    // Klien hanya boleh mengirim serviceId + quantity.
    const result = await createOrder({
      customerId: customerA.id,
      items: [
        {
          serviceId: itemService.id,
          quantity: 1,
          price: 1,
          priceSnapshot: "1.00",
          subtotal: "1.00",
        },
      ],
    });

    expect(result.ok).toBe(true);
    const detail = await getAdminOrderDetail(result.order.id);
    expect(detail.items[0].priceSnapshot.toString()).toBe("25000");
    expect(result.order.totalPrice.toString()).toBe("25000");
  });

  it("layanan KG tanpa berat menghasilkan berat null dan subtotal 0", async () => {
    const result = await createOrder({
      customerId: customerA.id,
      items: [{ serviceId: kgService.id, quantity: null }],
    });

    expect(result.ok).toBe(true);
    expect(result.order.weight).toBeNull();
    expect(result.order.subtotal.toString()).toBe("0");
  });

  it("menolak layanan yang tidak aktif", async () => {
    const inactive = await createService({
      name: "Layanan Nonaktif",
      isActive: false,
    });
    const result = await createOrder({
      customerId: customerA.id,
      items: [{ serviceId: inactive.id, quantity: 1 }],
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/tidak tersedia|dinonaktifkan/i);
  });

  it("menolak layanan ITEM tanpa jumlah item", async () => {
    const result = await createOrder({
      customerId: customerA.id,
      items: [{ serviceId: itemService.id, quantity: null }],
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Jumlah item/i);
  });

  it("membuat beberapa pesanan dengan nomor unik", async () => {
    const first = await createItemOrder();
    const second = await createItemOrder();
    expect(first.orderNumber).not.toBe(second.orderNumber);
  });
});

describe("kepemilikan pesanan", () => {
  it("pelanggan hanya dapat melihat pesanannya sendiri", async () => {
    const order = await createItemOrder(customerA);

    expect(await getCustomerOrderDetail(customerA.id, order.id)).not.toBeNull();
    expect(await getCustomerOrderDetail(customerB.id, order.id)).toBeNull();
  });

  it("daftar pesanan pelanggan tidak memuat pesanan pelanggan lain", async () => {
    const otherOrder = await createItemOrder(customerB);
    const list = await listAdminOrders({ q: "" });
    expect(list.total).toBeGreaterThan(0);

    const detail = await getCustomerOrderDetail(customerA.id, otherOrder.id);
    expect(detail).toBeNull();
  });
});

describe("updateOrderStatus", () => {
  it("mencatat riwayat dan memicu notifikasi pada perubahan valid", async () => {
    const order = await createItemOrder();
    const before = await prisma.notificationLog.count({
      where: { orderId: order.id, eventKey: "ORDER_CONFIRMED" },
    });

    const result = await updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.CONFIRMED,
      actorUserId: admin.id,
      notes: "Stok mesin tersedia",
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);

    const detail = await getAdminOrderDetail(order.id);
    expect(detail.status).toBe(ORDER_STATUS.CONFIRMED);
    const history = detail.statusHistory.at(-1);
    expect(history.oldStatus).toBe(ORDER_STATUS.PENDING);
    expect(history.newStatus).toBe(ORDER_STATUS.CONFIRMED);
    expect(history.changedByUserId).toBe(admin.id);
    expect(history.notes).toBe("Stok mesin tersedia");

    const after = await prisma.notificationLog.count({
      where: { orderId: order.id, eventKey: "ORDER_CONFIRMED" },
    });
    expect(after).toBe(before + 1);
  });

  it("tidak membuat riwayat atau notifikasi baru bila status tidak berubah", async () => {
    const order = await createItemOrder();
    await updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.CONFIRMED,
      actorUserId: admin.id,
    });

    const historyBefore = await prisma.orderStatusHistory.count({
      where: { orderId: order.id },
    });
    const logsBefore = await prisma.notificationLog.count({
      where: { orderId: order.id },
    });

    const result = await updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.CONFIRMED,
      actorUserId: admin.id,
      notes: "Hanya mengedit catatan",
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(false);

    const historyAfter = await prisma.orderStatusHistory.count({
      where: { orderId: order.id },
    });
    const logsAfter = await prisma.notificationLog.count({
      where: { orderId: order.id },
    });

    expect(historyAfter).toBe(historyBefore);
    expect(logsAfter).toBe(logsBefore);
  });

  it("menolak transisi yang tidak valid", async () => {
    const order = await createItemOrder();
    const result = await updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.COMPLETED,
      actorUserId: admin.id,
    });

    expect(result.ok).toBe(false);
    const detail = await getAdminOrderDetail(order.id);
    expect(detail.status).toBe(ORDER_STATUS.PENDING);
  });

  it("menolak perubahan status dari status terminal", async () => {
    const order = await createItemOrder();
    await updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.CANCELLED,
      actorUserId: admin.id,
    });

    const result = await updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.PROCESSING,
      actorUserId: admin.id,
    });
    expect(result.ok).toBe(false);
  });

  it("mengizinkan koreksi admin yang dicatat sebagai koreksi", async () => {
    const order = await createItemOrder();
    await updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.CANCELLED,
      actorUserId: admin.id,
    });

    const result = await updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.PROCESSING,
      actorUserId: admin.id,
      notes: "Pelanggan membatalkan pembatalan",
      force: true,
    });

    expect(result.ok).toBe(true);
    expect(result.isCorrection).toBe(true);

    const detail = await getAdminOrderDetail(order.id);
    expect(detail.statusHistory.at(-1).notes).toMatch(/^\[KOREKSI ADMIN\]/);
  });

  it("mengisi completedAt ketika pesanan diselesaikan", async () => {
    const order = await createItemOrder();
    for (const status of [
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PROCESSING,
      ORDER_STATUS.READY_FOR_PICKUP,
      ORDER_STATUS.COMPLETED,
    ]) {
      await updateOrderStatus({
        orderId: order.id,
        status,
        actorUserId: admin.id,
      });
    }

    const detail = await getAdminOrderDetail(order.id);
    expect(detail.status).toBe(ORDER_STATUS.COMPLETED);
    expect(detail.completedAt).not.toBeNull();
  });
});

describe("updateOrderDetails", () => {
  it("menghitung ulang subtotal, total, dan berat dari berat aktual", async () => {
    const result = await createOrder({
      customerId: customerA.id,
      items: [
        { serviceId: kgService.id, quantity: null },
        { serviceId: itemService.id, quantity: 1 },
      ],
    });
    const order = result.order;

    const detail = await getAdminOrderDetail(order.id);
    const kgItem = detail.items.find(
      (item) => item.priceUnitSnapshot === PRICE_UNITS.KG,
    );

    const updated = await updateOrderDetails({
      orderId: order.id,
      additionalCost: "5000",
      adminNotes: "Sudah ditimbang",
      items: [{ id: kgItem.id, weight: "3.50", quantity: null }],
    });

    expect(updated.ok).toBe(true);

    const after = await getAdminOrderDetail(order.id);
    // 3.5 kg x 7000 = 24500, ditambah 1 item x 25000 = 25000 -> 49500
    expect(after.subtotal.toString()).toBe("49500");
    expect(after.additionalCost.toString()).toBe("5000");
    expect(after.totalPrice.toString()).toBe("54500");
    expect(after.weight.toString()).toBe("3.5");
    expect(after.payment.amount.toString()).toBe("54500");
  });

  it("tidak mengubah nilai pembayaran yang sudah lunas", async () => {
    const order = await createItemOrder();

    await prisma.payment.update({
      where: { orderId: order.id },
      data: { status: PAYMENT_STATUS.PAID, amount: "50000" },
    });

    const detail = await getAdminOrderDetail(order.id);
    await updateOrderDetails({
      orderId: order.id,
      additionalCost: "1000",
      adminNotes: null,
      items: [{ id: detail.items[0].id, quantity: 5, weight: null }],
    });

    const after = await getAdminOrderDetail(order.id);
    // 5 item x 25000 = 125000, ditambah biaya tambahan 1000 = 126000
    expect(after.totalPrice.toString()).toBe("126000");
    // Nilai pembayaran yang sudah lunas tidak ikut berubah (nilai historis).
    expect(after.payment.amount.toString()).toBe("50000");
  });

  it("menolak memperbarui rincian pesanan yang dibatalkan", async () => {
    const order = await createItemOrder();
    await updateOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.CANCELLED,
      actorUserId: admin.id,
    });

    const detail = await getAdminOrderDetail(order.id);
    const result = await updateOrderDetails({
      orderId: order.id,
      additionalCost: "0",
      adminNotes: null,
      items: [{ id: detail.items[0].id, quantity: 3, weight: null }],
    });

    expect(result.ok).toBe(false);
  });
});

describe("perhitungan harga dan data pesanan", () => {
  it("calculateOrderTotals menghasilkan nilai yang sama dengan data tersimpan", async () => {
    const totals = calculateOrderTotals(
      [
        {
          priceUnitSnapshot: PRICE_UNITS.KG,
          priceSnapshot: "7000.00",
          weight: "3.50",
        },
        {
          priceUnitSnapshot: PRICE_UNITS.ITEM,
          priceSnapshot: "25000.00",
          quantity: 2,
        },
      ],
      "0",
    );
    expect(totals.totalPrice.toString()).toBe("74500");
  });
});
