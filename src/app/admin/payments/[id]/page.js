import Link from "next/link";
import { notFound } from "next/navigation";

import PaymentReviewForm from "@/components/forms/PaymentReviewForm";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ArrowLeft, Download } from "@/components/ui/icons";
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import PageHeader from "@/components/ui/PageHeader";
import PaymentStatusBadge from "@/components/ui/PaymentStatusBadge";
import {
  PAYMENT_REVIEW_ACTION_LABELS,
} from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getPaymentDetail } from "@/services/paymentService";

export const metadata = { title: "Detail Pembayaran" };

export default async function AdminPaymentDetailPage({ params }) {
  const { id } = await params;
  const payment = await getPaymentDetail(id);

  if (!payment) {
    notFound();
  }

  const hasProof = Boolean(payment.proofFilePath);

  return (
    <>
      <PageHeader
        title={`Pembayaran ${payment.order?.orderNumber ?? ""}`}
        description={`Tagihan ${formatCurrency(payment.amount)}`}
        action={
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Bukti transfer"
              description="File hanya dapat diakses oleh admin dan pemilik pesanan."
            />
            <CardBody>
              {hasProof ? (
                <div className="space-y-3">
                  {/* Route handler memeriksa autentikasi & kepemilikan. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/receipts/${payment.id}`}
                    alt={`Bukti transfer ${payment.order?.orderNumber ?? ""}`}
                    className="max-h-[28rem] w-full rounded-lg border border-slate-200 object-contain"
                  />
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Nama asli: {payment.proofOriginalName || "-"}</span>
                    <span>Tipe: {payment.proofMimeType || "-"}</span>
                    <span>
                      Ukuran:{" "}
                      {payment.proofSize
                        ? `${Math.round(payment.proofSize / 1024)} KB`
                        : "-"}
                    </span>
                    <a
                      href={`/api/receipts/${payment.id}?download=1`}
                      className="inline-flex items-center gap-1 font-medium text-brand-blue hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Unduh bukti
                    </a>
                  </div>
                </div>
              ) : (
                <Alert variant="info">
                  Pelanggan belum mengunggah bukti transfer untuk pesanan ini.
                </Alert>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Riwayat keputusan pembayaran" />
            <CardBody className="p-0">
              {payment.reviews.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">
                  Belum ada riwayat keputusan untuk pembayaran ini.
                </p>
              ) : (
                <div className="table-scroll">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Waktu</th>
                        <th className="px-4 py-3 font-medium">Keputusan</th>
                        <th className="px-4 py-3 font-medium">Nominal</th>
                        <th className="px-4 py-3 font-medium">Oleh</th>
                        <th className="px-4 py-3 font-medium">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payment.reviews.map((review) => (
                        <tr key={review.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            {formatDateTime(review.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                review.action === "REJECTED"
                                  ? "danger"
                                  : review.action === "VERIFIED"
                                    ? "success"
                                    : "neutral"
                              }
                            >
                              {PAYMENT_REVIEW_ACTION_LABELS[review.action] ??
                                review.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-700">
                            {formatCurrency(review.amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {review.reviewedBy?.name ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {review.reason || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Status pembayaran" />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <PaymentStatusBadge status={payment.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Nominal tagihan</span>
                <span className="font-medium tabular-nums text-slate-800">
                  {formatCurrency(payment.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Diunggah</span>
                <span className="text-sm text-slate-700">
                  {payment.proofUploadedAt
                    ? formatDateTime(payment.proofUploadedAt)
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Diverifikasi oleh</span>
                <span className="text-sm text-slate-700">
                  {payment.verifiedBy?.name ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Waktu verifikasi
                </span>
                <span className="text-sm text-slate-700">
                  {payment.verifiedAt
                    ? formatDateTime(payment.verifiedAt)
                    : "-"}
                </span>
              </div>
              {payment.rejectionReason ? (
                <Alert variant="error">
                  Alasan penolakan terakhir: {payment.rejectionReason}
                </Alert>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Keputusan admin" />
            <CardBody>
              <PaymentReviewForm
                payment={{
                  id: payment.id,
                  status: payment.status,
                  hasProof,
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pesanan terkait" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nomor</span>
                <Link
                  href={`/admin/orders/${payment.order?.id}`}
                  className="font-medium text-brand-blue hover:underline"
                >
                  {payment.order?.orderNumber}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pelanggan</span>
                <span className="text-slate-700">
                  {payment.order?.customer?.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status pesanan</span>
                <OrderStatusBadge status={payment.order?.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total pesanan</span>
                <span className="font-medium tabular-nums text-slate-800">
                  {formatCurrency(payment.order?.totalPrice)}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
