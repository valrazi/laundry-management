import { describe, expect, it } from "vitest";

import {
  extractTemplateVariables,
  renderTemplate,
  validateTemplateMessage,
} from "@/services/templateEngine";

describe("extractTemplateVariables", () => {
  it("mengambil seluruh variabel yang dipakai", () => {
    expect(
      extractTemplateVariables("Halo {{customerName}}, pesanan {{ orderNumber }}!").sort(),
    ).toEqual(["customerName", "orderNumber"]);
  });

  it("mengembalikan array kosong bila tidak ada variabel", () => {
    expect(extractTemplateVariables("Tidak ada variabel")).toEqual([]);
  });
});

describe("validateTemplateMessage", () => {
  it("menerima template dengan variabel yang didukung", () => {
    const result = validateTemplateMessage(
      "Halo {{customerName}}, pesanan {{orderNumber}} sebesar {{totalPrice}}.",
    );
    expect(result.valid).toBe(true);
    expect(result.unknownVariables).toEqual([]);
  });

  it("menolak variabel yang tidak dikenal", () => {
    const result = validateTemplateMessage(
      "Halo {{namaRahasia}}, pesanan {{orderNumber}}.",
    );
    expect(result.valid).toBe(false);
    expect(result.unknownVariables).toEqual(["namaRahasia"]);
  });
});

describe("renderTemplate", () => {
  const variables = {
    customerName: "Budi Santoso",
    orderNumber: "LDR-20261012-ABCDE",
    totalPrice: "Rp 31.500,00",
    orderUrl: "http://localhost:3000/customer/orders/abc",
  };

  it("mengganti variabel dengan nilai sebenarnya", () => {
    const message = renderTemplate(
      "Halo {{customerName}}, pesanan {{orderNumber}} total {{totalPrice}}. Lihat: {{orderUrl}}",
      variables,
    );
    expect(message).toBe(
      "Halo Budi Santoso, pesanan LDR-20261012-ABCDE total Rp 31.500,00. Lihat: http://localhost:3000/customer/orders/abc",
    );
  });

  it("mendukung spasi di dalam kurung kurawal", () => {
    expect(renderTemplate("Halo {{ customerName }}!", variables)).toBe(
      "Halo Budi Santoso!",
    );
  });

  it("tidak mengevaluasi template sebagai kode", () => {
    const message = renderTemplate("Nilai: {{customerName}}", {
      customerName: "{{orderNumber}}",
    });
    // Nilai tidak diproses ulang sebagai template.
    expect(message).toBe("Nilai: {{orderNumber}}");
  });

  it("menghapus karakter kontrol dari nilai", () => {
    const message = renderTemplate("Nama: {{customerName}}", {
      customerName: "Budi\n\tSantoso\u0000",
    });
    expect(message).toBe("Nama: Budi Santoso");
  });

  it("mengganti nilai kosong dengan tanda hubung", () => {
    expect(renderTemplate("Berat: {{weight}}", { weight: null })).toBe(
      "Berat: -",
    );
  });
});
