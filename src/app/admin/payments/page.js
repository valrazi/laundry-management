import Link from "next/link";

import Button from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Form";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import { Search } from "@/components/ui/icons";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_LIST } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { paginationQuery, readListQuery } from "@/lib/query";
import { listPayments } from "@/services/paymentService";

export const metadata = { title: "Pembayaran" };

export default async function AdminPaymentsPage({ searchParams }) {
  const query = readListQuery(await searchParams);

  const result = await listPayments({
    q: query.q,
    page: query.page,
    pageSize: query.pageSize,
    paymentStatus: query.paymentStatus,
  });

  return (
    <>
      <PageHeader
        title="Pembayaran"
        description="Periksa bukti transfer, kemudian verifikasi atau tolak dengan alasan yang jelas."
      />

      <Card>
        <CardHeader title="Pencarian & filter" />
        <form
          method="get"
          action="/admin/payments"
          className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Cari" htmlFor="q" className="lg:col-span-2">
            <Input
              id="q"
              name="q"
              type="search"
              placeholder="Nomor pesanan, nama, atau email pelanggan"
              defaultValue={query.q}
            />
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

          <div className="flex items-end gap-2">
            <Button type="submit">
              <Search className="h-4 w-4" />
              Terapkan
            </Button>
            <Link
              href="/admin/payments"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Daftar pembayaran"
          description={`${result.total} data pembayaran sesuai filter.`}
        />

        {result.items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Tidak ada data pembayaran"
              description="Ubah filter atau kata kunci pencarian."
            />
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Pesanan</th>
                    <th className="px-4 py-3 font-medium">Pelanggan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Tagihan</th>
                    <th className="px-4 py-3 font-medium">
                      Bukti diunggah
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.items.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/payments/${payment.id}`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {payment.order?.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {payment.order?.customer?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {payment.proofUploadedAt
                          ? formatDateTime(payment.proofUploadedAt)
                          : "Belum diunggah"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/payments/${payment.id}`}
                          className="text-sm font-medium text-brand-blue hover:underline"
                        >
                          Periksa
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
              basePath="/admin/payments"
              query={paginationQuery(query)}
            />
          </>
        )}
      </Card>
    </>
  );
}
