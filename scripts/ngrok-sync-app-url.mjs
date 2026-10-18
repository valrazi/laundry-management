/**
 * Menunggu ngrok menyala, lalu menulis alamat publiknya ke APP_URL di .env.
 *
 * Dipakai oleh 5-NGROK.bat. APP_URL dipakai aplikasi untuk membangun link
 * detail pesanan yang dikirim lewat WhatsApp (variabel {{orderUrl}}), sehingga
 * link tersebut tetap bisa dibuka dari HP pelanggan saat aplikasi diakses
 * lewat ngrok.
 *
 * Konfigurasi (opsional, berguna untuk pengujian):
 *   NGROK_API_URL          default http://127.0.0.1:4040/api/tunnels
 *   ENV_FILE               default .env
 *   NGROK_SYNC_TIMEOUT_MS  default 90000
 */
import { readFileSync, writeFileSync } from "node:fs";

const API_URL =
  process.env.NGROK_API_URL || "http://127.0.0.1:4040/api/tunnels";
const ENV_FILE = process.env.ENV_FILE || ".env";
const TIMEOUT_MS = Number(process.env.NGROK_SYNC_TIMEOUT_MS) || 90_000;
const INTERVAL_MS = 1000;

async function readPublicUrl() {
  const response = await fetch(API_URL, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) return null;

  const data = await response.json();
  const tunnels = Array.isArray(data?.tunnels) ? data.tunnels : [];

  // Utamakan tunnel HTTPS; itulah alamat yang dibagikan ke orang lain.
  const https = tunnels.find(
    (tunnel) => tunnel?.proto === "https" && tunnel?.public_url,
  );
  if (https) return https.public_url;

  const any = tunnels.find((tunnel) => tunnel?.public_url);
  return any ? any.public_url : null;
}

async function waitForPublicUrl() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < TIMEOUT_MS) {
    try {
      const url = await readPublicUrl();
      if (url) return url;
    } catch {
      // ngrok belum siap; coba lagi.
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  return null;
}

const publicUrl = await waitForPublicUrl();

if (!publicUrl) {
  console.error(
    "[ngrok] Alamat publik tidak terdeteksi. APP_URL tidak diubah.",
  );
  process.exit(1);
}

let envText;
try {
  envText = readFileSync(ENV_FILE, "utf8");
} catch {
  console.error(`[ngrok] File ${ENV_FILE} tidak ditemukan. APP_URL tidak diubah.`);
  process.exit(1);
}

const cleanUrl = publicUrl.replace(/\/+$/, "");
const newLine = `APP_URL="${cleanUrl}"`;

if (/^APP_URL=.*$/m.test(envText)) {
  envText = envText.replace(/^APP_URL=.*$/m, newLine);
} else {
  envText = `${envText.trimEnd()}\n${newLine}\n`;
}

writeFileSync(ENV_FILE, envText, "utf8");
console.log(`[ngrok] APP_URL diperbarui menjadi ${cleanUrl}`);
