import TemplateEditor from "@/components/forms/TemplateEditor";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import ConfirmButton from "@/components/ui/ConfirmButton";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { RefreshCw } from "@/components/ui/icons";
import { retryNotificationAction } from "@/actions/notification";
import { NOTIFICATION_EVENTS } from "@/lib/constants";
import { formatDateTime, maskPhone } from "@/lib/format";
import { isDryRun, isFonnteConfigured } from "@/lib/fonnte";
import prisma from "@/lib/prisma";
import { isWhatsAppEnabled } from "@/lib/settings";
import { getAppUrl } from "@/services/notificationService";

export const metadata = { title: "Template Notifikasi" };

export default async function AdminNotificationTemplatesPage() {
  const [templates, whatsappEnabled, logs, failCount] = await Promise.all([
    prisma.notificationTemplate.findMany(),
    isWhatsAppEnabled(),
    prisma.notificationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { order: { select: { orderNumber: true } } },
    }),
    prisma.notificationLog.count({ where: { status: "FAILED" } }),
  ]);

  const templateByEvent = new Map(
    templates.map((template) => [template.eventKey, template]),
  );

  const dryRun = isDryRun();
  const configured = isFonnteConfigured();
  const baseUrl = getAppUrl();

  const previewVariables = {
    customerName: "Budi Santoso",
    orderNumber: "CS26010201",
    orderStatus: "Sedang Diproses",
    serviceName: "Cuci Setrika",
    weight: "4,5 kg",
    totalPrice: "Rp 31.500,00",
    orderUrl: baseUrl
      ? `${baseUrl}/customer/orders/contoh-pesanan`
      : "(APP_URL belum diatur)",
  };

  return (
    <>
      <PageHeader
        title="Template Notifikasi WhatsApp"
        description="Ubah isi pesan tanpa mengubah kode program. Token Fonnte hanya disimpan pada environment variable."
      />

      <Alert variant={dryRun ? "warning" : "info"}>
        <p className="font-medium">
          {dryRun
            ? "Mode dry-run aktif: pesan tidak benar-benar dikirim ke Fonnte."
            : "Mode pengiriman nyata aktif."}
        </p>
        <ul className="mt-1 list-disc pl-4 text-xs">
          <li>
            Status integrasi:{" "}
            {whatsappEnabled ? "diaktifkan" : "dinonaktifkan"} (ubah di halaman
            Pengaturan).
          </li>
          <li>
            Token Fonnte:{" "}
            {configured ? "tersedia di server" : "belum dikonfigurasi"}.
          </li>
          <li>
            APP_URL: {baseUrl || "belum diatur"} — dipakai untuk{" "}
            {"{{orderUrl}}"}.
          </li>
          <li>
            {failCount} notifikasi gagal tercatat dan dapat dikirim ulang secara
            manual.
          </li>
        </ul>
      </Alert>

      <div className="space-y-6">
        {NOTIFICATION_EVENTS.map((event) => {
          const stored = templateByEvent.get(event.eventKey);
          return (
            <TemplateEditor
              key={event.eventKey}
              template={{
                eventKey: event.eventKey,
                name: stored?.name ?? event.name,
                message: stored?.message ?? event.defaultMessage,
                isActive: stored?.isActive ?? true,
              }}
              previewVariables={previewVariables}
            />
          );
        })}
      </div>

      <Card>
        <CardHeader
          title="Riwayat notifikasi"
          description="20 percobaan terakhir. Status TERKIRIM berarti provider menerima permintaan, bukan jaminan pesan dibaca pelanggan."
        />

        {logs.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Belum ada riwayat notifikasi" />
          </div>
        ) : (
          <div className="table-scroll">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Pesanan</th>
                  <th className="px-4 py-3 font-medium">Penerima</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {log.eventKey}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.order?.orderNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {maskPhone(log.recipientPhone)}
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
                    <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                      <span className="line-clamp-2">
                        {log.errorMessage || log.providerResponse || "-"}
                      </span>
                      <span className="block text-slate-400">
                        Percobaan ke-{log.attempt}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.status === "FAILED" ? (
                        <form action={retryNotificationAction}>
                          <input type="hidden" name="logId" value={log.id} />
                          <ConfirmButton
                            variant="outline"
                            message="Kirim ulang notifikasi ini memakai isi pesan aslinya?"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Kirim ulang
                          </ConfirmButton>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
