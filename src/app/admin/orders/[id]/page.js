import Link from "next/link";
import { notFound } from "next/navigation";

import OrderDetailsForm from "@/components/forms/OrderDetailsForm";
import OrderStatusForm from "@/components/forms/OrderStatusForm";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Printer,
} from "@/components/ui/icons";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import { formatCurrency, formatDateTime, formatWeight } from "@/lib/format";
import { serializeOrderForClient } from "@/lib/serialize";
import {
  getAdminOrderDetail,
  isAwaitingWeighing,
} from "@/services/orderService";

export const metadata = { title: "Detail Pesanan" };

export default async function AdminOrderDetailPage({ params }) {
  const { id } = await params;
  const order = await getAdminOrderDetail(id);

  if (!order) {
    notFound();
  }

  const hasPendingWeight = isAwaitingWeighing(order);

  const clientOrder = serializeOrderForClient(order);

  return (
    <>
      <PageHeader
        title={`Pesanan ${order.orderNumber}`}
        description={`Dibuat ${formatDateTime(order.createdAt)}`}
        action={
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.payment?.status} />
        {order.completedAt ? (
          <Badge tone="success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Selesai {formatDateTime(order.completedAt)}
          </Badge>
        ) : null}
        {hasPendingWeight ? (
          <Badge tone="warning">
            <Clock className="h-3.5 w-3.5" />
            Menunggu penimbangan
          </Badge>
        ) : null}
      </div>

      {order.status === "CANCELLED" ? (
        <Alert variant="warning">
          Pesanan ini dibatalkan. Rincian biaya tidak dapat diubah lagi.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Rincian layanan & biaya"
              description="Isi berat aktual atau jumlah item, lalu simpan. Total dihitung ulang di server."
            />
            <CardBody>
              <OrderDetailsForm order={clientOrder} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Riwayat perubahan status" />
            <CardBody>
              <ol className="space-y-4">
                {order.statusHistory.map((history, index) => (
                  <li key={history.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1 flex h-2.5 w-2.5 rounded-full ${
                          index === order.statusHistory.length - 1
                            ? "bg-brand-blue"
                            : "bg-slate-300"
                        }`}
                      />
                      {index < order.statusHistory.length - 1 ? (
                        <span className="mt-1 w-px flex-1 bg-slate-200" />
                      ) : null}
                    </div>
                    <div className="min-w-0 pb-1">
                      <p className="text-sm font-medium text-slate-800">
                        {history.oldStatus
                          ? `${history.oldStatus} → ${history.newStatus}`
                          : `Status awal: ${history.newStatus}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(history.createdAt)}
                        {history.changedBy
                          ? ` · oleh ${history.changedBy.name}`
                          : ""}
                      </p>
                      {history.notes ? (
                        <p className="mt-1 text-xs text-slate-600">
                          {history.notes}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Ubah status" />
            <CardBody>
              <OrderStatusForm
                order={{ id: order.id, status: order.status }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pelanggan" />
            <CardBody className="space-y-2 text-sm">
              <p className="font-medium text-slate-800">
                {order.customer?.name}
              </p>
              <p className="text-slate-600">{order.customer?.email}</p>
              <p className="text-slate-600">{order.customer?.phone}</p>
              <Link
                href={`/admin/customers/${order.customer?.id}`}
                className="inline-block pt-1 text-sm font-medium text-brand-blue hover:underline"
              >
                Lihat semua pesanan pelanggan
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Ringkasan biaya" />
            <CardBody>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-medium tabular-nums text-slate-800">
                    {formatCurrency(order.subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Biaya tambahan</dt>
                  <dd className="font-medium tabular-nums text-slate-800">
                    {formatCurrency(order.additionalCost)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <dt className="font-medium text-slate-700">Total</dt>
                  <dd className="text-base font-semibold tabular-nums text-brand-navy">
                    {formatCurrency(order.totalPrice)}
                  </dd>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <dt className="text-slate-500">Berat aktual</dt>
                  <dd className="text-slate-700">
                    {order.weight === null
                      ? "Menunggu penimbangan"
                      : formatWeight(order.weight)}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pembayaran" />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <PaymentStatusBadge status={order.payment?.status} />
              </div>
              {hasPendingWeight ? (
                <Alert variant="warning">
                  Pesanan belum ditimbang, sehingga pelanggan belum dapat
                  mengunggah bukti transfer. Total tagihan masih sementara.
                </Alert>
              ) : null}
              {order.payment?.rejectionReason ? (
                <Alert variant="error">
                  Alasan penolakan: {order.payment.rejectionReason}
                </Alert>
              ) : null}
              <Link
                href={`/admin/payments/${order.payment?.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <CreditCard className="h-4 w-4" />
                Buka halaman pembayaran
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Catatan" />
            <CardBody className="space-y-3 text-sm">
              <div>
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">
                  <FileText className="h-3.5 w-3.5" /> Catatan pelanggan
                </p>
                <p className="mt-1 text-slate-700">
                  {order.customerNotes || "-"}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-500">
                  <Printer className="h-3.5 w-3.5" /> Catatan admin
                </p>
                <p className="mt-1 text-slate-700">{order.adminNotes || "-"}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Log notifikasi pesanan" />
        <CardBody className="p-0">
          {order.notificationLogs.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">
              Belum ada percobaan notifikasi untuk pesanan ini.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Waktu</th>
                    <th className="px-4 py-3 font-medium">Event</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.notificationLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {log.eventKey}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            log.status === "SENT"
                              ? "success"
                              : log.status === "FAILED"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {log.status}
                          {log.isDryRun ? " (simulasi)" : ""}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {log.errorMessage ||
                          log.providerResponse ||
                          "Percobaan dikirim."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
