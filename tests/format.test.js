import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatWeight,
  isValidPhone,
  maskPhone,
  normalizePhone,
} from "@/lib/format";

describe("normalizePhone", () => {
  it("mengubah nomor lokal menjadi format internasional", () => {
    expect(normalizePhone("081234567890")).toBe("6281234567890");
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("0812 3456 7890")).toBe("6281234567890");
  });

  it("tidak menggandakan kode negara", () => {
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("6281234567890");
  });

  it("menambahkan prefix untuk nomor yang diawali 8", () => {
    expect(normalizePhone("81234567890")).toBe("6281234567890");
  });

  it("mempertahankan nomor internasional lain", () => {
    expect(normalizePhone("+14155552671")).toBe("14155552671");
  });

  it("mengembalikan string kosong untuk input tidak valid", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone("abc")).toBe("");
  });
});

describe("isValidPhone", () => {
  it("menerima nomor Indonesia yang wajar", () => {
    expect(isValidPhone("081234567890")).toBe(true);
  });

  it("menolak nomor terlalu pendek", () => {
    expect(isValidPhone("0812")).toBe(false);
  });
});

describe("maskPhone", () => {
  it("menyamarkan bagian tengah nomor", () => {
    expect(maskPhone("081234567890")).toBe("62812****890");
  });
});

describe("formatCurrency", () => {
  it("memakai kelas Intl id-ID dengan mata uang IDR", () => {
    const value = formatCurrency("31500.00");
    expect(value).toContain("Rp");
    expect(value).toContain("31.500");
  });

  it("menangani nilai kosong", () => {
    expect(formatCurrency(null)).toContain("Rp");
  });
});

describe("formatWeight", () => {
  it("menampilkan satuan kilogram", () => {
    expect(formatWeight("4.5")).toBe("4,5 kg");
  });

  it("menampilkan tanda hubung bila belum ada berat", () => {
    expect(formatWeight(null)).toBe("-");
  });
});
