import Link from "next/link";

import Button from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Form";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import { Search } from "@/components/ui/icons";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_LIST,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_LIST,
} from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { paginationQuery, readListQuery } from "@/lib/query";
import { listAdminOrders } from "@/services/orderService";

export const metadata = { title: "Pesanan" };

export default async function AdminOrdersPage({ searchParams }) {
  const query = readListQuery(await searchParams);
  const result = await listAdminOrders(query);

  return (
    <>
      <PageHeader
        title="Pesanan"
        description="Cari, filter, dan kelola seluruh pesanan laundry."
      />

      <Card>
        <CardHeader title="Pencarian & filter" />
        <form
          method="get"
          action="/admin/orders"
          className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field label="Cari" htmlFor="q">
            <Input
              id="q"
              name="q"
              type="search"
              placeholder="Nomor pesanan, nama, email, atau telepon"
              defaultValue={query.q}
            />
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

          <Field label="Tanggal mulai" htmlFor="from">
            <Input
              id="from"
              name="from"
              type="date"
              defaultValue={query.from}
            />
          </Field>

          <Field label="Tanggal akhir" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={query.to} />
          </Field>

          <div className="flex items-end gap-2">
            <Button type="submit">
              <Search className="h-4 w-4" />
              Terapkan
            </Button>
            <Link
              href="/admin/orders"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Daftar pesanan"
          description={`${result.total} pesanan sesuai filter.`}
        />

        {result.items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Tidak ada pesanan"
              description="Ubah filter atau kata kunci pencarian untuk melihat data lain."
            />
          </div>
        ) : (
          <>
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
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.items.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {order._count?.items ?? 0} layanan
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{order.customer?.name || "-"}</p>
                        <p className="text-xs text-slate-500">
                          {order.customer?.phone || ""}
                        </p>
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
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-sm font-medium text-brand-blue hover:underline"
                        >
                          Kelola
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={result.pageSize}
              basePath="/admin/orders"
              query={paginationQuery(query)}
            />
          </>
        )}
      </Card>
    </>
  );
}
