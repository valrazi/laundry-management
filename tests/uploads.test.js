import { afterAll, describe, expect, it } from "vitest";

import {
  deleteReceiptFile,
  detectImageType,
  resolveReceiptAbsolutePath,
  saveReceiptBuffer,
  validateReceiptBuffer,
} from "@/lib/uploads";

import {
  buildJpegBuffer,
  buildPngBuffer,
  buildWebpBuffer,
} from "./helpers";

const createdFiles = [];

afterAll(async () => {
  for (const path of createdFiles) {
    await deleteReceiptFile(path);
  }
});

describe("detectImageType", () => {
  it("mendeteksi JPEG, PNG, dan WebP dari magic bytes", () => {
    expect(detectImageType(buildJpegBuffer())?.mimeType).toBe("image/jpeg");
    expect(detectImageType(buildPngBuffer())?.mimeType).toBe("image/png");
    expect(detectImageType(buildWebpBuffer())?.mimeType).toBe("image/webp");
  });

  it("menolak isi file yang bukan gambar", () => {
    expect(detectImageType(Buffer.from("<?php echo 'x'; ?>"))).toBeNull();
    expect(detectImageType(Buffer.from("%PDF-1.4"))).toBeNull();
  });
});

describe("validateReceiptBuffer", () => {
  it("menerima PNG yang valid", () => {
    const result = validateReceiptBuffer({
      buffer: buildPngBuffer(),
      declaredMimeType: "image/png",
      originalName: "bukti.png",
    });
    expect(result.ok).toBe(true);
    expect(result.mimeType).toBe("image/png");
  });

  it("menolak ekstensi yang tidak diizinkan", () => {
    const result = validateReceiptBuffer({
      buffer: buildPngBuffer(),
      declaredMimeType: "application/pdf",
      originalName: "bukti.pdf",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/JPG, JPEG, PNG, atau WebP/i);
  });

  it("menolak file yang isinya tidak sesuai ekstensi", () => {
    const result = validateReceiptBuffer({
      buffer: buildPngBuffer(),
      declaredMimeType: "image/jpeg",
      originalName: "bukti.jpg",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/tidak sesuai/i);
  });

  it("menolak file kosong", () => {
    const result = validateReceiptBuffer({
      buffer: Buffer.alloc(0),
      declaredMimeType: "image/png",
      originalName: "bukti.png",
    });
    expect(result.ok).toBe(false);
  });

  it("menolak file yang melebihi batas ukuran", () => {
    const oversized = Buffer.concat([
      buildPngBuffer(),
      Buffer.alloc(6 * 1024 * 1024, 0),
    ]);
    const result = validateReceiptBuffer({
      buffer: oversized,
      declaredMimeType: "image/png",
      originalName: "bukti.png",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/maksimal/i);
  });
});

describe("saveReceiptBuffer", () => {
  it("menyimpan file dengan nama acak dari server, bukan nama pengguna", async () => {
    const result = await saveReceiptBuffer({
      buffer: buildPngBuffer(),
      declaredMimeType: "image/png",
      originalName: "../../berbahaya.PNG",
    });

    expect(result.ok).toBe(true);
    createdFiles.push(result.storedPath);

    // Nama file tidak memuat nama asli maupun jalur relatif.
    expect(result.storedPath).toMatch(/^receipts\/[0-9a-f-]{36}\.png$/);
    expect(result.storedPath).not.toContain("berbahaya");
    expect(result.storedPath).not.toContain("..");
  });
});

describe("resolveReceiptAbsolutePath", () => {
  it("menerima jalur yang berada di dalam folder upload", () => {
    expect(resolveReceiptAbsolutePath("receipts/abc.png")).toBeTruthy();
  });

  it("menolak upaya path traversal", () => {
    expect(resolveReceiptAbsolutePath("receipts/../../.env")).toBeNull();
    expect(resolveReceiptAbsolutePath("../../etc/passwd")).toBeNull();
  });

  it("menolak nilai kosong", () => {
    expect(resolveReceiptAbsolutePath(null)).toBeNull();
    expect(resolveReceiptAbsolutePath("")).toBeNull();
  });
});
