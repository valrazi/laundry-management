import Link from "next/link";

import { Card, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import { ChevronRight, Plus } from "@/components/ui/icons";
import { requireCustomer } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { readListQuery } from "@/lib/query";
import { listCustomerOrders } from "@/services/orderService";

export const metadata = { title: "Pesanan Saya" };

export default async function CustomerOrdersPage({ searchParams }) {
  const user = await requireCustomer();
  const query = readListQuery(await searchParams);

  const result = await listCustomerOrders(user.id, {
    page: query.page,
    pageSize: query.pageSize,
  });

  return (
    <>
      <PageHeader
        title="Pesanan Saya"
        description="Seluruh pesanan laundry yang pernah Anda buat."
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

      <Card>
        <CardHeader
          title="Daftar pesanan"
          description={`${result.total} pesanan.`}
        />

        {result.items.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState
              title="Belum ada pesanan"
              description="Pesanan yang Anda buat akan tampil di sini."
            />
          </div>
        ) : (
          <>
            {/* Tampilan ponsel: daftar kartu yang mudah disentuh */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {result.items.map((order) => (
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
                          {formatDateTime(order.createdAt)} ·{" "}
                          {order._count?.items ?? 0} layanan
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
                  {result.items.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/customer/orders/${order.id}`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {order._count?.items ?? 0} layanan
                        </p>
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

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={result.pageSize}
              basePath="/customer/orders"
              query={{ pageSize: query.pageSize }}
            />
          </>
        )}
      </Card>
    </>
  );
}
