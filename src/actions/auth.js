"use server";

/**
 * Server Action untuk pintu masuk PELANGGAN.
 *
 * Aturan penting:
 * - Registrasi publik SELALU membuat role CUSTOMER; role tidak pernah diambil
 *   dari data yang dikirim browser.
 * - Login di halaman ini hanya untuk akun CUSTOMER. Akun admin diarahkan ke
 *   halaman login admin (/admin/login).
 * - Pesan kesalahan tidak membedakan email tidak ditemukan dan password salah.
 */

import { redirect } from "next/navigation";

import { ROLES } from "@/lib/constants";
import { createSession, destroySession, homePathForRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import prisma from "@/lib/prisma";
import { actionFail, fromParseError } from "@/lib/results";
import {
  formDataToObject,
  loginSchema,
  parseWith,
  registerSchema,
} from "@/lib/validation";
import { authenticateCredentials } from "@/services/authService";

// ------------------------------------------------------------------
// Registrasi (hanya tersedia untuk pelanggan)
// ------------------------------------------------------------------

export async function registerAction(_previousState, formData) {
  const parsed = parseWith(registerSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const { name, email, phone, password } = parsed.data;

  const duplicate = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { email: true, phone: true },
  });

  if (duplicate) {
    if (duplicate.email === email) {
      return actionFail("Email sudah terdaftar.", {
        email: "Email sudah terdaftar. Silakan gunakan email lain.",
      });
    }
    return actionFail("Nomor WhatsApp sudah terdaftar.", {
      phone: "Nomor WhatsApp sudah terdaftar. Silakan gunakan nomor lain.",
    });
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash: await hashPassword(password),
        role: ROLES.CUSTOMER, // registrasi publik selalu pelanggan
        isActive: true,
      },
      select: { id: true, role: true },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return actionFail("Email atau nomor WhatsApp sudah terdaftar.");
    }
    console.error("[auth] gagal registrasi:", error?.message || error);
    return actionFail("Registrasi gagal. Silakan coba lagi.");
  }

  await createSession(user.id);
  redirect(homePathForRole(user.role));
}

// ------------------------------------------------------------------
// Login pelanggan
// ------------------------------------------------------------------

export async function customerLoginAction(_previousState, formData) {
  const parsed = parseWith(loginSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const result = await authenticateCredentials({
    email: parsed.data.email,
    password: parsed.data.password,
    expectedRole: ROLES.CUSTOMER,
  });

  if (!result.ok) {
    return actionFail(result.message);
  }

  await createSession(result.user.id);
  redirect(homePathForRole(result.user.role));
}

// ------------------------------------------------------------------
// Logout (dipakai admin maupun pelanggan)
// ------------------------------------------------------------------

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
