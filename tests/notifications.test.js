import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  getFonnteConfig,
  isDryRun,
  sanitizeProviderResponse,
  sendWhatsAppMessage,
} from "@/lib/fonnte";
import { PAYMENT_STATUS, PRICE_UNITS } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { createOrder, updateOrderStatus } from "@/services/orderService";

import {
  createCustomerWithPassword,
  createService,
  createTemplate,
  enableWhatsApp,
  resetDatabase,
} from "./helpers";

let customer;
let service;

const ORIGINAL_ENV = {
  dryRun: process.env.FONNTE_DRY_RUN,
  token: process.env.FONNTE_TOKEN,
};

function enableRealMode(token = "token-uji-rahasia") {
  process.env.FONNTE_DRY_RUN = "false";
  process.env.FONNTE_TOKEN = token;
}

beforeAll(async () => {
  await resetDatabase();
  customer = (
    await createCustomerWithPassword({ email: "notif@test.test" })
  ).user;
  service = await createService({
    name: "Layanan Notifikasi",
    price: "25000.00",
    priceUnit: PRICE_UNITS.ITEM,
  });
  await enableWhatsApp();
  await createTemplate({ eventKey: "ORDER_CREATED" });
  await createTemplate({ eventKey: "ORDER_CONFIRMED" });
});

afterEach(() => {
  process.env.FONNTE_DRY_RUN = ORIGINAL_ENV.dryRun ?? "true";
  process.env.FONNTE_TOKEN = ORIGINAL_ENV.token ?? "";
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("mode dry-run", () => {
  it("aktif pada konfigurasi pengujian", () => {
    expect(isDryRun()).toBe(true);
    expect(getFonnteConfig().dryRun).toBe(true);
  });

  it("menghasilkan hasil simulasi tanpa memanggil jaringan", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("jaringan tidak boleh dipanggil pada mode dry-run");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendWhatsAppMessage({
      target: "081234567890",
      message: "Halo pelanggan",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.status).toBe("SENT");
    expect(result.providerResponse).toMatch(/dry-run/i);
  });

  it("mencatat log notifikasi bertanda simulasi", async () => {
    const order = await createOrder({
      customerId: customer.id,
      items: [{ serviceId: service.id, quantity: 1 }],
    });

    const log = await prisma.notificationLog.findFirst({
      where: { orderId: order.order.id, eventKey: "ORDER_CREATED" },
    });

    expect(log).not.toBeNull();
    expect(log.status).toBe("SENT");
    expect(log.isDryRun).toBe(true);
  });
});

describe("validasi input", () => {
  it("menolak nomor tujuan yang tidak valid", async () => {
    const result = await sendWhatsAppMessage({
      target: "123",
      message: "Halo",
    });
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/nomor tujuan/i);
  });

  it("menolak pesan kosong", async () => {
    const result = await sendWhatsAppMessage({
      target: "081234567890",
      message: "   ",
    });
    expect(result.ok).toBe(false);
  });

  it("menolak pengiriman nyata tanpa token", async () => {
    process.env.FONNTE_DRY_RUN = "false";
    process.env.FONNTE_TOKEN = "";

    const result = await sendWhatsAppMessage({
      target: "081234567890",
      message: "Halo",
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/FONNTE_TOKEN/);
  });
});

describe("permintaan ke provider (fetch disimulasikan)", () => {
  it("mengirim token pada header Authorization tanpa prefix Bearer", async () => {
    enableRealMode("token-uji-rahasia");

    let captured = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, options) => {
        captured = { url, options };
        return new Response(JSON.stringify({ status: true, id: ["1"] }), {
          status: 200,
        });
      }),
    );

    const result = await sendWhatsAppMessage({
      target: "0812-3456-7890",
      message: "Halo {{nama}}",
    });

    expect(result.ok).toBe(true);
    expect(captured.options.headers.Authorization).toBe("token-uji-rahasia");
    expect(String(captured.options.headers.Authorization)).not.toContain(
      "Bearer",
    );
    expect(captured.options.headers.Authorization).not.toContain("undefined");

    const body = new URLSearchParams(String(captured.options.body));
    expect(body.get("target")).toBe("6281234567890");
    expect(body.get("message")).toBe("Halo {{nama}}");
    expect(captured.url).toContain("api.fonnte.com");
  });

  it("menangani penolakan dari provider", async () => {
    enableRealMode();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ status: false, reason: "Nomor tidak terdaftar" }),
          { status: 200 },
        ),
      ),
    );

    const result = await sendWhatsAppMessage({
      target: "081234567890",
      message: "Halo",
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("Nomor tidak terdaftar");
  });

  it("menangani respons HTTP error", async () => {
    enableRealMode();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Internal Server Error", { status: 500 })),
    );

    const result = await sendWhatsAppMessage({
      target: "081234567890",
      message: "Halo",
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/HTTP 500/);
  });

  it("menangani respons yang bukan JSON", async () => {
    enableRealMode();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>bukan json</html>", { status: 200 })),
    );

    const result = await sendWhatsAppMessage({
      target: "081234567890",
      message: "Halo",
    });

    expect(result.ok).toBe(false);
    expect(result.providerResponse).toBeTruthy();
  });

  it("menangani batas waktu permintaan", async () => {
    enableRealMode();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      }),
    );

    const result = await sendWhatsAppMessage({
      target: "081234567890",
      message: "Halo",
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/batas waktu/i);
  });

  it("menangani kegagalan jaringan", async () => {
    enableRealMode();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const result = await sendWhatsAppMessage({
      target: "081234567890",
      message: "Halo",
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/Gagal menghubungi Fonnte/i);
  });
});

describe("kegagalan provider tidak merusak transaksi", () => {
  it("pesanan tetap tersimpan dan hanya log notifikasi yang gagal", async () => {
    enableRealMode();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 503 })),
    );

    const result = await createOrder({
      customerId: customer.id,
      items: [{ serviceId: service.id, quantity: 3 }],
    });

    expect(result.ok).toBe(true);

    const order = await prisma.order.findUnique({
      where: { id: result.order.id },
      include: { items: true, statusHistory: true, payment: true },
    });

    expect(order).not.toBeNull();
    expect(order.items).toHaveLength(1);
    expect(order.statusHistory).toHaveLength(1);
    expect(order.payment.status).toBe(PAYMENT_STATUS.UNPAID);

    const log = await prisma.notificationLog.findFirst({
      where: { orderId: order.id, eventKey: "ORDER_CREATED" },
      orderBy: { createdAt: "desc" },
    });
    expect(log.status).toBe("FAILED");
    expect(log.errorMessage).toMatch(/HTTP 503/);
    expect(log.isDryRun).toBe(false);
  });

  it("perubahan status tetap tersimpan walau notifikasi gagal", async () => {
    const created = await createOrder({
      customerId: customer.id,
      items: [{ serviceId: service.id, quantity: 1 }],
    });

    enableRealMode();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const result = await updateOrderStatus({
      orderId: created.order.id,
      status: "CONFIRMED",
      actorUserId: customer.id,
    });

    expect(result.ok).toBe(true);

    const order = await prisma.order.findUnique({
      where: { id: created.order.id },
    });
    expect(order.status).toBe("CONFIRMED");
  });
});

describe("kerahasiaan data", () => {
  it("ringkasan respons provider tidak memuat token", () => {
    const snapshot = sanitizeProviderResponse(
      { status: true, detail: "ok", authorization: "token-uji-rahasia" },
      "",
    );
    expect(snapshot).not.toContain("token-uji-rahasia");
  });
});
