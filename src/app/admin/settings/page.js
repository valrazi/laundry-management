import SettingsForm from "@/components/forms/SettingsForm";
import Alert from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { getFonnteConfig } from "@/lib/fonnte";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Pengaturan" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const fonnte = getFonnteConfig();

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Informasi pembayaran dan status integrasi WhatsApp."
      />

      <Card>
        <CardHeader
          title="Pembayaran & integrasi"
          description="Nilai di bawah dapat diubah tanpa mengubah kode program."
        />
        <CardBody>
          <SettingsForm settings={settings} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Status integrasi Fonnte (hanya baca)"
          description="Kredensial tidak pernah ditampilkan pada halaman ini."
        />
        <CardBody className="space-y-3 text-sm">
          <Alert variant={fonnte.dryRun ? "warning" : "info"}>
            {fonnte.dryRun
              ? "FONNTE_DRY_RUN=true — permintaan tidak dikirim ke Fonnte, hanya dicatat sebagai simulasi."
              : "FONNTE_DRY_RUN=false — permintaan dikirim ke Fonnte secara nyata."}
          </Alert>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Token Fonnte
              </dt>
              <dd className="mt-0.5 text-slate-700">
                {fonnte.token ? "Tersedia di server (disamarkan)" : "Belum diatur"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Endpoint
              </dt>
              <dd className="mt-0.5 break-all text-slate-700">
                {fonnte.apiUrl}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Batas waktu request
              </dt>
              <dd className="mt-0.5 text-slate-700">{fonnte.timeoutMs} ms</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Maksimal ukuran bukti transfer
              </dt>
              <dd className="mt-0.5 text-slate-700">
                {process.env.MAX_UPLOAD_SIZE_MB || "5"} MB
              </dd>
            </div>
          </dl>

          <p className="text-xs text-slate-500">
            Untuk mengubah token, ubah variabel lingkungan <code>FONNTE_TOKEN</code>{" "}
            pada file <code>.env</code> lalu jalankan ulang server. Token tidak
            disimpan di database agar tidak pernah terekspos ke klien.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
