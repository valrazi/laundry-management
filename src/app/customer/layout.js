import CustomerShell from "@/components/layout/CustomerShell";
import { requireCustomer } from "@/lib/auth";

export const metadata = { title: "Area Pelanggan" };

/**
 * Layout pelanggan.
 * Pemeriksaan role dilakukan di server pada setiap request.
 */
export default async function CustomerLayout({ children }) {
  const user = await requireCustomer();
  return <CustomerShell user={user}>{children}</CustomerShell>;
}
