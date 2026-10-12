import { existsSync, unlinkSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ORDER_STATUS, PAYMENT_STATUS, PRICE_UNITS, ROLES } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { resolveReceiptAbsolutePath } from "@/lib/uploads";
import { createOrder, getAdminOrderDetail, updateOrderDetails } from "@/services/orderService";
import {
  getPaymentDetail,
  rejectPayment,
  submitPaymentReceipt,
  verifyPayment,
} from "@/services/paymentService";
import { getVerifiedRevenue } from "@/services/reportService";

import {
  buildPngBuffer,
  createCustomerWithPassword,
  createService,
  createTemplate,
  createUser,
  enableWhatsApp,
  resetDatabase,
} from "./helpers";

let customer;
let otherCustomer;
let admin;
let itemService;
let kgService;

const uploadedFiles = new Set();

function uploadFile(buffer, name = "bukti.png", type = "image/png") {
  return {
    name,
    type,
    size: buffer.length,
    arrayBuffer: async () =>
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  };
}

beforeAll(async () => {
  await resetDatabase();

  customer = (
    await createCustomerWithPassword({ email: "bayar-a@test.test" })
  ).user;
  otherCustomer = (
    await createCustomerWithPassword({ email: "bayar-b@test.test" })
  ).user;
  admin = await createUser({ role: ROLES.ADMIN, email: "admin-bayar@test.test" });

  itemService = await createService({
    name: "Cuci Sepatu Bayar",
    price: "25000.00",
    priceUnit: PRICE_UNITS.ITEM,
  });

  kgService = await createService({
    name: "Kiloan Uji",
    price: "5000.00",
    priceUnit: PRICE_UNITS.KG,
  });

  await enableWhatsApp();
  await createTemplate({ eventKey: "ORDER_CREATED" });
  await createTemplate({ eventKey: "PAYMENT_PAID" });
  await createTemplate({ eventKey: "PAYMENT_REJECTED" });
});

afterAll(async () => {
  for (const storedPath of uploadedFiles) {
    const absolute = resolveReceiptAbsolutePath(storedPath);
    if (absolute && existsSync(absolute)) {
      try {
        unlinkSync(absolute);
      } catch {
        // abaikan
      }
    }
  }
  await prisma.$disconnect();
});

async function newOrder(orderCustomer = customer) {
  const result = await createOrder({
    customerId: orderCustomer.id,
    items: [{ serviceId: itemService.id, quantity: 2 }],
  });
  expect(result.ok).toBe(true);
  return result.order;
}

describe("submitPaymentReceipt", () => {
  it("menyimpan bukti transfer dan mengubah status menjadi menunggu verifikasi", async () => {
    const order = await newOrder();

    const result = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });

    expect(result.ok).toBe(true);
    expect(result.payment.status).toBe(PAYMENT_STATUS.WAITING_VERIFICATION);
    expect(result.payment.proofFilePath).toMatch(
      /^receipts\/[0-9a-f-]{36}\.png$/,
    );
    uploadedFiles.add(result.payment.proofFilePath);

    // File benar-benar tersimpan di disk.
    const absolute = resolveReceiptAbsolutePath(result.payment.proofFilePath);
    expect(existsSync(absolute)).toBe(true);

    // Riwayat pengajuan tercatat.
    const detail = await getPaymentDetail(result.payment.id);
    expect(detail.reviews.some((review) => review.action === "SUBMITTED")).toBe(
      true,
    );
  });

  it("tidak langsung menandai pembayaran sebagai lunas", async () => {
    const order = await newOrder();
    const result = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });
    uploadedFiles.add(result.payment.proofFilePath);

    expect(result.payment.status).not.toBe(PAYMENT_STATUS.PAID);
    expect(result.payment.verifiedAt).toBeNull();
  });

  it("menolak pengajuan ganda saat masih menunggu verifikasi", async () => {
    const order = await newOrder();
    const first = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });
    uploadedFiles.add(first.payment.proofFilePath);

    const second = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });

    expect(second.ok).toBe(false);
    expect(second.message).toMatch(/menunggu verifikasi/i);
  });

  it("menolak file dengan format tidak didukung", async () => {
    const order = await newOrder();

    const result = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(
        Buffer.from("%PDF-1.4 dokumen"),
        "bukti.pdf",
        "application/pdf",
      ),
    });

    expect(result.ok).toBe(false);

    const payment = await prisma.payment.findUnique({
      where: { orderId: order.id },
    });
    expect(payment.status).toBe(PAYMENT_STATUS.UNPAID);
    expect(payment.proofFilePath).toBeNull();
  });

  it("menolak unggahan untuk pesanan milik pelanggan lain", async () => {
    const order = await newOrder(customer);

    const result = await submitPaymentReceipt({
      orderId: order.id,
      customerId: otherCustomer.id,
      file: uploadFile(buildPngBuffer()),
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/tidak ditemukan/i);
  });
});

describe("validasi menunggu penimbangan", () => {
  it("menolak unggah bukti transfer selama pesanan belum ditimbang", async () => {
    const created = await createOrder({
      customerId: customer.id,
      items: [{ serviceId: kgService.id, quantity: null }],
    });
    expect(created.ok).toBe(true);

    const result = await submitPaymentReceipt({
      orderId: created.order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/menunggu penimbangan/i);

    // Tidak ada berkas tersimpan dan status pembayaran tidak berubah.
    const payment = await prisma.payment.findUnique({
      where: { orderId: created.order.id },
    });
    expect(payment.status).toBe(PAYMENT_STATUS.UNPAID);
    expect(payment.proofFilePath).toBeNull();
    expect(payment.amount.toString()).toBe("0");
  });

  it("mengizinkan unggah setelah ditimbang, dengan nominal final", async () => {
    const created = await createOrder({
      customerId: customer.id,
      items: [{ serviceId: kgService.id, quantity: null }],
    });

    const before = await getAdminOrderDetail(created.order.id);
    expect(before.weight).toBeNull();

    // Admin menimbang dan mencatat berat aktual.
    const updated = await updateOrderDetails({
      orderId: created.order.id,
      additionalCost: "0",
      adminNotes: null,
      items: [{ id: before.items[0].id, weight: "4.00", quantity: null }],
    });
    expect(updated.ok).toBe(true);

    const result = await submitPaymentReceipt({
      orderId: created.order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });

    expect(result.ok).toBe(true);
    uploadedFiles.add(result.payment.proofFilePath);
    expect(result.payment.status).toBe(PAYMENT_STATUS.WAITING_VERIFICATION);
    // 4 kg x Rp 5.000 = Rp 20.000
    expect(result.payment.amount.toString()).toBe("20000");
  });

  it("tetap mengizinkan unggah untuk pesanan tanpa layanan KG", async () => {
    const order = await newOrder();
    const result = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });

    expect(result.ok).toBe(true);
    uploadedFiles.add(result.payment.proofFilePath);
  });
});

describe("verifyPayment", () => {
  it("menandai lunas, mencatat verifikator, dan mengirim notifikasi", async () => {
    const order = await newOrder();
    const submitted = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });
    uploadedFiles.add(submitted.payment.proofFilePath);

    const result = await verifyPayment({
      paymentId: submitted.payment.id,
      adminUserId: admin.id,
    });

    expect(result.ok).toBe(true);
    expect(result.payment.status).toBe(PAYMENT_STATUS.PAID);
    expect(result.payment.verifiedByUserId).toBe(admin.id);
    expect(result.payment.verifiedAt).not.toBeNull();

    const detail = await getPaymentDetail(submitted.payment.id);
    expect(detail.reviews.some((review) => review.action === "VERIFIED")).toBe(
      true,
    );
    expect(
      await prisma.notificationLog.count({
        where: { paymentId: submitted.payment.id, eventKey: "PAYMENT_PAID" },
      }),
    ).toBe(1);
  });

  it("tidak mengubah status pesanan secara otomatis", async () => {
    const order = await newOrder();
    const submitted = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });
    uploadedFiles.add(submitted.payment.proofFilePath);

    await verifyPayment({
      paymentId: submitted.payment.id,
      adminUserId: admin.id,
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });
    expect(updatedOrder.status).toBe(ORDER_STATUS.PENDING);
  });

  it("menolak verifikasi ulang", async () => {
    const order = await newOrder();
    const submitted = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });
    uploadedFiles.add(submitted.payment.proofFilePath);

    await verifyPayment({
      paymentId: submitted.payment.id,
      adminUserId: admin.id,
    });
    const second = await verifyPayment({
      paymentId: submitted.payment.id,
      adminUserId: admin.id,
    });

    expect(second.ok).toBe(false);
    expect(second.message).toMatch(/sudah diverifikasi/i);
  });

  it("menolak verifikasi bila belum ada bukti transfer", async () => {
    const order = await newOrder();
    const payment = await prisma.payment.findUnique({
      where: { orderId: order.id },
    });

    const result = await verifyPayment({
      paymentId: payment.id,
      adminUserId: admin.id,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/belum ada bukti transfer/i);
  });
});

describe("rejectPayment", () => {
  it("menolak pembayaran disertai alasan dan mengirim notifikasi", async () => {
    const order = await newOrder();
    const submitted = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });
    uploadedFiles.add(submitted.payment.proofFilePath);

    const result = await rejectPayment({
      paymentId: submitted.payment.id,
      adminUserId: admin.id,
      reason: "Nominal transfer tidak sesuai tagihan.",
    });

    expect(result.ok).toBe(true);
    expect(result.payment.status).toBe(PAYMENT_STATUS.REJECTED);
    expect(result.payment.rejectionReason).toBe(
      "Nominal transfer tidak sesuai tagihan.",
    );

    const detail = await getPaymentDetail(submitted.payment.id);
    expect(detail.reviews.some((review) => review.action === "REJECTED")).toBe(
      true,
    );
    expect(
      await prisma.notificationLog.count({
        where: {
          paymentId: submitted.payment.id,
          eventKey: "PAYMENT_REJECTED",
        },
      }),
    ).toBe(1);
  });

  it("mengizinkan pelanggan mengunggah ulang setelah ditolak", async () => {
    const order = await newOrder();
    const first = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });
    uploadedFiles.add(first.payment.proofFilePath);

    await rejectPayment({
      paymentId: first.payment.id,
      adminUserId: admin.id,
      reason: "Bukti transfer tidak terbaca.",
    });

    const oldAbsolute = resolveReceiptAbsolutePath(first.payment.proofFilePath);

    const second = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer(), "bukti-baru.png"),
    });
    uploadedFiles.add(second.payment.proofFilePath);

    expect(second.ok).toBe(true);
    expect(second.payment.status).toBe(PAYMENT_STATUS.WAITING_VERIFICATION);
    expect(second.payment.rejectionReason).toBeNull();
    expect(second.payment.proofFilePath).not.toBe(first.payment.proofFilePath);

    // File lama dibersihkan.
    expect(existsSync(oldAbsolute)).toBe(false);
  });

  it("menolak penolakan pembayaran yang sudah lunas", async () => {
    const order = await newOrder();
    const submitted = await submitPaymentReceipt({
      orderId: order.id,
      customerId: customer.id,
      file: uploadFile(buildPngBuffer()),
    });
    uploadedFiles.add(submitted.payment.proofFilePath);

    await verifyPayment({
      paymentId: submitted.payment.id,
      adminUserId: admin.id,
    });

    const result = await rejectPayment({
      paymentId: submitted.payment.id,
      adminUserId: admin.id,
      reason: "Mencoba menolak pembayaran lunas.",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/lunas/i);
  });
});

describe("pendapatan terverifikasi", () => {
  it("hanya menjumlahkan pembayaran berstatus lunas", async () => {
    await resetDatabase();
    await enableWhatsApp();
    await createTemplate({ eventKey: "ORDER_CREATED" });

    const localCustomer = (
      await createCustomerWithPassword({ email: "revenue@test.test" })
    ).user;
    const localService = await createService({
      name: "Layanan Pendapatan",
      price: "10000.00",
      priceUnit: PRICE_UNITS.ITEM,
    });

    const paidOrder = await createOrder({
      customerId: localCustomer.id,
      items: [{ serviceId: localService.id, quantity: 2 }],
    });
    await prisma.payment.update({
      where: { orderId: paidOrder.order.id },
      data: { status: PAYMENT_STATUS.PAID, amount: "20000", verifiedAt: new Date() },
    });

    const unpaidOrder = await createOrder({
      customerId: localCustomer.id,
      items: [{ serviceId: localService.id, quantity: 5 }],
    });
    await prisma.payment.update({
      where: { orderId: unpaidOrder.order.id },
      data: { status: PAYMENT_STATUS.WAITING_VERIFICATION, amount: "50000" },
    });

    const revenue = await getVerifiedRevenue();
    expect(revenue.toString()).toBe("20000");
  });
});
