import Link from "next/link";
import { notFound } from "next/navigation";

import ReceiptUploadForm from "@/components/forms/ReceiptUploadForm";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  ArrowLeft,
  Clock,
  Download,
} from "@/components/ui/icons";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import ServiceIcon from "@/components/ui/ServiceIcon";
import { requireCustomer } from "@/lib/auth";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PRICE_UNIT_SHORT,
  PRICE_UNITS,
} from "@/lib/constants";
import { formatCurrency, formatDateTime, formatWeight } from "@/lib/format";
import { getPaymentInfo } from "@/lib/settings";
import { getMaxUploadSizeMb } from "@/lib/uploads";
import {
  getCustomerOrderDetail,
  isAwaitingWeighing,
} from "@/services/orderService";

export const metadata = { title: "Detail Pesanan" };

export default async function CustomerOrderDetailPage({ params }) {
  const { id } = await params;
  const user = await requireCustomer();

  // Pemeriksaan kepemilikan dilakukan di server: query menyertakan customerId.
  const order = await getCustomerOrderDetail(user.id, id);
  if (!order) {
    notFound();
  }

  const paymentInfo = await getPaymentInfo();

  // Total biaya belum final selama masih ada layanan KG yang belum ditimbang,
  // sehingga bukti transfer belum boleh diunggah.
  const hasPendingWeight = isAwaitingWeighing(order);

  const paymentStatus = order.payment?.status ?? PAYMENT_STATUS.UNPAID;
  const isCancelled = order.status === ORDER_STATUS.CANCELLED;

  /**
   * Menentukan tampilan bagian pembayaran (satu tempat agar urutan
   * prioritasnya jelas).
   */
  const paymentAction =
    paymentStatus === PAYMENT_STATUS.PAID
      ? "paid"
      : paymentStatus === PAYMENT_STATUS.WAITING_VERIFICATION
        ? "waiting"
        : isCancelled
          ? "cancelled"
          : hasPendingWeight
            ? "pending-weight"
            : "upload";

  const amountLabel = hasPendingWeight
    ? `${formatCurrency(order.totalPrice)} (sementara)`
    : formatCurrency(order.totalPrice);

  return (
    <>
      <Link
        href="/customer/orders"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar pesanan
      </Link>

      <PageHeader
        title={order.orderNumber}
        description={`Dibuat ${formatDateTime(order.createdAt)}`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={paymentStatus} />
        {hasPendingWeight ? (
          <Badge tone="warning">
            <Clock className="h-3.5 w-3.5" />
            Menunggu penimbangan
          </Badge>
        ) : null}
      </div>

      {/*
        Urutan DOM: bagian pembayaran lebih dulu agar langsung terlihat pada
        layar ponsel. Pada layar besar, `lg:order-*` menukar posisi sehingga
        kolom lebar berada di kiri.
      */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:order-2">
          <Card>
            <CardHeader title="Rincian biaya" />
            <CardBody>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="tabular-nums text-slate-800">
                    {formatCurrency(order.subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Biaya tambahan</dt>
                  <dd className="tabular-nums text-slate-800">
                    {formatCurrency(order.additionalCost)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
                  <dt className="font-medium text-slate-700">Total</dt>
                  <dd className="text-base font-semibold tabular-nums text-brand-navy">
                    {amountLabel}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <dt className="text-slate-500">Berat aktual</dt>
                  <dd className="text-slate-700">
                    {order.weight === null
                      ? "Menunggu penimbangan"
                      : formatWeight(order.weight)}
                  </dd>
                </div>
              </dl>

              {hasPendingWeight ? (
                <Alert variant="info" className="mt-3">
                  Total di atas belum final karena berat aktual belum ditimbang
                  admin.
                </Alert>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Pembayaran"
              description={
                paymentAction === "upload"
                  ? "Transfer ke rekening berikut, lalu unggah buktinya."
                  : paymentAction === "pending-weight"
                    ? "Total biaya belum final karena pesanan belum ditimbang."
                    : "Rincian pembayaran pesanan ini."
              }
            />
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Status</span>
                <PaymentStatusBadge status={paymentStatus} />
              </div>

              {order.payment?.rejectionReason ? (
                <Alert variant="error">
                  Alasan penolakan: {order.payment.rejectionReason}
                </Alert>
              ) : null}

              <div className="rounded-lg bg-slate-50 p-3.5">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Transfer ke
                </p>
                <p className="mt-1 font-medium text-slate-800">
                  {paymentInfo.bankName}
                </p>
                <p className="font-mono text-base text-brand-navy">
                  {paymentInfo.accountNumber}
                </p>
                <p className="text-slate-600">a.n. {paymentInfo.accountName}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Nominal: <span className="font-medium">{amountLabel}</span>
                </p>
              </div>

              <p className="text-sm text-slate-600">
                {paymentInfo.instructions}
              </p>

              {order.payment?.proofFilePath ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/receipts/${order.payment.id}`}
                    alt="Bukti transfer yang diunggah"
                    className="max-h-72 w-full rounded-lg border border-slate-200 object-contain"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={`/api/receipts/${order.payment.id}?download=1`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Unduh bukti transfer
                    </a>
                    <span className="text-xs text-slate-500">
                      Diunggah {formatDateTime(order.payment.proofUploadedAt)}
                    </span>
                  </div>
                </div>
              ) : null}

              {paymentAction === "upload" ? (
                <div className="border-t border-slate-200 pt-4">
                  <ReceiptUploadForm
                    orderId={order.id}
                    maxSizeMb={getMaxUploadSizeMb()}
                  />
                </div>
              ) : paymentAction === "waiting" ? (
                <Alert variant="info">
                  Bukti transfer sedang menunggu verifikasi admin.
                </Alert>
              ) : paymentAction === "paid" ? (
                <Alert variant="success">
                  Pembayaran pesanan ini sudah diverifikasi lunas.
                </Alert>
              ) : paymentAction === "pending-weight" ? (
                <Alert variant="warning">
                  Pesanan Anda masih <strong>menunggu penimbangan</strong>. Bukti
                  transfer dapat diunggah setelah admin selesai menimbang, agar
                  nominal yang dibayar sudah pasti.
                </Alert>
              ) : (
                <Alert variant="info">
                  Pesanan ini sudah dibatalkan sehingga tidak memerlukan
                  pembayaran.
                </Alert>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5 lg:order-1 lg:col-span-2">
          <Card>
            <CardHeader title="Layanan" />

            {/* Tampilan ponsel: daftar kartu */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {order.items.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <ServiceIcon
                          name={item.serviceNameSnapshot}
                          priceUnit={item.priceUnitSnapshot}
                          size="xs"
                        />
                        {item.serviceNameSnapshot}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatCurrency(item.priceSnapshot)}
                        {PRICE_UNIT_SHORT[item.priceUnitSnapshot] ?? ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {item.priceUnitSnapshot === PRICE_UNITS.KG
                      ? item.weight === null
                        ? "Berat belum ditimbang"
                        : `Berat aktual: ${formatWeight(item.weight)}`
                      : `Jumlah: ${item.quantity ?? 0} item`}
                  </p>
                </li>
              ))}
            </ul>

            {/* Tampilan tablet/desktop: tabel */}
            <div className="table-scroll hidden md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Layanan</th>
                    <th className="px-5 py-3 font-medium">Harga satuan</th>
                    <th className="px-5 py-3 font-medium">Berat / Jumlah</th>
                    <th className="px-5 py-3 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <p className="flex items-center gap-2 font-medium text-slate-800">
                          <ServiceIcon
                            name={item.serviceNameSnapshot}
                            priceUnit={item.priceUnitSnapshot}
                            size="xs"
                          />
                          {item.serviceNameSnapshot}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {formatCurrency(item.priceSnapshot)}
                        {PRICE_UNIT_SHORT[item.priceUnitSnapshot] ?? ""}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {item.priceUnitSnapshot === PRICE_UNITS.KG
                          ? item.weight === null
                            ? "Menunggu penimbangan"
                            : formatWeight(item.weight)
                          : `${item.quantity ?? 0} item`}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Riwayat status pesanan" />
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
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Catatan pesanan" />
            <CardBody className="text-sm">
              <p className="text-slate-700">
                {order.customerNotes || "Tidak ada catatan."}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
