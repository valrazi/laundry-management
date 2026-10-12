import AdminShell from "@/components/layout/AdminShell";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Panel Admin" };

/**
 * Layout admin.
 * Pemeriksaan role dilakukan di server pada setiap request — bukan hanya
 * mengandalkan middleware atau penyembunyian menu di sisi klien.
 */
export default async function AdminLayout({ children }) {
  const user = await requireAdmin();
  return <AdminShell user={user}>{children}</AdminShell>;
}
