import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  ROLES,
} from "@/lib/constants";
import { formatCurrency, formatDateTime, formatWeight } from "@/lib/format";
import { readListQuery } from "@/lib/query";
import { getReportData, toCsv } from "@/services/reportService";

/** Ekspor CSV laporan pesanan (khusus admin, mengikuti filter yang sama). */

const COLUMNS = [
  { label: "Nomor Pesanan", value: (row) => row.orderNumber },
  { label: "Tanggal Dibuat", value: (row) => formatDateTime(row.createdAt) },
  { label: "Pelanggan", value: (row) => row.customer?.name ?? "-" },
  { label: "Email", value: (row) => row.customer?.email ?? "-" },
  { label: "WhatsApp", value: (row) => row.customer?.phone ?? "-" },
  {
    label: "Status Pesanan",
    value: (row) => ORDER_STATUS_LABELS[row.status] ?? row.status,
  },
  {
    label: "Status Pembayaran",
    value: (row) =>
      row.payment?.status
        ? PAYMENT_STATUS_LABELS[row.payment.status] ?? row.payment.status
        : "Belum Dibayar",
  },
  { label: "Berat Aktual", value: (row) => formatWeight(row.weight) },
  { label: "Subtotal", value: (row) => formatCurrency(row.subtotal) },
  {
    label: "Biaya Tambahan",
    value: (row) => formatCurrency(row.additionalCost),
  },
  { label: "Total", value: (row) => formatCurrency(row.totalPrice) },
  { label: "Jumlah Layanan", value: (row) => row._count?.items ?? 0 },
  {
    label: "Selesai Pada",
    value: (row) => (row.completedAt ? formatDateTime(row.completedAt) : "-"),
  },
];

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user || user.role !== ROLES.ADMIN) {
    return NextResponse.json(
      { error: "Anda tidak memiliki akses ke laporan ini." },
      { status: 403 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const query = readListQuery({
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    status: searchParams.get("status") ?? "",
    paymentStatus: searchParams.get("paymentStatus") ?? "",
  });

  const report = await getReportData(query);
  const csv = toCsv(report.rows, COLUMNS);

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-pesanan-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
