import ServiceManager from "@/components/forms/ServiceManager";
import PageHeader from "@/components/ui/PageHeader";
import { serializeServicesForClient } from "@/lib/serialize";
import prisma from "@/lib/prisma";

export const metadata = { title: "Layanan" };

export default async function AdminServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Layanan Laundry"
        description="Kelola layanan, harga, dan satuannya. Snapshot harga pada pesanan lama tetap terjaga."
      />
      <ServiceManager services={serializeServicesForClient(services)} />
    </>
  );
}
