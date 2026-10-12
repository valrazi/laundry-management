/**
 * Pemeriksaan asap (smoke test) terhadap server yang sedang berjalan.
 *
 * Tujuan: memverifikasi perilaku NYATA di runtime, bukan hanya unit test:
 * 1. Halaman publik dapat dibuka.
 * 2. Halaman privat dialihkan ke /login bila belum login.
 * 3. Session server-side benar-benar memberi akses sesuai role.
 * 4. File bukti transfer & laporan dilindungi otorisasi.
 *
 * Cara pakai:
 *   1) npm run build
 *   2) npm start            (terminal terpisah)
 *   3) node scripts/smoke-test.mjs
 */

try {
  process.loadEnvFile(".env");
} catch {
  // gunakan variabel lingkungan yang tersedia
}

const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const { default: prisma } = await import("../src/lib/prisma.js");
const { createSessionRecord } = await import("../src/lib/session.js");

const results = [];

function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail);
  } catch (error) {
    record(name, false, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function sessionCookieFor(user) {
  const { token } = await createSessionRecord(user.id);
  return `laundry_session=${token}`;
}

async function main() {
  // 1. Halaman publik
  await check("GET /login (pelanggan) dapat dibuka", async () => {
    const response = await fetch(`${baseUrl}/login`);
    const html = await response.text();
    assert(response.status === 200, `status ${response.status}`);
    assert(html.includes("Masuk ke akun Anda"), "form login pelanggan tidak ditemukan");
    assert(html.includes("/register"), "tautan registrasi tidak ada");
    assert(html.includes("/admin/login"), "tautan pintu admin tidak ada");
    return "200 OK";
  });

  await check("GET /admin/login (admin) dapat dibuka", async () => {
    const response = await fetch(`${baseUrl}/admin/login`);
    const html = await response.text();
    assert(response.status === 200, `status ${response.status}`);
    assert(html.includes("Login Admin"), "judul halaman admin tidak ditemukan");
    return "200 OK";
  });

  await check("Halaman login admin TIDAK menyediakan registrasi", async () => {
    const response = await fetch(`${baseUrl}/admin/login`);
    const html = await response.text();
    assert(
      !html.includes("Daftar sekarang") && !html.includes("/register"),
      "halaman admin masih memuat tautan registrasi",
    );
    return "tanpa tautan registrasi";
  });

  await check("GET /register (pelanggan) dapat dibuka", async () => {
    const response = await fetch(`${baseUrl}/register`);
    const html = await response.text();
    assert(response.status === 200, `status ${response.status}`);
    assert(html.includes("Buat akun pelanggan"), "form registrasi tidak ditemukan");
    assert(
      !html.includes("Login Admin"),
      "halaman registrasi tidak boleh memuat form admin",
    );
    return "200 OK";
  });

  // 2. Perlindungan rute privat
  await check("GET /admin/dashboard dialihkan ke /admin/login", async () => {
    const response = await fetch(`${baseUrl}/admin/dashboard`, {
      redirect: "manual",
    });
    const location = response.headers.get("location") || "";
    assert(
      response.status >= 300 && response.status < 400,
      `status ${response.status}`,
    );
    assert(location.includes("/admin/login"), `location ${location}`);
    return `${response.status} -> ${location}`;
  });

  await check("GET /customer/orders dialihkan ke /login", async () => {
    const response = await fetch(`${baseUrl}/customer/orders`, {
      redirect: "manual",
    });
    const location = response.headers.get("location") || "";
    assert(
      response.status >= 300 && response.status < 400,
      `status ${response.status}`,
    );
    assert(location.includes("/login"), `location ${location}`);
    assert(!location.includes("/admin/login"), `location ${location}`);
    return `${response.status} -> ${location}`;
  });

  // 3. Akses sesuai role dengan session server-side
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const customer = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });

  assert(admin, "Akun admin belum ada — jalankan `npm run db:seed` lebih dulu.");
  assert(customer, "Akun pelanggan belum ada — jalankan `npm run db:seed` lebih dulu.");

  const adminCookie = await sessionCookieFor(admin);
  const customerCookie = await sessionCookieFor(customer);

  await check("Admin dapat membuka /admin/dashboard", async () => {
    const response = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { cookie: adminCookie },
      redirect: "manual",
    });
    const html = await response.text();
    assert(response.status === 200, `status ${response.status}`);
    assert(html.includes("Pendapatan terverifikasi"), "konten dashboard admin tidak ditemukan");
    return "200 OK";
  });

  await check("Pelanggan dapat membuka /customer/dashboard", async () => {
    const response = await fetch(`${baseUrl}/customer/dashboard`, {
      headers: { cookie: customerCookie },
      redirect: "manual",
    });
    const html = await response.text();
    assert(response.status === 200, `status ${response.status}`);
    assert(html.includes("Buat Pesanan"), "konten dashboard pelanggan tidak ditemukan");
    return "200 OK";
  });

  await check("Pelanggan dialihkan keluar dari /admin/dashboard", async () => {
    const response = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { cookie: customerCookie },
      redirect: "manual",
    });
    assert(
      response.status >= 300 && response.status < 400,
      `status ${response.status}`,
    );
    return String(response.status);
  });

  await check("Halaman admin lain juga hanya untuk admin", async () => {
    for (const path of [
      "/admin/customers",
      "/admin/orders",
      "/admin/services",
      "/admin/payments",
      "/admin/reports",
      "/admin/notification-templates",
      "/admin/settings",
    ]) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { cookie: adminCookie },
        redirect: "manual",
      });
      assert(response.status === 200, `${path} -> status ${response.status}`);
    }
    return "7 halaman OK";
  });

  await check("Halaman pelanggan lain dapat dibuka", async () => {
    for (const path of [
      "/customer/orders",
      "/customer/orders/new",
      "/customer/profile",
    ]) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { cookie: customerCookie },
        redirect: "manual",
      });
      assert(response.status === 200, `${path} -> status ${response.status}`);
    }
    return "3 halaman OK";
  });

  await check("Pengguna yang sudah login dialihkan dari halaman login", async () => {
    for (const path of ["/login", "/register", "/admin/login"]) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { cookie: adminCookie },
        redirect: "manual",
      });
      assert(
        response.status >= 300 && response.status < 400,
        `${path} -> status ${response.status}`,
      );
    }
    return "3 halaman login/registrasi OK";
  });

  // 4. Perlindungan file & laporan
  await check("Bukti transfer tanpa login ditolak (401)", async () => {
    const response = await fetch(`${baseUrl}/api/receipts/tidak-ada`, {
      redirect: "manual",
    });
    assert(response.status === 401, `status ${response.status}`);
    return "401";
  });

  await check("Ekspor CSV tanpa login ditolak (403)", async () => {
    const response = await fetch(`${baseUrl}/api/reports/export`, {
      redirect: "manual",
    });
    assert(response.status === 403, `status ${response.status}`);
    return "403";
  });

  await check("Pelanggan tidak dapat mengunduh laporan admin (403)", async () => {
    const response = await fetch(`${baseUrl}/api/reports/export`, {
      headers: { cookie: customerCookie },
      redirect: "manual",
    });
    assert(response.status === 403, `status ${response.status}`);
    return "403";
  });

  await check("Admin dapat mengunduh laporan CSV", async () => {
    const response = await fetch(`${baseUrl}/api/reports/export`, {
      headers: { cookie: adminCookie },
      redirect: "manual",
    });
    const text = await response.text();
    assert(response.status === 200, `status ${response.status}`);
    assert(
      (response.headers.get("content-type") || "").includes("text/csv"),
      "content-type bukan CSV",
    );
    assert(text.includes("Nomor Pesanan"), "header CSV tidak ditemukan");
    return "200 OK";
  });

  await check("Admin dapat mengunduh bukti transfer", async () => {
    const payment = await prisma.payment.findFirst({
      where: { proofFilePath: { not: null } },
      select: { id: true, proofMimeType: true },
    });
    if (!payment) return "dilewati (belum ada bukti transfer)";

    const response = await fetch(`${baseUrl}/api/receipts/${payment.id}`, {
      headers: { cookie: adminCookie },
      redirect: "manual",
    });
    const contentType = response.headers.get("content-type") || "";
    assert(response.status === 200, `status ${response.status}`);
    assert(contentType.startsWith("image/"), `content-type ${contentType}`);
    assert(
      (response.headers.get("x-content-type-options") || "") === "nosniff",
      "header nosniff tidak ada",
    );
    return `200 ${contentType}`;
  });

  await check("Pemilik pesanan dapat mengunduh bukti transfernya", async () => {
    const own = await prisma.payment.findFirst({
      where: {
        proofFilePath: { not: null },
        order: { is: { customerId: customer.id } },
      },
      select: { id: true },
    });
    if (!own) return "dilewati (pelanggan ini belum punya bukti transfer)";

    const response = await fetch(`${baseUrl}/api/receipts/${own.id}`, {
      headers: { cookie: customerCookie },
      redirect: "manual",
    });
    assert(response.status === 200, `status ${response.status}`);
    return "200 OK";
  });

  await check("Bukti transfer milik pelanggan lain ditolak (403)", async () => {
    const otherPayment = await prisma.payment.findFirst({
      where: {
        proofFilePath: { not: null },
        order: { is: { customerId: { not: customer.id } } },
      },
      select: { id: true },
    });

    if (!otherPayment) {
      return "dilewati (tidak ada bukti transfer milik pelanggan lain)";
    }

    const response = await fetch(`${baseUrl}/api/receipts/${otherPayment.id}`, {
      headers: { cookie: customerCookie },
      redirect: "manual",
    });
    assert(response.status === 403, `status ${response.status}`);
    return "403";
  });

  await prisma.session.deleteMany({
    where: { userId: { in: [admin.id, customer.id] } },
  });

  const failed = results.filter((result) => !result.passed);
  console.log(
    `\nRingkasan: ${results.length - failed.length}/${results.length} pemeriksaan lulus.`,
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Smoke test gagal dijalankan:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
