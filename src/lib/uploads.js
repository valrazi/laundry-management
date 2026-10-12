/**
 * Penyimpanan file bukti transfer.
 *
 * Abstraction ini menyembunyikan detail penyimpanan di balik fungsi
 * sederhana sehingga dapat diganti dengan object storage di kemudian hari
 * tanpa mengubah lapisan bisnis.
 *
 * Catatan deployment: penyimpanan lokal TIDAK persisten pada lingkungan
 * serverless. Aplikasi ini ditargetkan untuk deployment satu server Node.js.
 */

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import {
  ALLOWED_RECEIPT_EXTENSIONS,
  ALLOWED_RECEIPT_MIME_TYPES,
  DEFAULT_MAX_UPLOAD_SIZE_MB,
} from "./constants";

const RECEIPT_SUBDIR = "receipts";

export function getUploadRoot() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
}

export function getMaxUploadSizeMb() {
  const value = Number(process.env.MAX_UPLOAD_SIZE_MB);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_UPLOAD_SIZE_MB;
}

export function getMaxUploadSizeBytes() {
  return getMaxUploadSizeMb() * 1024 * 1024;
}

/**
 * Deteksi tipe gambar berdasarkan magic bytes (bukan berdasarkan nama file).
 * Ini mencegah file berbahaya yang menyamar sebagai gambar.
 */
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  const isJpeg =
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  const isWebp =
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";

  if (isJpeg) return { mimeType: "image/jpeg", extension: "jpg" };
  if (isPng) return { mimeType: "image/png", extension: "png" };
  if (isWebp) return { mimeType: "image/webp", extension: "webp" };
  return null;
}

/** Ekstraksi ekstensi dari nama file yang diberikan pengguna. */
export function extensionOf(filename) {
  const name = String(filename || "");
  const index = name.lastIndexOf(".");
  if (index === -1) return "";
  return name.slice(index + 1).toLowerCase().trim();
}

/** Hanya menyimpan nama file asli yang aman untuk ditampilkan kembali. */
export function sanitizeOriginalName(filename) {
  const base = path.basename(String(filename || "bukti-transfer"));
  return base.replace(/[^\w\s.\-()]/g, "_").slice(0, 190) || "bukti-transfer";
}

/**
 * Validasi file bukti transfer: ukuran, MIME type, ekstensi, dan isi file.
 * @returns {{ok: true, mimeType: string, extension: string} | {ok: false, message: string}}
 */
export function validateReceiptBuffer({
  buffer,
  declaredMimeType,
  originalName,
}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { ok: false, message: "File bukti transfer kosong." };
  }

  if (buffer.length > getMaxUploadSizeBytes()) {
    return {
      ok: false,
      message: `Ukuran file maksimal ${getMaxUploadSizeMb()} MB.`,
    };
  }

  const extension = extensionOf(originalName);
  if (!ALLOWED_RECEIPT_EXTENSIONS.includes(extension)) {
    return {
      ok: false,
      message: "Format file harus JPG, JPEG, PNG, atau WebP.",
    };
  }

  const declared = String(declaredMimeType || "").toLowerCase();
  if (declared && !ALLOWED_RECEIPT_MIME_TYPES.includes(declared)) {
    return {
      ok: false,
      message: "Tipe file tidak didukung. Gunakan gambar JPG, PNG, atau WebP.",
    };
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    return {
      ok: false,
      message: "Isi file bukan gambar yang valid (JPG, PNG, atau WebP).",
    };
  }

  if (extension === "jpeg" || extension === "jpg") {
    if (detected.mimeType !== "image/jpeg") {
      return { ok: false, message: "Isi file tidak sesuai dengan ekstensinya." };
    }
  } else if (extension === "png" && detected.mimeType !== "image/png") {
    return { ok: false, message: "Isi file tidak sesuai dengan ekstensinya." };
  } else if (extension === "webp" && detected.mimeType !== "image/webp") {
    return { ok: false, message: "Isi file tidak sesuai dengan ekstensinya." };
  }

  return { ok: true, mimeType: detected.mimeType, extension: detected.extension };
}

/**
 * Menyimpan file bukti transfer ke disk dengan nama acak.
 * Nama dan ekstensi file tidak pernah diambil dari input pengguna.
 */
export async function saveReceiptBuffer({
  buffer,
  declaredMimeType,
  originalName,
}) {
  const validation = validateReceiptBuffer({
    buffer,
    declaredMimeType,
    originalName,
  });
  if (!validation.ok) return validation;

  const directory = path.join(getUploadRoot(), RECEIPT_SUBDIR);
  await mkdir(directory, { recursive: true });

  const storedName = `${randomUUID()}.${validation.extension}`;
  await writeFile(path.join(directory, storedName), buffer, { flag: "wx" });

  return {
    ok: true,
    storedPath: `${RECEIPT_SUBDIR}/${storedName}`,
    mimeType: validation.mimeType,
    size: buffer.length,
    originalName: sanitizeOriginalName(originalName),
  };
}

/**
 * Mengubah jalur relatif yang tersimpan di database menjadi jalur absolut.
 * Menolak jalur yang keluar dari direktori upload (path traversal).
 */
export function resolveReceiptAbsolutePath(storedPath) {
  if (!storedPath || typeof storedPath !== "string") return null;
  const root = path.join(getUploadRoot(), RECEIPT_SUBDIR);
  const resolved = path.resolve(root, storedPath.replace(/^receipts[\\/]/, ""));
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

export async function readReceiptBuffer(storedPath) {
  const absolute = resolveReceiptAbsolutePath(storedPath);
  if (!absolute) return null;
  try {
    return await readFile(absolute);
  } catch {
    return null;
  }
}

/** Menghapus file lama saat pelanggan mengunggah ulang bukti transfer. */
export async function deleteReceiptFile(storedPath) {
  const absolute = resolveReceiptAbsolutePath(storedPath);
  if (!absolute) return;
  try {
    await unlink(absolute);
  } catch {
    // File mungkin sudah tidak ada — abaikan.
  }
}

/**
 * Mengambil Buffer dari objek File (FormData) secara aman.
 * @returns {Promise<{buffer: Buffer, declaredMimeType: string, originalName: string}>}
 */
export async function bufferFromUploadedFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { buffer: Buffer.alloc(0), declaredMimeType: "", originalName: "" };
  }
  const arrayBuffer = await file.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    declaredMimeType: file.type || "",
    originalName: file.name || "",
  };
}
