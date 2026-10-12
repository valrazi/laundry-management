import Link from "next/link";

import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import StatCard from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  Users,
  Wallet,
} from "@/components/ui/icons";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getAdminDashboardStats } from "@/services/reportService";

export const metadata = { title: "Dashboard Admin" };

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan operasional laundry berdasarkan data pesanan dan pembayaran."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total pesanan"
          value={stats.totalOrders}
          icon={Package}
          tone="blue"
        />
        <StatCard
          label="Pesanan aktif"
          value={stats.activeOrders}
          hint="Belum selesai atau dibatalkan"
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Pesanan selesai"
          value={stats.completedOrders}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Menunggu verifikasi"
          value={stats.waitingVerification}
          hint="Pembayaran yang perlu diperiksa"
          icon={CreditCard}
          tone="warning"
        />
        <StatCard
          label="Pendapatan terverifikasi"
          value={formatCurrency(stats.verifiedRevenue)}
          hint="Hanya dari pembayaran berstatus Lunas"
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Total pelanggan"
          value={stats.totalCustomers}
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader
          title="Pesanan terbaru"
          description="5 pesanan terakhir yang masuk."
          action={
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-brand-blue hover:underline"
            >
              Lihat semua
            </Link>
          }
        />

        {stats.recentOrders.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Belum ada pesanan"
              description="Pesanan pelanggan akan muncul di sini setelah dibuat."
            />
          </div>
        ) : (
          <div className="table-scroll">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nomor</th>
                  <th className="px-4 py-3 font-medium">Pelanggan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pembayaran</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Dibuat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {order.customer?.name || "-"}
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
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
