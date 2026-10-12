import Link from "next/link";

import AuthCard from "@/components/layout/AuthCard";
import RegisterForm from "@/components/forms/RegisterForm";

export const metadata = { title: "Daftar Pelanggan" };

export default function RegisterPage() {
  return (
    <AuthCard
      variant="customer"
      title="Buat akun pelanggan"
      description="Nomor WhatsApp dipakai untuk mengirim notifikasi status pesanan."
      footer={
        <>
          <p className="text-slate-500">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-blue hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
          <p className="text-xs text-slate-400">
            Akun pengelola laundry hanya dibuat oleh admin, tidak melalui
            halaman ini.
          </p>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
