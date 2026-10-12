import OrderCreateForm from "@/components/forms/OrderCreateForm";
import Alert from "@/components/ui/Alert";
import PageHeader from "@/components/ui/PageHeader";
import prisma from "@/lib/prisma";
import { serializeServicesForClient } from "@/lib/serialize";

export const metadata = { title: "Buat Pesanan" };

export default async function CustomerNewOrderPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ priceUnit: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Buat Pesanan Baru"
        description="Pilih layanan yang Anda butuhkan. Biaya akhir ditentukan setelah berat aktual ditimbang."
      />

      {services.length === 0 ? (
        <Alert variant="warning">
          Saat ini belum ada layanan aktif. Silakan hubungi admin laundry untuk
          informasi lebih lanjut.
        </Alert>
      ) : null}

      <OrderCreateForm services={serializeServicesForClient(services)} />
    </>
  );
}
