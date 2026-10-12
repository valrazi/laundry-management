"use server";

/**
 * Server Action untuk pintu masuk ADMIN.
 *
 * Dipisahkan dari pintu masuk pelanggan agar akun pelanggan tidak dapat
 * memakai halaman login admin (dan sebaliknya). Role tetap diperiksa di server.
 */

import { redirect } from "next/navigation";

import { ROLES } from "@/lib/constants";
import { createSession } from "@/lib/auth";
import { actionFail, fromParseError } from "@/lib/results";
import { formDataToObject, loginSchema, parseWith } from "@/lib/validation";
import { authenticateCredentials } from "@/services/authService";

export async function adminLoginAction(_previousState, formData) {
  const parsed = parseWith(loginSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const result = await authenticateCredentials({
    email: parsed.data.email,
    password: parsed.data.password,
    expectedRole: ROLES.ADMIN,
  });

  if (!result.ok) {
    return actionFail(result.message);
  }

  await createSession(result.user.id);
  redirect("/admin/dashboard");
}
