"use server";

/** Server Action pengelolaan pesanan. */

import { revalidatePath } from "next/cache";

import { getAdminUser, getCustomerUser } from "@/lib/auth";
import { actionFail, actionOk, fromParseError } from "@/lib/results";
import {
  createOrderSchema,
  formDataToObject,
  parseWith,
  updateOrderDetailsSchema,
  updateOrderStatusSchema,
} from "@/lib/validation";
import {
  createOrder,
  updateOrderDetails,
  updateOrderStatus,
} from "@/services/orderService";

function revalidateOrderViews(orderId) {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");
  revalidatePath("/customer/orders");
  revalidatePath("/customer/dashboard");
  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/customer/orders/${orderId}`);
  }
}

/**
 * Pelanggan membuat pesanan baru.
 * Harga & layanan diambil ulang dari database di dalam service — nilai yang
 * dikirim browser hanya berupa id layanan dan jumlah item.
 */
export async function createOrderAction(payload) {
  const customer = await getCustomerUser();
  if (!customer) {
    return actionFail("Sesi Anda telah berakhir. Silakan login kembali.");
  }

  const parsed = parseWith(createOrderSchema, payload);
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const result = await createOrder({
    customerId: customer.id,
    items: parsed.data.items,
    customerNotes: parsed.data.customerNotes,
  });

  if (!result.ok) {
    return actionFail(result.message);
  }

  revalidateOrderViews(result.order.id);

  return actionOk("Pesanan berhasil dibuat.", {
    orderId: result.order.id,
    orderNumber: result.order.orderNumber,
  });
}

/** Admin mengubah status pesanan sesuai aturan transisi. */
export async function updateOrderStatusAction(_previousState, formData) {
  const admin = await getAdminUser();
  if (!admin) {
    return actionFail("Anda tidak memiliki akses untuk aksi ini.");
  }

  const parsed = parseWith(
    updateOrderStatusSchema,
    formDataToObject(formData),
  );
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const { orderId, status, notes, force } = parsed.data;

  const result = await updateOrderStatus({
    orderId,
    status,
    actorUserId: admin.id,
    notes,
    // Koreksi khusus hanya tersedia untuk admin dan selalu tercatat.
    force: Boolean(force),
  });

  if (!result.ok) {
    return actionFail(result.message);
  }

  revalidateOrderViews(orderId);

  return actionOk(result.message, { changed: result.changed });
}

/**
 * Admin memperbarui berat aktual / jumlah item / biaya tambahan / catatan.
 * Seluruh nilai uang dihitung ulang di server.
 */
export async function updateOrderDetailsAction(payload) {
  const admin = await getAdminUser();
  if (!admin) {
    return actionFail("Anda tidak memiliki akses untuk aksi ini.");
  }

  const parsed = parseWith(updateOrderDetailsSchema, payload);
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const result = await updateOrderDetails({
    orderId: parsed.data.orderId,
    items: parsed.data.items,
    additionalCost: parsed.data.additionalCost,
    adminNotes: parsed.data.adminNotes,
  });

  if (!result.ok) {
    return actionFail(result.message);
  }

  revalidateOrderViews(parsed.data.orderId);

  return actionOk(result.message);
}
