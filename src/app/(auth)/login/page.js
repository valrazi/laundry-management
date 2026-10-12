import Link from "next/link";

import AuthCard from "@/components/layout/AuthCard";
import LoginForm from "@/components/forms/LoginForm";

export const metadata = { title: "Masuk Pelanggan" };

export default function CustomerLoginPage() {
  return (
    <AuthCard
      variant="customer"
      title="Masuk ke akun Anda"
      description="Pantau status, berat, dan biaya pesanan laundry Anda."
      footer={
        <>
          <p className="text-slate-500">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand-blue hover:underline"
            >
              Daftar sekarang
            </Link>
          </p>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
