import { ORDER_STATUS_BADGE, ORDER_STATUS_LABELS } from "@/lib/constants";
import Badge from "./Badge";

export default function OrderStatusBadge({ status }) {
  const tone = ORDER_STATUS_BADGE[status] || "bg-slate-100 text-slate-700 ring-slate-200";
  return <Badge className={tone}>{ORDER_STATUS_LABELS[status] || status}</Badge>;
}
