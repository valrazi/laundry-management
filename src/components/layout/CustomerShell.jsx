"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/actions/auth";
import {
  Home,
  LogOut,
  Package,
  Plus,
  Shirt,
  User,
} from "@/components/ui/icons";

/**
 * Menu navigasi pelanggan.
 * `mobileLabel` dipakai pada bilah bawah agar tetap muat dalam 5 kolom.
 */
const NAV_ITEMS = [
  {
    href: "/customer/dashboard",
    label: "Beranda",
    mobileLabel: "Beranda",
    Icon: Home,
  },
  {
    href: "/customer/orders",
    label: "Pesanan",
    mobileLabel: "Pesanan",
    Icon: Package,
  },
  {
    href: "/customer/orders/new",
    label: "Pesan Baru",
    mobileLabel: "Pesan",
    Icon: Plus,
    primary: true,
  },
  {
    href: "/customer/profile",
    label: "Profil",
    mobileLabel: "Profil",
    Icon: User,
  },
];

/** Kelas dasar setiap sel navigasi bawah agar tinggi & padding seragam. */
const BOTTOM_ITEM_CLASS =
  "flex w-full min-h-[3.75rem] flex-col items-center justify-center gap-1 px-0.5 py-2 text-[0.68rem] font-medium leading-none transition";

/**
 * Kerangka halaman pelanggan.
 *
 * Dirancang mobile-first karena mayoritas pelanggan membuka aplikasi dari
 * ponsel:
 * - Navigasi bawah berisi 5 item sehingga tombol "Pesan" berada tepat di
 *   tengah dan tombol "Keluar" berada di ujung kanan.
 * - Tombol keluar pada header hanya ditampilkan pada layar >= md agar tidak
 *   ada aksi yang tampil dua kali.
 * - Konten diberi jarak bawah supaya tidak tertutup navigasi bawah.
 */
export default function CustomerShell({ user, children }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/customer/orders") {
      // Tidak dianggap aktif saat berada di halaman buat pesanan.
      return (
        pathname === href ||
        (pathname.startsWith("/customer/orders/") &&
          pathname !== "/customer/orders/new")
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const firstName =
    String(user.name || "").trim().split(/\s+/)[0] || "Pelanggan";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/customer/dashboard"
            className="flex min-w-0 items-center gap-2.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white">
              <Shirt className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight text-brand-navy">
                Laundry Saya
              </span>
              <span className="block truncate text-xs leading-tight text-slate-500">
                Halo, {firstName}
              </span>
            </span>
          </Link>

          {/* Menu lengkap untuk tablet & desktop */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(href)
                    ? "bg-brand-blue/15 text-brand-navy"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Pada ponsel, tombol keluar ada di navigasi bawah. */}
          <form action={logoutAction} className="hidden md:block">
            <button
              type="submit"
              aria-label="Keluar dari akun"
              className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 pb-28 pt-5 md:pb-10">
        {children}
      </main>

      {/* Navigasi bawah khusus ponsel — 5 item, "Pesan" tepat di tengah */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ href, label, mobileLabel, Icon, primary }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`${BOTTOM_ITEM_CLASS} ${
                    active ? "text-brand-navy" : "text-slate-500"
                  }`}
                >
                  {primary ? (
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${
                        active ? "bg-brand-navy" : "bg-brand-blue"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  ) : (
                    <Icon
                      className={`h-5 w-5 ${active ? "text-brand-blue" : ""}`}
                    />
                  )}
                  <span className="whitespace-nowrap">
                    {mobileLabel || label}
                  </span>
                </Link>
              </li>
            );
          })}

          <li>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Keluar dari akun"
                className={`${BOTTOM_ITEM_CLASS} text-slate-500 hover:text-rose-600`}
              >
                <LogOut className="h-5 w-5" />
                <span className="whitespace-nowrap">Keluar</span>
              </button>
            </form>
          </li>
        </ul>
      </nav>
    </div>
  );
}
