import Link from "next/link";
import { notFound } from "next/navigation";

import CustomerStatusForm from "@/components/forms/CustomerStatusForm";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import Pagination from "@/components/ui/Pagination";
import { ArrowLeft } from "@/components/ui/icons";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { readListQuery } from "@/lib/query";
import { getCustomerDetail } from "@/services/customerService";

export const metadata = { title: "Detail Pelanggan" };

export default async function AdminCustomerDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = readListQuery(await searchParams);

  const detail = await getCustomerDetail(id, {
    page: query.page,
    pageSize: query.pageSize,
  });

  if (!detail) {
    notFound();
  }

  const { customer, orders, totalVerifiedPaid } = detail;

  return (
    <>
      <PageHeader
        title={customer.name}
        description={`Terdaftar sejak ${formatDate(customer.createdAt)}`}
        action={
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Data pelanggan" />
          <CardBody className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Nama
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">
                  {customer.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Status akun
                </dt>
                <dd className="mt-1">
                  {customer.isActive ? (
                    <Badge tone="success">Aktif</Badge>
                  ) : (
                    <Badge tone="danger">Nonaktif</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-slate-800">{customer.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Nomor WhatsApp
                </dt>
                <dd className="mt-1 text-sm text-slate-800">{customer.phone}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Total pesanan
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {orders.total} pesanan
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Total pembayaran lunas
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">
                  {formatCurrency(totalVerifiedPaid)}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Status akun"
            description="Nonaktifkan bila pelanggan tidak lagi menggunakan layanan."
          />
          <CardBody className="space-y-4">
            <CustomerStatusForm customer={customer} />
            <Alert variant="info">
              Password pelanggan tidak pernah ditampilkan dan tidak dapat
              dilihat admin.
            </Alert>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Riwayat pesanan"
          description={`${orders.total} pesanan milik pelanggan ini.`}
        />

        {orders.items.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Belum ada pesanan" />
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nomor</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Pembayaran</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Dibuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.items.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
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

            <Pagination
              page={orders.page}
              totalPages={orders.totalPages}
              total={orders.total}
              pageSize={orders.pageSize}
              basePath={`/admin/customers/${customer.id}`}
              query={{ pageSize: query.pageSize }}
            />
          </>
        )}
      </Card>
    </>
  );
}
