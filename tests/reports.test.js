import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PRICE_UNITS,
  ROLES,
} from "@/lib/constants";
import prisma from "@/lib/prisma";
import { createOrder, updateOrderStatus } from "@/services/orderService";
import {
  getAdminDashboardStats,
  getCustomerDashboardStats,
  getReportData,
  getVerifiedRevenue,
  toCsv,
} from "@/services/reportService";

import {
  createCustomerWithPassword,
  createService,
  createTemplate,
  createUser,
  enableWhatsApp,
  resetDatabase,
} from "./helpers";

let customerOne;
let customerTwo;
let admin;
let service;

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function dateInput(days) {
  return daysAgo(days).toISOString().slice(0, 10);
}

beforeAll(async () => {
  await resetDatabase();

  customerOne = (
    await createCustomerWithPassword({ email: "lap-a@test.test" })
  ).user;
  customerTwo = (
    await createCustomerWithPassword({ email: "lap-b@test.test" })
  ).user;
  admin = await createUser({ role: ROLES.ADMIN, email: "admin-lap@test.test" });

  service = await createService({
    name: "Layanan Laporan",
    price: "25000.00",
    priceUnit: PRICE_UNITS.ITEM,
  });

  await enableWhatsApp();
  await createTemplate({ eventKey: "ORDER_CREATED" });

  // Pesanan lunas 10 hari lalu.
  const paid = await createOrder({
    customerId: customerOne.id,
    items: [{ serviceId: service.id, quantity: 1 }],
  });
  await prisma.order.update({
    where: { id: paid.order.id },
    data: { createdAt: daysAgo(10) },
  });
  await prisma.payment.update({
    where: { orderId: paid.order.id },
    data: {
      status: PAYMENT_STATUS.PAID,
      amount: "25000",
      verifiedAt: daysAgo(9),
    },
  });
  await updateOrderStatus({
    orderId: paid.order.id,
    status: ORDER_STATUS.CONFIRMED,
    actorUserId: admin.id,
  });
  await updateOrderStatus({
    orderId: paid.order.id,
    status: ORDER_STATUS.PROCESSING,
    actorUserId: admin.id,
  });
  await updateOrderStatus({
    orderId: paid.order.id,
    status: ORDER_STATUS.READY_FOR_PICKUP,
    actorUserId: admin.id,
  });
  await updateOrderStatus({
    orderId: paid.order.id,
    status: ORDER_STATUS.COMPLETED,
    actorUserId: admin.id,
  });

  // Pesanan menunggu verifikasi 1 hari lalu.
  const waiting = await createOrder({
    customerId: customerOne.id,
    items: [{ serviceId: service.id, quantity: 2 }],
  });
  await prisma.order.update({
    where: { id: waiting.order.id },
    data: { createdAt: daysAgo(1) },
  });
  await prisma.payment.update({
    where: { orderId: waiting.order.id },
    data: { status: PAYMENT_STATUS.WAITING_VERIFICATION, amount: "50000" },
  });

  // Pesanan belum dibayar hari ini.
  const unpaid = await createOrder({
    customerId: customerTwo.id,
    items: [{ serviceId: service.id, quantity: 3 }],
  });

  // Pesanan dibatalkan hari ini.
  const cancelled = await createOrder({
    customerId: customerTwo.id,
    items: [{ serviceId: service.id, quantity: 1 }],
  });
  await updateOrderStatus({
    orderId: cancelled.order.id,
    status: ORDER_STATUS.CANCELLED,
    actorUserId: admin.id,
  });

  expect(paid.order.id).toBeTruthy();
  expect(waiting.order.id).toBeTruthy();
  expect(unpaid.order.id).toBeTruthy();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getVerifiedRevenue", () => {
  it("hanya menghitung pembayaran berstatus PAID", async () => {
    const revenue = await getVerifiedRevenue();
    expect(revenue.toString()).toBe("25000");
  });

  it("mengikuti rentang tanggal verifikasi", async () => {
    const recent = await getVerifiedRevenue({ from: dateInput(3) });
    expect(recent.toString()).toBe("0");

    const old = await getVerifiedRevenue({
      from: dateInput(15),
      to: dateInput(5),
    });
    expect(old.toString()).toBe("25000");
  });
});

describe("getAdminDashboardStats", () => {
  it("menghitung statistik dari database", async () => {
    const stats = await getAdminDashboardStats();

    expect(stats.totalOrders).toBe(4);
    expect(stats.completedOrders).toBe(1);
    expect(stats.cancelledOrders).toBe(1);
    expect(stats.activeOrders).toBe(2); // 1 waiting + 1 unpaid
    expect(stats.waitingVerification).toBe(1);
    expect(stats.verifiedRevenue.toString()).toBe("25000");
    expect(stats.totalCustomers).toBe(2);
    expect(stats.recentOrders.length).toBeGreaterThan(0);
    expect(stats.recentOrders.length).toBeLessThanOrEqual(5);
  });

  it("tidak pernah mengembalikan passwordHash pelanggan", async () => {
    const stats = await getAdminDashboardStats();
    for (const order of stats.recentOrders) {
      expect(order.customer?.passwordHash).toBeUndefined();
    }
  });
});

describe("getCustomerDashboardStats", () => {
  it("menghitung tagihan belum lunas milik pelanggan tersebut", async () => {
    const stats = await getCustomerDashboardStats(customerOne.id);

    // Pesanan lunas tidak dihitung; pesanan menunggu verifikasi dihitung.
    expect(stats.outstandingAmount.toString()).toBe("50000");
    expect(stats.totalOrders).toBe(2);
    expect(stats.waitingVerification).toBe(1);
  });

  it("tidak memuat pesanan milik pelanggan lain", async () => {
    const stats = await getCustomerDashboardStats(customerTwo.id);
    for (const order of stats.recentOrders) {
      expect(order.customerId ?? customerTwo.id).toBe(customerTwo.id);
    }
    expect(stats.totalOrders).toBe(2);
  });
});

describe("getReportData", () => {
  it("memfilter berdasarkan tanggal", async () => {
    const report = await getReportData({ from: dateInput(3), to: dateInput(0) });
    expect(report.summary.totalOrders).toBe(3);
  });

  it("memfilter berdasarkan status pesanan", async () => {
    const report = await getReportData({ status: ORDER_STATUS.CANCELLED });
    expect(report.summary.totalOrders).toBe(1);
    expect(report.statusBreakdown[ORDER_STATUS.CANCELLED]).toBe(1);
  });

  it("memfilter berdasarkan status pembayaran", async () => {
    const report = await getReportData({
      paymentStatus: PAYMENT_STATUS.WAITING_VERIFICATION,
    });
    expect(report.summary.totalOrders).toBe(1);
    expect(report.rows[0].payment.status).toBe(
      PAYMENT_STATUS.WAITING_VERIFICATION,
    );
  });

  it("menghitung nilai pesanan sesuai filter", async () => {
    const report = await getReportData({
      paymentStatus: PAYMENT_STATUS.PAID,
    });
    expect(report.summary.totalOrderValue.toString()).toBe("25000");
    expect(report.summary.verifiedRevenue.toString()).toBe("25000");
  });

  it("menghitung pendapatan terverifikasi secara independen dari status pesanan", async () => {
    const report = await getReportData({
      status: ORDER_STATUS.PENDING,
    });
    // Pendapatan terverifikasi tidak terpengaruh filter status pesanan
    // karena didefinisikan dari pembayaran yang sudah diverifikasi.
    expect(report.summary.verifiedRevenue.toString()).toBe("25000");
  });
});

describe("toCsv", () => {
  it("mengubah baris menjadi CSV dengan pemisah titik koma", () => {
    const csv = toCsv(
      [
        { orderNumber: "LDR-1", customer: "Budi", total: "25000" },
        { orderNumber: "LDR-2", customer: "Siti; Aminah", total: "30000" },
      ],
      [
        { label: "Nomor", value: (row) => row.orderNumber },
        { label: "Pelanggan", value: (row) => row.customer },
        { label: "Total", value: (row) => row.total },
      ],
    );

    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Nomor;Pelanggan;Total");
    expect(lines[1]).toBe("LDR-1;Budi;25000");
    // Nilai yang memuat pemisah harus diapit tanda kutip.
    expect(lines[2]).toBe('LDR-2;"Siti; Aminah";30000');
  });
});
