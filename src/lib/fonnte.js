/**
 * Integrasi WhatsApp Gateway Fonnte.
 *
 * Referensi: https://docs.fonnte.com/api-send-message/
 *
 * Prinsip:
 * - Hanya dipanggil dari server. Token tidak pernah dikirim ke browser.
 * - Token tidak pernah dicatat ke log (termasuk header Authorization).
 * - Fungsi ini TIDAK pernah melemparkan error ke pemanggil. Kegagalan
 *   pengiriman WhatsApp tidak boleh membatalkan transaksi database.
 * - Mendukung mode dry-run untuk development dan pengujian.
 */

import { normalizePhone, isValidPhone } from "./format";

const DEFAULT_API_URL = "https://api.fonnte.com/send";
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RESPONSE_SNAPSHOT = 1000;

export function isDryRun() {
  return String(process.env.FONNTE_DRY_RUN ?? "false").toLowerCase() === "true";
}

export function getFonnteConfig() {
  const timeout = Number(process.env.FONNTE_TIMEOUT_MS);
  return {
    token: (process.env.FONNTE_TOKEN || "").trim(),
    apiUrl: (process.env.FONNTE_API_URL || DEFAULT_API_URL).trim(),
    timeoutMs:
      Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
    dryRun: isDryRun(),
  };
}

export function isFonnteConfigured() {
  return getFonnteConfig().token.length > 0;
}

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Menyimpan ringkasan respons provider yang aman untuk ditampilkan admin.
 * Nilai dibatasi panjangnya dan tidak pernah memuat token.
 */
export function sanitizeProviderResponse(parsed, rawText) {
  const allowedKeys = ["status", "detail", "reason", "id", "quota", "requestid"];
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const summary = {};
    for (const key of allowedKeys) {
      if (key in parsed) summary[key] = parsed[key];
    }
    if (Object.keys(summary).length === 0) {
      summary.raw = String(rawText ?? "").slice(0, 200);
    }
    return JSON.stringify(summary).slice(0, MAX_RESPONSE_SNAPSHOT);
  }
  const text = String(rawText ?? "").trim();
  if (!text) return null;
  return JSON.stringify({ raw: text.slice(0, 200) }).slice(0, MAX_RESPONSE_SNAPSHOT);
}

function extractProviderReason(parsed) {
  if (parsed && typeof parsed === "object") {
    const reason = parsed.reason || parsed.detail;
    if (typeof reason === "string" && reason.trim()) return reason.trim();
  }
  return "Fonnte menolak permintaan pengiriman.";
}

/**
 * Mengirim satu pesan WhatsApp.
 *
 * @param {{target: string, message: string}} input
 * @returns {Promise<{ok: boolean, dryRun: boolean, status: string, providerResponse: string|null, errorMessage: string|null}>}
 */
export async function sendWhatsAppMessage({ target, message }) {
  const config = getFonnteConfig();

  const normalizedTarget = normalizePhone(target);
  if (!isValidPhone(normalizedTarget)) {
    return {
      ok: false,
      dryRun: config.dryRun,
      status: "FAILED",
      providerResponse: null,
      errorMessage: "Nomor tujuan tidak valid.",
    };
  }

  if (typeof message !== "string" || message.trim() === "") {
    return {
      ok: false,
      dryRun: config.dryRun,
      status: "FAILED",
      providerResponse: null,
      errorMessage: "Isi pesan kosong.",
    };
  }

  // Mode dry-run: tidak ada request keluar, hasil disimulasikan.
  if (config.dryRun) {
    return {
      ok: true,
      dryRun: true,
      status: "SENT",
      providerResponse: JSON.stringify({
        status: true,
        detail: "Mode dry-run: request tidak dikirim ke Fonnte.",
        simulated: true,
      }),
      errorMessage: null,
    };
  }

  if (!config.token) {
    return {
      ok: false,
      dryRun: false,
      status: "FAILED",
      providerResponse: null,
      errorMessage:
        "FONNTE_TOKEN belum dikonfigurasi. Aktifkan FONNTE_DRY_RUN untuk pengujian.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const body = new URLSearchParams();
    body.set("target", normalizedTarget);
    body.set("message", message);

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        // Fonnte tidak memakai skema "Bearer" pada header Authorization.
        Authorization: config.token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    const rawText = await response.text();
    const parsed = safeParseJson(rawText);
    const providerResponse = sanitizeProviderResponse(parsed, rawText);

    if (!response.ok) {
      return {
        ok: false,
        dryRun: false,
        status: "FAILED",
        providerResponse,
        errorMessage: `Fonnte mengembalikan HTTP ${response.status}.`,
      };
    }

    if (!parsed || parsed.status !== true) {
      return {
        ok: false,
        dryRun: false,
        status: "FAILED",
        providerResponse,
        errorMessage: extractProviderReason(parsed),
      };
    }

    return {
      ok: true,
      dryRun: false,
      status: "SENT",
      providerResponse,
      errorMessage: null,
    };
  } catch (error) {
    const isTimeout = error?.name === "AbortError";
    return {
      ok: false,
      dryRun: false,
      status: "FAILED",
      providerResponse: null,
      errorMessage: isTimeout
        ? `Permintaan ke Fonnte melewati batas waktu ${config.timeoutMs} ms.`
        : "Gagal menghubungi Fonnte. Periksa koneksi jaringan server.",
    };
  } finally {
    clearTimeout(timer);
  }
}
