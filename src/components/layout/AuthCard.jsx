import { Shirt, ShieldCheck } from "@/components/ui/icons";

/**
 * Kerangka halaman autentikasi.
 *
 * `variant="customer"` dipakai halaman pelanggan (aksen biru muda, ramah
 * pengguna ponsel). `variant="admin"` dipakai halaman login admin (aksen navy,
 * tanpa tautan registrasi).
 */
export default function AuthCard({
  variant = "customer",
  title,
  description,
  children,
  footer,
  notice,
}) {
  const isAdmin = variant === "admin";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <header className="mb-5 flex flex-col items-center text-center">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${
              isAdmin ? "bg-brand-navy" : "bg-brand-blue"
            }`}
          >
            {isAdmin ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <Shirt className="h-6 w-6" />
            )}
          </span>
          <p className="mt-3 text-base font-semibold text-brand-navy">
            {isAdmin ? "Panel Admin Laundry" : "Laundry Management System"}
          </p>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? "Khusus pengelola laundry"
              : "Pesan laundry jadi lebih mudah dipantau"}
          </p>
        </header>

        <section
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 ${
            isAdmin ? "border-t-4 border-t-brand-navy" : "border-t-4 border-t-brand-blue"
          }`}
        >
          <h1 className="text-lg font-semibold text-brand-navy">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}

          {notice ? <div className="mt-4">{notice}</div> : null}

          <div className="mt-5">{children}</div>
        </section>

        {footer ? (
          <div className="mt-5 space-y-3 text-center text-sm">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
