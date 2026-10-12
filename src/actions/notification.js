"use server";

/** Server Action template notifikasi & pengiriman ulang manual. */

import { revalidatePath } from "next/cache";

import { getAdminUser } from "@/lib/auth";
import { NOTIFICATION_EVENT_KEYS } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { actionFail, actionOk, fromParseError } from "@/lib/results";
import {
  formDataToObject,
  notificationTemplateSchema,
  parseWith,
  retryNotificationSchema,
} from "@/lib/validation";
import { retryNotificationLog } from "@/services/notificationService";
import { validateTemplateMessage } from "@/services/templateEngine";

export async function updateTemplateAction(_previousState, formData) {
  const admin = await getAdminUser();
  if (!admin) {
    return actionFail("Anda tidak memiliki akses untuk aksi ini.");
  }

  const parsed = parseWith(
    notificationTemplateSchema,
    formDataToObject(formData),
  );
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const { eventKey, name, message, isActive } = parsed.data;

  if (!NOTIFICATION_EVENT_KEYS.includes(eventKey)) {
    return actionFail("Event notifikasi tidak dikenal.");
  }

  // Variabel yang tidak dikenal harus ditolak saat template disimpan.
  const templateValidation = validateTemplateMessage(message);
  if (!templateValidation.valid) {
    const unknown = templateValidation.unknownVariables
      .map((variable) => `{{${variable}}}`)
      .join(", ");
    return actionFail(
      `Variabel berikut tidak didukung: ${unknown}. Gunakan hanya variabel yang terdaftar.`,
      { message: "Terdapat variabel template yang tidak didukung." },
    );
  }

  await prisma.notificationTemplate.upsert({
    where: { eventKey },
    create: { eventKey, name, message, isActive },
    update: { name, message, isActive },
  });

  revalidatePath("/admin/notification-templates");

  return actionOk(`Template "${name}" berhasil disimpan.`);
}

/** Mengirim ulang satu notifikasi gagal memakai snapshot pesan aslinya. */
export async function retryNotificationAction(formData) {
  const admin = await getAdminUser();
  if (!admin) return;

  const parsed = parseWith(
    retryNotificationSchema,
    formDataToObject(formData),
  );
  if (!parsed.ok) return;

  await retryNotificationLog(parsed.data.logId);

  revalidatePath("/admin/notification-templates");
}
