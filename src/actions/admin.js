"use server";

/** Server Action khusus admin untuk mengelola akun pelanggan. */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminUser } from "@/lib/auth";
import { actionFail, actionOk, fromParseError } from "@/lib/results";
import { checkboxField, formDataToObject, parseWith } from "@/lib/validation";
import { setCustomerActive } from "@/services/customerService";

const toggleCustomerSchema = z.object({
  userId: z.string().min(1, { message: "Pelanggan tidak valid." }),
  isActive: checkboxField,
});

export async function toggleCustomerActiveAction(_previousState, formData) {
  const admin = await getAdminUser();
  if (!admin) {
    return actionFail("Anda tidak memiliki akses untuk aksi ini.");
  }

  const parsed = parseWith(toggleCustomerSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const { userId, isActive } = parsed.data;

  const customer = await setCustomerActive(userId, isActive);
  if (!customer) {
    return actionFail("Akun pelanggan tidak ditemukan.");
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${userId}`);

  return actionOk(
    isActive
      ? `Akun ${customer.name} berhasil diaktifkan kembali.`
      : `Akun ${customer.name} berhasil dinonaktifkan.`,
  );
}
