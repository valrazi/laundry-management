import Link from "next/link";

import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Form";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import StatCard from "@/components/ui/StatCard";
import {
  Download,
  Package,
  Search,
  Wallet,
} from "@/components/ui/icons";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_LIST,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_LIST,
} from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { readListQuery } from "@/lib/query";
import { getReportData } from "@/services/reportService";

export const metadata = { title: "Laporan" };

export default async function AdminReportsPage({ searchParams }) {
  const query = readListQuery(await searchParams);

  const report = await getReportData({
    from: query.from,
    to: query.to,
    status: query.status,
    paymentStatus: query.paymentStatus,
  });

  const exportParams = new URLSearchParams();
  if (query.from) exportParams.set("from", query.from);
  if (query.to) exportParams.set("to", query.to);
  if (query.status) exportParams.set("status", query.status);
  if (query.paymentStatus) exportParams.set("paymentStatus", query.paymentStatus);
  const exportHref = `/api/reports/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <>
      <PageHeader
        title="Laporan"
        description="Rekap pesanan, pembayaran, dan pendapatan terverifikasi sesuai filter."
      />

      <Card>
        <CardHeader title="Filter laporan" />
        <form
          method="get"
          action="/admin/reports"
          className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Tanggal mulai" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={query.from} />
          </Field>

          <Field label="Tanggal akhir" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={query.to} />
          </Field>

          <Field label="Status pesanan" htmlFor="status">
            <Select id="status" name="status" defaultValue={query.status}>
              <option value="">Semua status</option>
              {ORDER_STATUS_LIST.map((status) => (
                <option key={status} value={status}>
                  {ORDER_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status pembayaran" htmlFor="paymentStatus">
            <Select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={query.paymentStatus}
            >
              <option value="">Semua status</option>
              {PAYMENT_STATUS_LIST.map((status) => (
                <option key={status} value={status}>
                  {PAYMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit">
              <Search className="h-4 w-4" />
              Terapkan filter
            </Button>
            <Link
              href="/admin/reports"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset
            </Link>
            <a
              href={exportHref}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
              Ekspor CSV
            </a>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Jumlah pesanan"
          value={report.summary.totalOrders}
          hint="Sesuai filter yang aktif"
          icon={Package}
          tone="blue"
        />
        <StatCard
          label="Nilai pesanan"
          value={formatCurrency(report.summary.totalOrderValue)}
          hint="Jumlah totalPrice pesanan pada filter"
        />
        <StatCard
          label="Pendapatan terverifikasi"
          value={formatCurrency(report.summary.verifiedRevenue)}
          hint={`${report.summary.verifiedPaymentCount} pembayaran lunas`}
          icon={Wallet}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Rekap status pesanan" />
          <CardBody className="p-0">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <tbody className="divide-y divide-slate-100">
                {ORDER_STATUS_LIST.map((status) => (
                  <tr key={status}>
                    <td className="px-5 py-3 text-slate-700">
                      {ORDER_STATUS_LABELS[status]}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-800">
                      {report.statusBreakdown[status] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Rekap status pembayaran"
            description="Nilai pendapatan hanya dihitung dari pembayaran Lunas."
          />
          <CardBody className="p-0">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <tbody className="divide-y divide-slate-100">
                {PAYMENT_STATUS_LIST.map((status) => {
                  const entry = report.paymentStatusBreakdown[status];
                  return (
                    <tr key={status}>
                      <td className="px-5 py-3 text-slate-700">
                        {PAYMENT_STATUS_LABELS[status]}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                        {entry?.count ?? 0} pembayaran
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium text-slate-800">
                        {formatCurrency(entry?.amount ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Daftar transaksi"
          description={`Menampilkan ${report.rows.length} dari ${report.summary.totalOrders} pesanan${
            report.truncated
              ? ` (dibatasi ${report.rowLimit} baris, persempit filter untuk melihat sisanya)`
              : ""
          }.`}
        />

        {report.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Tidak ada data"
              description="Tidak ada pesanan yang cocok dengan filter yang dipilih."
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
                {report.rows.map((order) => (
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
