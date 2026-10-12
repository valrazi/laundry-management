import { PAYMENT_STATUS_BADGE, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import Badge from "./Badge";

export default function PaymentStatusBadge({ status }) {
  if (!status) {
    return <Badge className={PAYMENT_STATUS_BADGE.UNPAID}>Belum Dibayar</Badge>;
  }
  const tone =
    PAYMENT_STATUS_BADGE[status] || "bg-slate-100 text-slate-700 ring-slate-200";
  return <Badge className={tone}>{PAYMENT_STATUS_LABELS[status] || status}</Badge>;
}
