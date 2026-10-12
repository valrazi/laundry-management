"use server";

/** Server Action pengelolaan layanan laundry (khusus admin). */

import { revalidatePath } from "next/cache";

import { getAdminUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { actionFail, actionOk, fromParseError } from "@/lib/results";
import {
  formDataToObject,
  parseWith,
  serviceSchema,
  toggleServiceSchema,
  updateServiceSchema,
} from "@/lib/validation";

function revalidateServiceViews(serviceId) {
  revalidatePath("/admin/services");
  revalidatePath("/admin/dashboard");
  revalidatePath("/customer/orders/new");
  if (serviceId) {
    revalidatePath(`/admin/services/${serviceId}`);
  }
}

export async function createServiceAction(_previousState, formData) {
  const admin = await getAdminUser();
  if (!admin) {
    return actionFail("Anda tidak memiliki akses untuk aksi ini.");
  }

  const parsed = parseWith(serviceSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const { name, description, price, priceUnit, isActive } = parsed.data;

  const existing = await prisma.service.findFirst({
    where: { name },
    select: { id: true },
  });
  if (existing) {
    return actionFail("Nama layanan sudah digunakan.", {
      name: "Nama layanan sudah digunakan.",
    });
  }

  await prisma.service.create({
    data: {
      name,
      description: description ?? null,
      price: price.toFixed(2),
      priceUnit,
      isActive,
    },
  });

  revalidateServiceViews();
  return actionOk(`Layanan "${name}" berhasil ditambahkan.`);
}

export async function updateServiceAction(_previousState, formData) {
  const admin = await getAdminUser();
  if (!admin) {
    return actionFail("Anda tidak memiliki akses untuk aksi ini.");
  }

  const parsed = parseWith(updateServiceSchema, formDataToObject(formData));
  if (!parsed.ok) {
    return fromParseError(parsed);
  }

  const { serviceId, name, description, price, priceUnit, isActive } =
    parsed.data;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true },
  });
  if (!service) {
    return actionFail("Layanan tidak ditemukan.");
  }

  const duplicate = await prisma.service.findFirst({
    where: { name, NOT: { id: serviceId } },
    select: { id: true },
  });
  if (duplicate) {
    return actionFail("Nama layanan sudah digunakan.", {
      name: "Nama layanan sudah digunakan.",
    });
  }

  // Perubahan harga TIDAK mempengaruhi pesanan lama karena setiap item
  // pesanan menyimpan snapshot harga, satuan, dan nama layanan.
  await prisma.service.update({
    where: { id: serviceId },
    data: {
      name,
      description: description ?? null,
      price: price.toFixed(2),
      priceUnit,
      isActive,
    },
  });

  revalidateServiceViews(serviceId);
  return actionOk(`Layanan "${name}" berhasil diperbarui.`);
}

export async function toggleServiceAction(formData) {
  const admin = await getAdminUser();
  if (!admin) return;

  const parsed = parseWith(toggleServiceSchema, formDataToObject(formData));
  if (!parsed.ok) return;

  const { serviceId, isActive } = parsed.data;

  await prisma.service.update({
    where: { id: serviceId },
    data: { isActive },
  });

  revalidateServiceViews(serviceId);
}
