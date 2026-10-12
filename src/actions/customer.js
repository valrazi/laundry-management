"use server";

/** Server Action pengelolaan profil pelanggan. */

import { revalidatePath } from "next/cache";

import {
  getCurrentSessionId,
  getCustomerUser,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import prisma from "@/lib/prisma";
import { actionFail, actionOk, fromParseError } from "@/lib/results";
import {
  changePasswordSchema,
  formDataToObject,
  parseWith,
  profileSchema,
} from "@/lib/validation";

export async function updateProfileAction(_previousState, formData) {
  const user = await getCustomerUser();
  if (!user) {
    return actionFail("Sesi Anda telah berakhir. Silakan login kembali.");
  }

  const parsed = parseWith(profileSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const { name, email, phone } = parsed.data;

  const duplicate = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
      NOT: { id: user.id },
    },
    select: { email: true, phone: true },
  });

  if (duplicate) {
    if (duplicate.email === email) {
      return actionFail("Email sudah digunakan akun lain.", {
        email: "Email sudah digunakan akun lain.",
      });
    }
    return actionFail("Nomor WhatsApp sudah digunakan akun lain.", {
      phone: "Nomor WhatsApp sudah digunakan akun lain.",
    });
  }

  // Role dan status aktif TIDAK dapat diubah pelanggan.
  await prisma.user.update({
    where: { id: user.id },
    data: { name, email, phone },
  });

  revalidatePath("/customer/profile");
  revalidatePath("/customer/dashboard");

  return actionOk("Profil berhasil diperbarui.");
}

export async function changePasswordAction(_previousState, formData) {
  const user = await getCustomerUser();
  if (!user) {
    return actionFail("Sesi Anda telah berakhir. Silakan login kembali.");
  }

  const parsed = parseWith(changePasswordSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const { currentPassword, newPassword } = parsed.data;

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  const matches = await verifyPassword(
    currentPassword,
    record?.passwordHash || "",
  );
  if (!matches) {
    return actionFail("Password saat ini tidak sesuai.", {
      currentPassword: "Password saat ini tidak sesuai.",
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Keluar dari perangkat lain setelah password berubah.
  const activeSessionId = await getCurrentSessionId();
  await prisma.session.deleteMany({
    where: { userId: user.id, id: { not: activeSessionId ?? "" } },
  });

  revalidatePath("/customer/profile");

  return actionOk("Password berhasil diubah.");
}
