import Link from "next/link";

import AuthCard from "@/components/layout/AuthCard";
import AdminLoginForm from "@/components/forms/AdminLoginForm";

export const metadata = {
  title: "Login Admin",
  // Halaman internal pengelola — tidak perlu diindeks mesin pencari.
  robots: { index: false, follow: false },
};

/**
 * Pintu masuk khusus admin.
 *
 * Catatan teknis: halaman ini sengaja ditempatkan pada route group `(auth)`
 * (bukan di dalam `app/admin/`) agar TIDAK memakai `app/admin/layout.js`.
 * Layout tersebut memanggil `requireAdmin()`, sehingga akan terjadi pengalihan
 * tanpa akhir bila ikut diterapkan pada halaman login ini.
 */
export default function AdminLoginPage() {
  return (
    <AuthCard
      variant="admin"
      title="Login Admin"
      description="Kelola pelanggan, pesanan, pembayaran, layanan, dan laporan."
      footer={
        <>
          <p className="text-xs text-slate-400">
            Akun admin dibuat melalui proses terkontrol (seed atau admin lain),
            bukan melalui registrasi publik.
          </p>
        </>
      }
    >
      <AdminLoginForm />
    </AuthCard>
  );
}
