"use server";

/** Server Action pembayaran: unggah bukti transfer & keputusan admin. */

import { revalidatePath } from "next/cache";

import { getAdminUser, getCustomerUser } from "@/lib/auth";
import { actionFail, actionOk, fromParseError } from "@/lib/results";
import {
  formDataToObject,
  parseWith,
  rejectPaymentSchema,
  verifyPaymentSchema,
} from "@/lib/validation";
import {
  rejectPayment,
  submitPaymentReceipt,
  verifyPayment,
} from "@/services/paymentService";

function revalidatePaymentViews(orderId, paymentId) {
  revalidatePath("/admin/payments");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/reports");
  revalidatePath("/customer/orders");
  revalidatePath("/customer/dashboard");
  if (paymentId) revalidatePath(`/admin/payments/${paymentId}`);
  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/customer/orders/${orderId}`);
  }
}

/** Pelanggan mengunggah bukti transfer untuk pesanannya sendiri. */
export async function submitReceiptAction(_previousState, formData) {
  const customer = await getCustomerUser();
  if (!customer) {
    return actionFail("Sesi Anda telah berakhir. Silakan login kembali.");
  }

  const orderId = String(formData.get("orderId") || "");
  if (!orderId) {
    return actionFail("Pesanan tidak valid.");
  }

  const file = formData.get("proof");
  if (!file || typeof file === "string" || (file.size ?? 0) === 0) {
    return actionFail("Silakan pilih file bukti transfer terlebih dahulu.", {
      proof: "File bukti transfer wajib dipilih.",
    });
  }

  const result = await submitPaymentReceipt({
    orderId,
    customerId: customer.id,
    file,
  });

  if (!result.ok) {
    return actionFail(result.message, { proof: result.message });
  }

  revalidatePaymentViews(orderId, result.payment.id);

  return actionOk(result.message);
}

/** Admin memverifikasi pembayaran. */
export async function verifyPaymentAction(_previousState, formData) {
  const admin = await getAdminUser();
  if (!admin) {
    return actionFail("Anda tidak memiliki akses untuk aksi ini.");
  }

  const parsed = parseWith(verifyPaymentSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const result = await verifyPayment({
    paymentId: parsed.data.paymentId,
    adminUserId: admin.id,
  });

  if (!result.ok) {
    return actionFail(result.message);
  }

  revalidatePaymentViews(result.payment.orderId, result.payment.id);

  return actionOk(result.message);
}

/** Admin menolak pembayaran disertai alasan. */
export async function rejectPaymentAction(_previousState, formData) {
  const admin = await getAdminUser();
  if (!admin) {
    return actionFail("Anda tidak memiliki akses untuk aksi ini.");
  }

  const parsed = parseWith(rejectPaymentSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const result = await rejectPayment({
    paymentId: parsed.data.paymentId,
    adminUserId: admin.id,
    reason: parsed.data.reason,
  });

  if (!result.ok) {
    return actionFail(result.message);
  }

  revalidatePaymentViews(result.payment.orderId, result.payment.id);

  return actionOk(result.message);
}
