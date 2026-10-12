/**
 * Perhitungan dashboard dan laporan.
 *
 * Definisi tunggal yang dipakai konsisten di seluruh aplikasi:
 * - "Pendapatan terverifikasi" = SUM(payment.amount) untuk pembayaran
 *   berstatus PAID. Status pesanan tidak mempengaruhi nilai ini.
 * - "Pesanan aktif" = pesanan yang belum COMPLETED dan belum CANCELLED.
 */

import prisma from "@/lib/prisma";
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  ROLES,
} from "@/lib/constants";

import { buildOrderListWhere, jakartaDateRange } from "./orderService";

/** Ringkasan dashboard admin. Seluruh angka diambil dari database. */
export async function getAdminDashboardStats() {
  const [
    totalOrders,
    activeOrders,
    completedOrders,
    cancelledOrders,
    waitingVerification,
    verifiedRevenueAggregate,
    totalCustomers,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ACTIVE_ORDER_STATUSES } } }),
    prisma.order.count({ where: { status: ORDER_STATUS.COMPLETED } }),
    prisma.order.count({ where: { status: ORDER_STATUS.CANCELLED } }),
    prisma.payment.count({
      where: { status: PAYMENT_STATUS.WAITING_VERIFICATION },
    }),
    prisma.payment.aggregate({
      where: { status: PAYMENT_STATUS.PAID },
      _sum: { amount: true },
    }),
    prisma.user.count({ where: { role: ROLES.CUSTOMER } }),
    prisma.order.findMany({
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        payment: { select: { status: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalOrders,
    activeOrders,
    completedOrders,
    cancelledOrders,
    waitingVerification,
    verifiedRevenue: verifiedRevenueAggregate._sum.amount ?? 0,
    totalCustomers,
    recentOrders,
  };
}

/** Ringkasan dashboard pelanggan. */
export async function getCustomerDashboardStats(customerId) {
  const [totalOrders, activeOrders, unpaidAggregate, waitingVerification, recentOrders] =
    await Promise.all([
      prisma.order.count({ where: { customerId } }),
      prisma.order.count({
        where: { customerId, status: { in: ACTIVE_ORDER_STATUSES } },
      }),
      prisma.order.aggregate({
        where: {
          customerId,
          status: { not: ORDER_STATUS.CANCELLED },
          payment: { is: { status: { not: PAYMENT_STATUS.PAID } } },
        },
        _sum: { totalPrice: true },
      }),
      prisma.order.count({
        where: {
          customerId,
          payment: { is: { status: PAYMENT_STATUS.WAITING_VERIFICATION } },
        },
      }),
      prisma.order.findMany({
        where: { customerId },
        include: {
          payment: { select: { status: true, amount: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    totalOrders,
    activeOrders,
    outstandingAmount: unpaidAggregate._sum.totalPrice ?? 0,
    waitingVerification,
    recentOrders,
  };
}

// ------------------------------------------------------------------
// Laporan
// ------------------------------------------------------------------

/** Nilai pendapatan terverifikasi (definisi tunggal). */
export async function getVerifiedRevenue({ from = "", to = "" } = {}) {
  const where = { status: PAYMENT_STATUS.PAID };
  if (from || to) {
    where.verifiedAt = jakartaDateRange(from, to);
  }
  const aggregate = await prisma.payment.aggregate({
    where,
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? 0;
}

export const REPORT_ROW_LIMIT = 500;

/**
 * Data laporan berdasarkan filter tanggal, status pesanan, dan status
 * pembayaran. Tabel menampilkan total sesuai filter yang aktif.
 */
export async function getReportData({
  from = "",
  to = "",
  status = "",
  paymentStatus = "",
} = {}) {
  const where = buildOrderListWhere({ from, to, status, paymentStatus });

  const revenueWhere = { status: PAYMENT_STATUS.PAID };
  if (from || to) {
    revenueWhere.verifiedAt = jakartaDateRange(from, to);
  }

  const [
    orders,
    totalMatching,
    aggregate,
    statusGroups,
    paymentGroups,
    revenueAggregate,
  ] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        payment: { select: { status: true, amount: true, verifiedAt: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: REPORT_ROW_LIMIT,
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ where, _sum: { totalPrice: true } }),
    prisma.order.groupBy({
      by: ["status"],
      where: buildOrderListWhere({ from, to, paymentStatus }),
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where: {
        order: { is: buildOrderListWhere({ from, to, status }) },
      },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: revenueWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  return {
    filters: { from, to, status, paymentStatus },
    rows: orders,
    truncated: totalMatching > orders.length,
    rowLimit: REPORT_ROW_LIMIT,
    summary: {
      totalOrders: totalMatching,
      totalOrderValue: aggregate._sum.totalPrice ?? 0,
      verifiedRevenue: revenueAggregate._sum.amount ?? 0,
      verifiedPaymentCount: revenueAggregate._count._all ?? 0,
    },
    statusBreakdown: Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    ),
    paymentStatusBreakdown: Object.fromEntries(
      paymentGroups.map((group) => [
        group.status,
        { count: group._count._all, amount: group._sum.amount ?? 0 },
      ]),
    ),
  };
}

/**
 * Menyusun laporan dalam bentuk CSV.
 * Nilai dipisahkan dengan titik koma agar aman dibuka di Excel (id-ID).
 */
export function toCsv(rows, columns) {
  const escapeCell = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    const needsQuotes = /[";,\n\r]/.test(text);
    const escaped = text.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const header = columns.map((column) => escapeCell(column.label)).join(";");
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row))).join(";"),
  );

  return [header, ...body].join("\r\n");
}
