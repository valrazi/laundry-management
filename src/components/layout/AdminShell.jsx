"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logoutAction } from "@/actions/auth";
import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  Shirt,
  Users,
  Wallet,
  X,
} from "@/components/ui/icons";
import { initialsOf } from "@/lib/format";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: Home },
  { href: "/admin/customers", label: "Pelanggan", Icon: Users },
  { href: "/admin/orders", label: "Pesanan", Icon: Package },
  { href: "/admin/services", label: "Layanan", Icon: Shirt },
  { href: "/admin/payments", label: "Pembayaran", Icon: CreditCard },
  { href: "/admin/reports", label: "Laporan", Icon: BarChart3 },
  {
    href: "/admin/notification-templates",
    label: "Template Notifikasi",
    Icon: Bell,
  },
  { href: "/admin/settings", label: "Pengaturan", Icon: Settings },
];

export default function AdminShell({ user, children }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isActive = (href) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const navList = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMobileNavOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(href)
              ? "bg-brand-blue text-white"
              : "text-slate-200 hover:bg-white/10"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue text-white">
        <Wallet className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          Laundry Admin
        </p>
        <p className="truncate text-xs text-slate-300">Panel Operasional</p>
      </div>
    </div>
  );

  const accountBox = (
    <div className="border-t border-white/10 px-4 py-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
          {initialsOf(user.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-300">{user.email}</p>
        </div>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-navy lg:flex">
        {brand}
        {navList}
        {accountBox}
      </aside>

      {/* Drawer mobile */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-brand-navy">
            <div className="flex items-center justify-between">
              {brand}
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setMobileNavOpen(false)}
                className="mr-3 rounded-lg p-2 text-slate-200 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navList}
            {accountBox}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <p className="truncate text-sm font-semibold text-brand-navy">
              Panel Admin
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-medium text-slate-700">
                {user.name}
              </span>
              <span className="block text-xs text-slate-400">Admin</span>
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
              {initialsOf(user.name)}
            </span>
          </div>
        </header>

        <main className="flex-1 space-y-6 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
