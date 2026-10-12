/**
 * Query pengelolaan data pelanggan (khusus admin).
 *
 * Catatan keamanan: field `passwordHash` TIDAK pernah diambil dari database,
 * sehingga tidak mungkin bocor ke tampilan.
 */

import prisma from "@/lib/prisma";
import { PAYMENT_STATUS, ROLES } from "@/lib/constants";

import { listCustomerOrders, normalizePagination } from "./orderService";

export const CUSTOMER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export function buildCustomerListWhere({ q = "", status = "" } = {}) {
  const where = { role: ROLES.CUSTOMER };

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;

  return where;
}

export async function listCustomers(query = {}) {
  const pagination = normalizePagination(query);
  const where = buildCustomerListWhere(query);

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        ...CUSTOMER_SELECT,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}

export async function getCustomerById(customerId) {
  return prisma.user.findFirst({
    where: { id: customerId, role: ROLES.CUSTOMER },
    select: CUSTOMER_SELECT,
  });
}

/** Detail pelanggan beserta riwayat pesanan dan total pembayaran lunas. */
export async function getCustomerDetail(customerId, { page, pageSize } = {}) {
  const customer = await getCustomerById(customerId);
  if (!customer) return null;

  const [orders, paidAggregate] = await Promise.all([
    listCustomerOrders(customerId, { page, pageSize }),
    prisma.payment.aggregate({
      where: {
        status: PAYMENT_STATUS.PAID,
        order: { is: { customerId } },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    customer,
    orders,
    totalVerifiedPaid: paidAggregate._sum.amount ?? 0,
  };
}

/**
 * Mengaktifkan atau menonaktifkan akun pelanggan.
 * Akun tidak dihapus permanen agar riwayat transaksi tetap utuh.
 */
export async function setCustomerActive(userId, isActive) {
  const customer = await getCustomerById(userId);
  if (!customer) return null;

  if (!isActive) {
    // Sesi aktif dicabut saat akun dinonaktifkan.
    await prisma.session.deleteMany({ where: { userId } });
  }

  return prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: CUSTOMER_SELECT,
  });
}
