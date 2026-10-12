import { redirect } from "next/navigation";

import { getCurrentUser, homePathForRole } from "@/lib/auth";

/** Halaman beranda: arahkan ke dashboard sesuai role. */
export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  redirect(homePathForRole(user.role));
}
