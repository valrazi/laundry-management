import Link from "next/link";

import EmptyState from "@/components/ui/EmptyState";
import { Card, CardHeader } from "@/components/ui/Card";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import StatCard from "@/components/ui/StatCard";
import { ChevronRight, Clock, CreditCard, Package, Plus, Wallet } from "@/components/ui/icons";
import { requireCustomer } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getCustomerDashboardStats } from "@/services/reportService";

export const metadata = { title: "Beranda" };

export default async function CustomerDashboardPage() {
  const user = await requireCustomer();
  const stats = await getCustomerDashboardStats(user.id);

  return (
    <>
      <PageHeader
        title={`Halo, ${user.name.split(" ")[0]}!`}
        description="Status dan biaya pesanan laundry Anda tampil di sini."
        action={
          <Link
            href="/customer/orders/new"
            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white transition hover:bg-sky-500"
          >
            <Plus className="h-4 w-4" />
            Buat Pesanan
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Pesanan aktif"
          value={stats.activeOrders}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Total pesanan"
          value={stats.totalOrders}
          icon={Package}
          tone="blue"
        />
        <StatCard
          label="Belum lunas"
          value={formatCurrency(stats.outstandingAmount)}
          icon={Wallet}
          tone="danger"
        />
        <StatCard
          label="Menunggu verifikasi"
          value={stats.waitingVerification}
          icon={CreditCard}
          tone="navy"
        />
      </div>

      <Card>
        <CardHeader
          title="Pesanan terbaru"
          action={
            <Link
              href="/customer/orders"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              Lihat semua
            </Link>
          }
        />

        {stats.recentOrders.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              title="Belum ada pesanan"
              description="Mulai dengan membuat pesanan laundry pertama Anda."
              action={
                <Link
                  href="/customer/orders/new"
                  className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white transition hover:bg-sky-500"
                >
                  <Plus className="h-4 w-4" />
                  Buat Pesanan
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {/* Tampilan ponsel: daftar kartu */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/customer/orders/${order.id}`}
                    className="block px-4 py-3.5 transition active:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {order.orderNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <PaymentStatusBadge status={order.payment?.status} />
                      <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-brand-navy">
                        {formatCurrency(order.totalPrice)}
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Tampilan tablet/desktop: tabel */}
            <div className="table-scroll hidden md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nomor</th>
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Pembayaran</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={order.payment?.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {formatCurrency(order.totalPrice)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/customer/orders/${order.id}`}
                          className="text-sm font-medium text-brand-blue hover:underline"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
