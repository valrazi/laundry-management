import { describe, expect, it } from "vitest";

import { PRICE_UNITS } from "@/lib/constants";
import {
  calculateOrderTotals,
  canTransition,
  computeItemSubtotal,
  isActiveStatus,
} from "@/services/orderService";
import {
  buildOrderNumber,
  extractOrderSequence,
  formatOrderSequence,
  resolveOrderCodePrefix,
} from "@/lib/orderCode";

describe("computeItemSubtotal", () => {
  it("menghitung subtotal layanan per kilogram", () => {
    const subtotal = computeItemSubtotal({
      priceUnitSnapshot: PRICE_UNITS.KG,
      priceSnapshot: "7000.00",
      weight: "4.5",
      quantity: null,
    });
    expect(subtotal.toFixed(2)).toBe("31500.00");
  });

  it("menghitung subtotal layanan per item", () => {
    const subtotal = computeItemSubtotal({
      priceUnitSnapshot: PRICE_UNITS.ITEM,
      priceSnapshot: "25000.00",
      quantity: 3,
      weight: null,
    });
    expect(subtotal.toFixed(2)).toBe("75000.00");
  });

  it("mengembalikan 0 untuk layanan KG yang belum ditimbang", () => {
    const subtotal = computeItemSubtotal({
      priceUnitSnapshot: PRICE_UNITS.KG,
      priceSnapshot: "7000.00",
      weight: null,
      quantity: null,
    });
    expect(subtotal.toFixed(2)).toBe("0.00");
  });

  it("tidak memakai aritmetika floating point", () => {
    const totals = calculateOrderTotals([
      {
        priceUnitSnapshot: PRICE_UNITS.KG,
        priceSnapshot: "0.1",
        weight: "0.1",
      },
    ]);
    // with float: 0.1 * 0.1 === 0.010000000000000002
    expect(totals.subtotal.toString()).toBe("0.01");
  });
});

describe("calculateOrderTotals", () => {
  it("menjumlahkan beberapa layanan dengan satuan berbeda", () => {
    const totals = calculateOrderTotals(
      [
        {
          priceUnitSnapshot: PRICE_UNITS.KG,
          priceSnapshot: "7000.00",
          weight: "2.00",
        },
        {
          priceUnitSnapshot: PRICE_UNITS.ITEM,
          priceSnapshot: "25000.00",
          quantity: 2,
        },
      ],
      "5000.00",
    );

    expect(totals.subtotal.toFixed(2)).toBe("64000.00");
    expect(totals.totalPrice.toFixed(2)).toBe("69000.00");
    expect(totals.weight.toFixed(2)).toBe("2.00");
    expect(totals.hasPendingWeight).toBe(false);
  });

  it("menandai berat belum ditimbang dan tidak mengarang total KG", () => {
    const totals = calculateOrderTotals([
      {
        priceUnitSnapshot: PRICE_UNITS.KG,
        priceSnapshot: "7000.00",
        weight: null,
      },
      {
        priceUnitSnapshot: PRICE_UNITS.ITEM,
        priceSnapshot: "25000.00",
        quantity: 1,
      },
    ]);

    expect(totals.subtotal.toFixed(2)).toBe("25000.00");
    expect(totals.weight).toBeNull();
    expect(totals.hasPendingWeight).toBe(true);
  });

  it("berat pesanan adalah jumlah berat seluruh item KG", () => {
    const totals = calculateOrderTotals([
      { priceUnitSnapshot: PRICE_UNITS.KG, priceSnapshot: "7000.00", weight: "1.25" },
      { priceUnitSnapshot: PRICE_UNITS.KG, priceSnapshot: "5000.00", weight: "2.75" },
    ]);
    expect(totals.weight.toFixed(2)).toBe("4.00");
  });
});

describe("canTransition", () => {
  it("mengizinkan transisi pada alur normal", () => {
    expect(canTransition("PENDING", "CONFIRMED").ok).toBe(true);
    expect(canTransition("CONFIRMED", "PROCESSING").ok).toBe(true);
    expect(canTransition("PROCESSING", "READY_FOR_PICKUP").ok).toBe(true);
    expect(canTransition("READY_FOR_PICKUP", "COMPLETED").ok).toBe(true);
    expect(canTransition("PENDING", "CANCELLED").ok).toBe(true);
  });

  it("menolak transisi yang melompati tahapan", () => {
    const result = canTransition("PENDING", "COMPLETED");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/tidak dapat diubah/i);
  });

  it("menolak perubahan dari status terminal pada alur normal", () => {
    expect(canTransition("COMPLETED", "PROCESSING").ok).toBe(false);
    expect(canTransition("CANCELLED", "PENDING").ok).toBe(false);
  });

  it("menolak perubahan ke status yang sama", () => {
    expect(canTransition("PROCESSING", "PROCESSING").ok).toBe(false);
  });

  it("mengizinkan koreksi admin dan menandainya sebagai koreksi", () => {
    const result = canTransition("COMPLETED", "PROCESSING", { force: true });
    expect(result.ok).toBe(true);
    expect(result.isCorrection).toBe(true);
  });
});

describe("kode pesanan", () => {
  it("memilih prefix sesuai layanan", () => {
    expect(resolveOrderCodePrefix(["Cuci Setrika"])).toBe("CS");
    expect(resolveOrderCodePrefix(["Setrika"])).toBe("ST");
    expect(resolveOrderCodePrefix(["Express"])).toBe("EX");
    expect(resolveOrderCodePrefix(["Sprei"])).toBe("LD");
  });

  it("mengutamakan layanan Express pada pesanan campuran", () => {
    expect(resolveOrderCodePrefix(["Sprei", "Express"])).toBe("EX");
    expect(resolveOrderCodePrefix(["Setrika", "Cuci Setrika"])).toBe("CS");
  });

  it("memakai format PREFIX + YYMMDD + 2 digit nomor urut", () => {
    const date = new Date("2026-01-02T10:00:00+07:00");
    expect(buildOrderNumber({ prefix: "CS", date, sequence: 1 })).toBe(
      "CS26010201",
    );
    expect(buildOrderNumber({ prefix: "ST", date, sequence: 12 })).toBe(
      "ST26010212",
    );
    expect(buildOrderNumber({ prefix: "EX", date, sequence: 99 })).toBe(
      "EX26010299",
    );
  });

  it("menolak nomor urut di luar rentang 1-99", () => {
    expect(() => formatOrderSequence(0)).toThrow();
    expect(() => formatOrderSequence(100)).toThrow();
  });

  it("mengambil kembali nomor urut dari kode pesanan", () => {
    const date = new Date("2026-01-02T10:00:00+07:00");
    expect(extractOrderSequence("CS26010207", "CS", date)).toBe(7);
    expect(extractOrderSequence("ST26010207", "CS", date)).toBeNull();
  });
});

describe("isActiveStatus", () => {
  it("menganggap pesanan selesai/dibatalkan sebagai tidak aktif", () => {
    expect(isActiveStatus("PENDING")).toBe(true);
    expect(isActiveStatus("READY_FOR_PICKUP")).toBe(true);
    expect(isActiveStatus("COMPLETED")).toBe(false);
    expect(isActiveStatus("CANCELLED")).toBe(false);
  });
});
