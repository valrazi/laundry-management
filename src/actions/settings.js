"use server";

/** Server Action pengaturan sistem (khusus admin, tanpa secret). */

import { revalidatePath } from "next/cache";

import { getAdminUser } from "@/lib/auth";
import { SETTING_KEYS } from "@/lib/constants";
import { actionFail, actionOk, fromParseError } from "@/lib/results";
import { updateSettings } from "@/lib/settings";
import {
  formDataToObject,
  parseWith,
  settingsSchema,
} from "@/lib/validation";

export async function updateSettingsAction(_previousState, formData) {
  const admin = await getAdminUser();
  if (!admin) {
    return actionFail("Anda tidak memiliki akses untuk aksi ini.");
  }

  const parsed = parseWith(settingsSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const data = parsed.data;

  // Token Fonnte TIDAK pernah disimpan di tabel pengaturan.
  await updateSettings({
    [SETTING_KEYS.PAYMENT_BANK_NAME]: data[SETTING_KEYS.PAYMENT_BANK_NAME],
    [SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER]:
      data[SETTING_KEYS.PAYMENT_ACCOUNT_NUMBER],
    [SETTING_KEYS.PAYMENT_ACCOUNT_NAME]:
      data[SETTING_KEYS.PAYMENT_ACCOUNT_NAME],
    [SETTING_KEYS.PAYMENT_INSTRUCTIONS]:
      data[SETTING_KEYS.PAYMENT_INSTRUCTIONS],
    [SETTING_KEYS.WHATSAPP_ENABLED]: data[SETTING_KEYS.WHATSAPP_ENABLED]
      ? "true"
      : "false",
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/dashboard");
  revalidatePath("/customer/orders");

  return actionOk("Pengaturan berhasil disimpan.");
}
