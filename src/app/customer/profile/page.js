import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
import ProfileForm from "@/components/forms/ProfileForm";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { requireCustomer } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Profil" };

export default async function CustomerProfilePage() {
  const user = await requireCustomer();

  return (
    <>
      <PageHeader
        title="Profil Saya"
        description="Perbarui data kontak dan keamanan akun Anda."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Data profil"
            description="Nomor WhatsApp dan email harus unik antar akun."
          />
          <CardBody>
            <ProfileForm
              user={{
                name: user.name,
                email: user.email,
                phone: user.phone,
              }}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Keamanan akun" />
            <CardBody>
              <ChangePasswordForm />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Informasi akun" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Role</span>
                <Badge tone="navy">{ROLE_LABELS[user.role] ?? user.role}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Terdaftar sejak</span>
                <span className="text-slate-700">
                  {formatDateTime(user.createdAt)}
                </span>
              </div>
              <Alert variant="info">
                Role dan status akun hanya dapat diubah oleh admin.
              </Alert>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
