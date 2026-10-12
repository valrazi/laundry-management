import { describe, expect, it } from "vitest";

import {
  checkboxField,
  createOrderSchema,
  formDataToObject,
  loginSchema,
  parseWith,
  registerSchema,
  rejectPaymentSchema,
  serviceSchema,
  settingsSchema,
  updateOrderDetailsSchema,
} from "@/lib/validation";

describe("registerSchema", () => {
  const valid = {
    name: "Budi Santoso",
    email: "  Budi@Example.Test ",
    phone: "0812-3456-7890",
    password: "Rahasia123",
    confirmPassword: "Rahasia123",
  };

  it("menerima data valid dan menormalkan email serta nomor telepon", () => {
    const parsed = parseWith(registerSchema, valid);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.email).toBe("budi@example.test");
    expect(parsed.data.phone).toBe("6281234567890");
  });

  it("TIDAK meneruskan field role/status yang dikirim dari browser", () => {
    const parsed = parseWith(registerSchema, {
      ...valid,
      role: "ADMIN",
      isActive: false,
      passwordHash: "apa-saja",
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.data.role).toBeUndefined();
    expect(parsed.data.isActive).toBeUndefined();
    expect(parsed.data.passwordHash).toBeUndefined();
  });

  it("menolak konfirmasi password yang berbeda", () => {
    const parsed = parseWith(registerSchema, {
      ...valid,
      confirmPassword: "Rahasia124",
    });
    expect(parsed.ok).toBe(false);
    expect(parsed.fieldErrors.confirmPassword).toBeTruthy();
  });

  it("menolak password tanpa angka", () => {
    const parsed = parseWith(registerSchema, {
      ...valid,
      password: "hanyaHurufSaja",
    });
    expect(parsed.ok).toBe(false);
    expect(parsed.fieldErrors.password).toBeTruthy();
  });

  it("menolak nomor WhatsApp yang tidak valid", () => {
    const parsed = parseWith(registerSchema, { ...valid, phone: "123" });
    expect(parsed.ok).toBe(false);
    expect(parsed.fieldErrors.phone).toBeTruthy();
  });
});

describe("loginSchema", () => {
  it("menerima email dan password", () => {
    expect(parseWith(loginSchema, { email: "a@b.test", password: "x" }).ok).toBe(
      true,
    );
  });

  it("menolak email tidak valid", () => {
    expect(parseWith(loginSchema, { email: "bukan-email", password: "x" }).ok).toBe(
      false,
    );
  });
});

describe("checkboxField", () => {
  it("menganggap 'on' dan 'true' sebagai nilai benar", () => {
    expect(checkboxField.parse("on")).toBe(true);
    expect(checkboxField.parse("true")).toBe(true);
    expect(checkboxField.parse("1")).toBe(true);
  });

  it("menganggap nilai tidak ada sebagai salah", () => {
    expect(checkboxField.parse(undefined)).toBe(false);
    expect(checkboxField.parse("false")).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("menerima daftar layanan dengan jumlah item", () => {
    const parsed = parseWith(createOrderSchema, {
      items: [{ serviceId: "svc-1", quantity: 2 }],
      customerNotes: "Tanpa pewangi",
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.data.items[0].quantity).toBe(2);
  });

  it("menolak pesanan tanpa layanan", () => {
    const parsed = parseWith(createOrderSchema, { items: [] });
    expect(parsed.ok).toBe(false);
  });

  it("mengizinkan quantity null untuk layanan berbasis berat", () => {
    const parsed = parseWith(createOrderSchema, {
      items: [{ serviceId: "svc-1", quantity: null }],
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.data.items[0].quantity).toBeNull();
  });
});

describe("updateOrderDetailsSchema", () => {
  it("mengubah string kosong menjadi null, bukan 0", () => {
    const parsed = parseWith(updateOrderDetailsSchema, {
      orderId: "order-1",
      additionalCost: "5000",
      adminNotes: "",
      items: [{ id: "item-1", weight: "", quantity: "3" }],
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.data.items[0].weight).toBeNull();
    expect(parsed.data.items[0].quantity).toBe(3);
    expect(parsed.data.adminNotes).toBeNull();
  });

  it("menolak biaya tambahan negatif", () => {
    const parsed = parseWith(updateOrderDetailsSchema, {
      orderId: "order-1",
      additionalCost: "-1",
      items: [],
    });
    expect(parsed.ok).toBe(false);
  });
});

describe("serviceSchema", () => {
  it("menerima layanan lengkap", () => {
    const parsed = parseWith(serviceSchema, {
      name: "Cuci Kering",
      description: "",
      price: "7000",
      priceUnit: "KG",
      isActive: "on",
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.data.price).toBe(7000);
    expect(parsed.data.description).toBeNull();
    expect(parsed.data.isActive).toBe(true);
  });

  it("menolak harga yang bukan angka", () => {
    const parsed = parseWith(serviceSchema, {
      name: "Cuci Kering",
      price: "gratis",
      priceUnit: "KG",
    });
    expect(parsed.ok).toBe(false);
  });

  it("menolak satuan harga yang tidak dikenal", () => {
    const parsed = parseWith(serviceSchema, {
      name: "Cuci Kering",
      price: "7000",
      priceUnit: "TON",
    });
    expect(parsed.ok).toBe(false);
  });
});

describe("rejectPaymentSchema", () => {
  it("mewajibkan alasan penolakan yang jelas", () => {
    expect(
      parseWith(rejectPaymentSchema, { paymentId: "p1", reason: "no" }).ok,
    ).toBe(false);
    expect(
      parseWith(rejectPaymentSchema, {
        paymentId: "p1",
        reason: "Nominal transfer tidak sesuai tagihan.",
      }).ok,
    ).toBe(true);
  });
});

describe("settingsSchema", () => {
  it("menerima pengaturan pembayaran lengkap", () => {
    const parsed = parseWith(settingsSchema, {
      payment_bank_name: "Bank BCA",
      payment_account_number: "1234567890",
      payment_account_name: "Laundry Jaya",
      payment_instructions: "Transfer lalu unggah bukti transfer.",
      whatsapp_enabled: "on",
    });
    expect(parsed.ok).toBe(true);
    expect(parsed.data.whatsapp_enabled).toBe(true);
  });
});

describe("formDataToObject", () => {
  it("mengubah FormData menjadi objek sederhana", () => {
    const formData = new FormData();
    formData.set("name", "Budi");
    formData.set("email", "budi@test.test");
    formData.set("file", new Blob(["x"]), "bukti.png");

    const result = formDataToObject(formData);
    expect(result).toEqual({ name: "Budi", email: "budi@test.test" });
  });
});
