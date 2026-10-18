/**
 * Mengambil screenshot halaman admin & pelanggan untuk dokumentasi.
 *
 * Cara pakai:
 *   1) npm run dev            (atau npm run build && npm start)
 *   2) node scripts/capture-screenshots.mjs
 *
 * Hasil disimpan ke:
 *   screenshoot-hasil/tampilan-user/*.png
 *   screenshoot-hasil/tampilan-admin/*.png
 *
 * Catatan teknis:
 * - Memakai Chrome headless melalui DevTools Protocol (tanpa dependency baru).
 * - Sesi login dibuat sementara pada tabel Session (mekanisme sama dengan
 *   src/lib/session.js) dan dihapus kembali setelah script selesai, sehingga
 *   sesi login yang sedang aktif tidak terganggu.
 * - Gunakan CHROME_PATH bila Chrome tidak berada di lokasi default.
 */

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile(".env");
} catch {}

const prisma = new PrismaClient();

const BASE = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEBUG_PORT = 9333;
const USER_DATA_DIR = path.join(process.cwd(), ".tmp-chrome-profile");

/** Pelanggan yang dipakai untuk halaman pelanggan (dapat diubah lewat env). */
const CUSTOMER_ID = process.env.SHOT_CUSTOMER_ID || "cmv4mmeyc0001ftyw68d8wy8j";

const OUT_USER = path.join("screenshoot-hasil", "tampilan-user");
const OUT_ADMIN = path.join("screenshoot-hasil", "tampilan-admin");

const HIDE_DEV_TOOLS = `(function(){var id='shot-style';var s=document.getElementById(id);if(!s){s=document.createElement('style');s.id=id;document.head.appendChild(s);}s.textContent='nextjs-portal{display:none !important;}';return 'ok';})()`;

// ------------------------------------------------------------------
// Klien minimal DevTools Protocol
// ------------------------------------------------------------------
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id != null) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
        else entry.resolve(message.result);
        return;
      }
      const set = this.listeners.get(message.method);
      if (set) for (const handler of [...set]) handler(message.params);
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      if (!this.listeners.has(method)) this.listeners.set(method, new Set());
      const set = this.listeners.get(method);
      const handler = (params) => {
        set.delete(handler);
        clearTimeout(timer);
        resolve(params);
      };
      const timer = setTimeout(() => {
        set.delete(handler);
        reject(new Error(`timeout menunggu ${method}`));
      }, timeoutMs);
      set.add(handler);
    });
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDevTools() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome belum siap
    }
    await delay(300);
  }
  throw new Error("Chrome DevTools tidak siap");
}

// ------------------------------------------------------------------
// Program utama
// ------------------------------------------------------------------
const createdSessionIds = [];

async function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const id = createHash("sha256").update(token).digest("hex");
  await prisma.session.create({
    data: { id, userId, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
  });
  createdSessionIds.push(id);
  return token;
}

async function resolveTargets() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const customer = await prisma.user.findUnique({ where: { id: CUSTOMER_ID } });
  if (!admin) throw new Error("Akun admin belum ada. Jalankan npm run db:seed.");
  if (!customer) throw new Error(`Pelanggan ${CUSTOMER_ID} tidak ditemukan.`);

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: { payment: true },
  });
  const order =
    orders.find((o) => o.status === "COMPLETED" && o.payment) || orders[0];
  if (!order) throw new Error("Pelanggan belum memiliki pesanan untuk screenshot.");

  return {
    adminId: admin.id,
    customerId: customer.id,
    orderId: order.id,
    paymentId: order.payment?.id || null,
  };
}

const targets = await resolveTargets();
console.log(
  `Target: admin=${targets.adminId} pelanggan=${targets.customerId} pesanan=${targets.orderId} pembayaran=${targets.paymentId ?? "-"}`,
);

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const results = [];

try {
  const wsUrl = await waitForDevTools();
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", () => reject(new Error("gagal membuka websocket")));
  });

  const cdp = new CDP(ws);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  async function setCookie(userId) {
    await cdp.send("Network.clearBrowserCookies");
    if (!userId) return;
    const token = await createSession(userId);
    const { success } = await cdp.send("Network.setCookie", {
      name: "laundry_session",
      value: token,
      url: BASE,
      httpOnly: true,
      path: "/",
    });
    if (!success) throw new Error("gagal menyetel cookie sesi");
  }

  async function capture(outDir, fileName, routePath) {
    const loaded = cdp.once("Page.loadEventFired").catch(() => null);
    await cdp.send("Page.navigate", { url: `${BASE}${routePath}` });
    await loaded;
    await delay(1200);
    await cdp.send("Runtime.evaluate", { expression: HIDE_DEV_TOOLS });
    await delay(400);
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(data, "base64"));
    results.push(filePath);
    console.log(`✓ ${filePath}  ←  ${routePath}`);
  }

  // 1. Halaman publik (belum login)
  await setCookie(null);
  await capture(OUT_USER, "01-halaman-login.png", "/login");
  await capture(OUT_USER, "02-halaman-registrasi.png", "/register");
  await capture(OUT_ADMIN, "01-halaman-login-admin.png", "/admin/login");

  // 2. Halaman pelanggan
  await setCookie(targets.customerId);
  await capture(OUT_USER, "03-dashboard.png", "/customer/dashboard");
  await capture(OUT_USER, "04-daftar-pesanan.png", "/customer/orders");
  await capture(OUT_USER, "05-buat-pesanan.png", "/customer/orders/new");
  await capture(
    OUT_USER,
    "06-detail-pesanan.png",
    `/customer/orders/${targets.orderId}`,
  );
  await capture(OUT_USER, "07-profil.png", "/customer/profile");

  // 3. Halaman admin
  await setCookie(targets.adminId);
  await capture(OUT_ADMIN, "02-dashboard.png", "/admin/dashboard");
  await capture(OUT_ADMIN, "03-pelanggan.png", "/admin/customers");
  await capture(
    OUT_ADMIN,
    "04-detail-pelanggan.png",
    `/admin/customers/${targets.customerId}`,
  );
  await capture(OUT_ADMIN, "05-pesanan.png", "/admin/orders");
  await capture(OUT_ADMIN, "06-detail-pesanan.png", `/admin/orders/${targets.orderId}`);
  await capture(OUT_ADMIN, "07-layanan.png", "/admin/services");
  await capture(OUT_ADMIN, "08-pembayaran.png", "/admin/payments");
  if (targets.paymentId) {
    await capture(
      OUT_ADMIN,
      "09-detail-pembayaran.png",
      `/admin/payments/${targets.paymentId}`,
    );
  }
  await capture(OUT_ADMIN, "10-laporan.png", "/admin/reports");
  await capture(
    OUT_ADMIN,
    "11-template-notifikasi.png",
    "/admin/notification-templates",
  );
  await capture(OUT_ADMIN, "12-pengaturan.png", "/admin/settings");

  ws.close();
} catch (error) {
  console.error("GAGAL:", error?.message || error);
  process.exitCode = 1;
} finally {
  const removed = await prisma.session.deleteMany({
    where: { id: { in: createdSessionIds } },
  });
  console.log(`Sesi sementara dibersihkan: ${removed.count}.`);
  await prisma.$disconnect();
  chrome.kill();
  await delay(1500);
  fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
  console.log(`\nSelesai: ${results.length} screenshot.`);
}
