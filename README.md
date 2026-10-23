# Laundry Management System

Sistem Informasi Manajemen Laundry berbasis web dengan notifikasi WhatsApp (Fonnte).
Dibangun sebagai proyek skripsi dengan dua jenis pengguna: **Admin** dan **Pelanggan**.

---

## 1. Ringkasan Proyek

Aplikasi ini membantu operasional usaha laundry, mulai dari pengelolaan pelanggan,
layanan dan harga, pembuatan pesanan, pemantauan status, penimbangan berat aktual,
pembayaran transfer manual, hingga laporan transaksi. Notifikasi WhatsApp dikirim
otomatis ketika pesanan dibuat dan ketika status pesanan berubah.

**Fitur utama**

| Modul | Kemampuan |
|---|---|
| Autentikasi | Registrasi pelanggan di `/register`, login terpisah untuk pelanggan (`/login`) dan admin (`/admin/login`), logout, session server-side, role ADMIN/CUSTOMER |
| Dashboard Admin | Statistik pesanan, pesanan aktif, pesanan selesai, menunggu verifikasi, pendapatan terverifikasi |
| Pelanggan (Admin) | Daftar, pencarian, filter status, detail, riwayat pesanan, aktif/nonaktif akun |
| Layanan | Tambah, ubah, aktif/nonaktif, satuan harga KG atau ITEM |
| Pesanan | Buat pesanan, nomor unik berformat `CS`/`ST`/`EX` + tanggal + urutan harian, snapshot harga, berat aktual, biaya tambahan, riwayat status |
| Status Pesanan | Transisi tervalidasi + mode koreksi admin yang tercatat |
| Pembayaran | Unggah bukti transfer, verifikasi, penolakan dengan alasan, riwayat keputusan |
| Notifikasi WhatsApp | 8 event, template yang dapat diubah, log, dry-run, kirim ulang manual |
| Laporan | Filter tanggal/status, rekap status, pendapatan terverifikasi, ekspor CSV |
| Profil | Ubah nama, email, nomor WhatsApp, dan password |

**Kredensial development (hasil `npm run db:seed`)**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@laundry.test` | `Admin#12345` |
| Pelanggan | `budi@example.test` | `Customer#12345` |
| Pelanggan | `siti@example.test` | `Customer#12345` |
| Pelanggan | `andi@example.test` | `Customer#12345` |

> Password di atas hanya untuk development. Jangan pernah memakai kredensial ini di
> lingkungan produksi.

---

## 2. Teknologi yang Digunakan

| Komponen | Teknologi | Versi |
|---|---|---|
| Framework full-stack | Next.js (App Router) | 15.5.x |
| Bahasa | JavaScript (tanpa TypeScript) | — |
| UI | React + Tailwind CSS | 19.x / 3.4.x |
| Database | MySQL | 8.x |
| ORM | Prisma | 6.19.x |
| Validasi | Zod | 4.x |
| Ikon | Lucide React | 1.x |
| Autentikasi | Session server-side (cookie HttpOnly + tabel `sessions`) | — |
| Hash password | bcryptjs | 3.x |
| Notifikasi WhatsApp | Fonnte API | — |
| Pengujian | Vitest | 5.x |

Frontend dan backend berada dalam satu proyek Next.js. Backend terdiri dari
**Server Actions** (untuk operasi form) dan **Route Handlers** (untuk pengiriman file
privat dan ekspor CSV). Tidak ada backend Express.js terpisah.

---

## 3. Prasyarat

- **Node.js** >= 20 (diuji pada Node.js 24)
- **npm** >= 10
- **MySQL** >= 8.0 yang sedang berjalan
- Akun **Fonnte** (opsional; tidak diperlukan untuk development karena tersedia mode
  dry-run)

---

## 4. Konfigurasi Environment

Salin berkas contoh lalu sesuaikan nilainya:

```bash
cp .env.example .env
```

Isi `.env`:

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | Koneksi MySQL. Karakter khusus pada password harus di-encode (contoh: `@` menjadi `%40`). |
| `TEST_DATABASE_URL` | Untuk pengujian | Database terpisah yang dipakai `npm test`. |
| `APP_URL` | Ya | Basis URL aplikasi. Dipakai untuk membentuk `{{orderUrl}}` pada notifikasi. Jangan menulis `localhost` langsung di kode. |
| `SESSION_SECRET` | Ya | Nilai acak. Buat dengan perintah di bawah. |
| `FONNTE_TOKEN` | Untuk produksi | Token API Fonnte. Hanya dibaca di server. |
| `FONNTE_API_URL` | Tidak | Default `https://api.fonnte.com/send`. |
| `FONNTE_DRY_RUN` | Tidak | `true` = tidak mengirim request nyata (default development). |
| `FONNTE_TIMEOUT_MS` | Tidak | Batas waktu request ke Fonnte (default 15000 ms). |
| `MAX_UPLOAD_SIZE_MB` | Tidak | Ukuran maksimal bukti transfer (default 5 MB). |
| `UPLOAD_DIR` | Tidak | Direktori penyimpanan bukti transfer (default `uploads`). |
| `SEED_ADMIN_*` | Tidak | Data akun admin untuk proses seed. |
| `SEED_CUSTOMER_PASSWORD` | Tidak | Password pelanggan contoh. |

Membuat `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Contoh `DATABASE_URL`:

```
DATABASE_URL="mysql://root:Valrazor88%40@127.0.0.1:3306/laundry_db"
```

---

## 5. Penyiapan Database MySQL

Buat database aplikasi dan database pengujian:

```bash
mysql -u root -p -e "CREATE DATABASE laundry_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE DATABASE laundry_db_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Jika perintah `mysql` tidak tersedia di `PATH` pada Windows, gunakan jalur lengkapnya,
misalnya:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "CREATE DATABASE laundry_db CHARACTER SET utf8mb4;"
```

---

## 6. Perintah Migrasi Prisma

```bash
npm install                 # memasang dependensi
npx prisma generate         # membuat Prisma Client
npm run db:migrate          # membuat & menerapkan migrasi (development)
```

Perintah lain yang tersedia:

| Perintah | Fungsi |
|---|---|
| `npm run db:migrate` | `prisma migrate dev` — membuat migrasi baru saat skema berubah |
| `npm run db:deploy` | `prisma migrate deploy` — menerapkan migrasi (produksi) |
| `npm run db:generate` | Membuat ulang Prisma Client |
| `npm run db:seed` | Mengisi data development |
| `npm run db:studio` | Membuka Prisma Studio |
| `npm run db:reset` | Menghapus dan membangun ulang database (development) |
| `npm run db:test:prepare` | Menerapkan migrasi ke `laundry_db_test` |

---

## 7. Perintah Seed

```bash
npm run db:seed
```

Seed membuat: 1 akun admin, 3 akun pelanggan, 6 layanan laundry, 8 template
notifikasi, pengaturan sistem, dan 6 contoh pesanan pada berbagai status beserta
riwayat status, baris pembayaran, dan gambar bukti transfer contoh (file PNG dibuat
otomatis di `uploads/receipts/`).

Seed **tidak** mengirim notifikasi WhatsApp apa pun.

> Catatan: seed melewati pembuatan contoh pesanan bila tabel `orders` sudah berisi
> data. Gunakan `npm run db:reset` untuk membangun ulang dari nol.

**Menu layanan laundry** — sumber tunggal ada pada `SERVICE_SEEDS` di
`prisma/seed.js`:

| Layanan | Harga | Satuan |
|---|---|---|
| Cuci Setrika | Rp 5.000 | per kg |
| Setrika | Rp 4.000 | per kg |
| Express | Rp 8.000 | per kg |
| Sprei | Rp 10.000 | per pcs |
| Selimut | Rp 15.000 | per pcs |
| Bed Cover | Rp 25.000 | per pcs |

Perubahan menu sehari-hari dilakukan lewat **Admin → Layanan** tanpa mengubah
kode. Bila ingin menyamakan data seed dengan daftar di atas, ubah `SERVICE_SEEDS`
lalu jalankan `npm run db:seed`. Seed akan membuat atau memperbarui layanan
tersebut dan **menonaktifkan** (bukan menghapus) layanan dari versi seed
sebelumnya, agar tautan serta snapshot transaksi lama tetap utuh.

---

## 8. Menjalankan Server Development

```bash
npm run dev
```

Aplikasi dapat dibuka di <http://localhost:3000>.

| Alamat | Untuk |
|---|---|
| <http://localhost:3000/login> | Pelanggan |
| <http://localhost:3000/register> | Pendaftaran pelanggan baru |
| <http://localhost:3000/admin/login> | Admin |

Halaman beranda (`/`) akan mengarahkan pengguna ke dashboard sesuai role-nya.
Untuk membuka aplikasi dari ponsel pada jaringan yang sama, jalankan
`npm run dev` lalu gunakan alamat **Network** yang ditampilkan Next.js.

Untuk mode produksi:

```bash
npm run build
npm start
```

---

## 9. Menjalankan Pengujian

Sekali saja, siapkan skema database pengujian:

```bash
npm run db:test:prepare
```

Lalu jalankan pengujian:

```bash
npm test              # sekali jalan
npm run test:watch    # mode watch
npm run lint          # pemeriksaan ESLint
```

Pengujian **tidak memerlukan token WhatsApp asli**:

- `FONNTE_DRY_RUN` dipaksa `true` pada `tests/setup.js`.
- Kegagalan provider disimulasikan dengan `fetch` tiruan (HTTP 500, respons bukan
  JSON, batas waktu, dan kegagalan jaringan).
- Pengujian integrasi memakai `TEST_DATABASE_URL` sehingga data development tidak
  pernah tersentuh.

Cakupan pengujian (10 berkas, 138 skenario):

| Berkas | Cakupan |
|---|---|
| `tests/pricing.test.js` | Subtotal KG & ITEM, pesanan campuran, berat pending, presisi Decimal, aturan transisi status, nomor pesanan unik |
| `tests/templateEngine.test.js` | Ekstraksi & validasi variabel, rendering, sanitasi nilai, tanpa `eval` |
| `tests/format.test.js` | Normalisasi nomor WhatsApp, format mata uang & berat |
| `tests/uploads.test.js` | Deteksi magic bytes, batas ukuran, ekstensi/MIME, nama file acak, path traversal |
| `tests/validation.test.js` | Seluruh skema Zod, penolakan field `role` dari browser, normalisasi checkbox |
| `tests/session.test.js` | Hash password bcrypt, pembuatan & validasi session, session kedaluwarsa, akun nonaktif, batasan unik database |
| `tests/authLogin.test.js` | Pemisahan pintu masuk admin/pelanggan, penolakan role yang salah, anti-enumerasi email, akun nonaktif |
| `tests/orders.test.js` | Pembuatan pesanan transaksional, snapshot harga, kepemilikan, transisi status, riwayat, notifikasi hanya saat status berubah, perhitungan ulang berat |
| `tests/payments.test.js` | Unggah bukti, pengajuan ganda, verifikasi, penolakan beralasan, unggah ulang, pendapatan terverifikasi |
| `tests/notifications.test.js` | Dry-run, header Authorization tanpa `Bearer`, kegagalan provider, kegagalan tidak merusak transaksi |
| `tests/reports.test.js` | Statistik dashboard, filter laporan, definisi pendapatan, ekspor CSV |

### Pemeriksaan asap (smoke test) terhadap server berjalan

Setelah `npm run build` dan `npm start`:

```bash
node scripts/smoke-test.mjs
```

Skrip ini memeriksa perilaku nyata di runtime: halaman publik, pengalihan rute
privat, akses sesuai role, serta perlindungan file bukti transfer dan laporan.

---

## 10. Cara Mengonfigurasi Fonnte

1. Buat akun dan hubungkan perangkat WhatsApp pada dashboard Fonnte.
2. Salin **token** dari dashboard Fonnte.
3. Isi `.env`:

   ```
   FONNTE_TOKEN="token-dari-fonnte"
   FONNTE_DRY_RUN="false"
   APP_URL="https://domain-laundry-anda.com"
   ```

4. Jalankan ulang server.
5. Buka **Admin → Pengaturan** untuk memeriksa status integrasi (token hanya
   ditampilkan sebagai "tersedia di server", tidak pernah nilainya).
6. Buka **Admin → Template Notifikasi** untuk mengubah isi pesan setiap event dan
   melihat pratinjau dengan data contoh.

Endpoint yang dipakai: `POST https://api.fonnte.com/send` dengan header
`Authorization: <token>` (**tanpa** prefix `Bearer`, sesuai dokumentasi Fonnte).
Seluruh permintaan hanya dikirim dari server.

**Event notifikasi yang didukung**

`ORDER_CREATED`, `ORDER_CONFIRMED`, `ORDER_PROCESSING`, `ORDER_READY_FOR_PICKUP`,
`ORDER_COMPLETED`, `ORDER_CANCELLED`, `PAYMENT_PAID`, `PAYMENT_REJECTED`.

Notifikasi hanya dikirim jika **semua** kondisi berikut terpenuhi:

1. Integrasi WhatsApp aktif (`whatsapp_enabled` pada halaman Pengaturan).
2. Template event tersebut aktif.
3. Untuk notifikasi status: status benar-benar berubah dan transisinya valid.

**Variabel template yang diizinkan**

`{{customerName}}`, `{{orderNumber}}`, `{{orderStatus}}`, `{{serviceName}}`,
`{{weight}}`, `{{totalPrice}}`, `{{orderUrl}}`.

Variabel yang tidak terdaftar ditolak saat template disimpan. Template tidak pernah
dievaluasi sebagai JavaScript.

> **Welcome message** ketika pelanggan pertama kali mengirim pesan WhatsApp pada
> suatu hari **tidak** ditangani aplikasi ini — perilaku tersebut dikonfigurasi pada
> sisi Fonnte.

---

## 11. Mengaktifkan Mode Dry-Run

Mode dry-run berguna untuk development dan pengujian tanpa perangkat WhatsApp:

```
FONNTE_DRY_RUN="true"
```

Pada mode ini:

- Tidak ada request yang dikirim ke Fonnte.
- Hasil pengiriman disimulasikan dan tetap dicatat pada `NotificationLog`.
- Log ditandai `isDryRun = true` dan ditampilkan dengan label **(simulasi)** di
  halaman Template Notifikasi serta detail pesanan.

---

## 12. Membuat / Menyiapkan Akun Admin

Registrasi publik **selalu** membuat akun `CUSTOMER`. Role tidak pernah diambil dari
data yang dikirim browser. Akun admin hanya dibuat melalui proses terkontrol:

**Cara 1 — seed (development)**

```bash
npm run db:seed
```

Atur `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PHONE`, dan `SEED_ADMIN_PASSWORD` pada `.env`
sebelum menjalankan seed.

**Cara 2 — promosikan akun yang sudah ada (produksi)**

```bash
npx prisma studio
```

Ubah `role` pengguna yang diinginkan menjadi `ADMIN`, lalu minta pengguna tersebut
login melalui **`/admin/login`** (bukan `/login`).

> Registrasi publik di `/register` selalu membuat akun pelanggan. Akun admin
> tidak dapat dibuat dari antarmuka web.

---

## 13. Cara Penyimpanan File Unggahan

- Lokasi: direktori `uploads/` (dapat diubah lewat `UPLOAD_DIR`), subfolder
  `uploads/receipts/`.
- Folder ini **bukan** bagian dari `public/` sehingga tidak dapat diakses sebagai
  aset statis, dan sudah dikecualikan pada `.gitignore`.
- Nama file dibuat acak oleh server (`<uuid>.<ekstensi>`). Nama dan ekstensi dari
  pengguna tidak pernah dipakai.
- Akses file hanya melalui Route Handler `GET /api/receipts/[paymentId]` yang
  memeriksa autentikasi **dan** kepemilikan (admin atau pemilik pesanan).
- Respons file memakai `Cache-Control: private, no-store` dan
  `X-Content-Type-Options: nosniff`.
- Validasi unggahan: ukuran (default maksimal 5 MB), ekstensi, MIME type, dan
  **magic bytes** (isi file harus benar-benar JPG/PNG/WebP).
- Saat pelanggan mengunggah ulang bukti transfer, file lama dihapus.

**Batasan penting:** penyimpanan lokal **tidak** persisten pada lingkungan serverless
(misalnya Vercel). Aplikasi ini ditargetkan untuk deployment satu server Node.js.
Logika penyimpanan sudah dipisahkan pada `src/lib/uploads.js` sehingga dapat diganti
dengan object storage di kemudian hari tanpa mengubah lapisan bisnis.

---

## 14. Pertimbangan Keamanan

- **Hash password** memakai bcrypt (bcryptjs) dengan salt rounds 10. Password tidak
  pernah disimpan atau ditampilkan dalam bentuk plaintext.
- **Session server-side**: token acak 256-bit dikirim melalui cookie `HttpOnly`,
  `SameSite=Lax`, dan `Secure` pada produksi. Database hanya menyimpan **hash
  SHA-256** dari token. Setiap permintaan memvalidasi session ke database.
- **Otorisasi di server**: setiap halaman memanggil `requireAdmin()` /
  `requireCustomer()`, dan setiap Server Action memeriksa role serta kepemilikan
  sebelum menyentuh database. Middleware hanya berperan sebagai pengalihan UX.
- **Validasi Zod** pada seluruh input dari klien. Objek hasil validasi membuang field
  tak dikenal, sehingga upaya menyisipkan `role` atau `isActive` dari browser gagal.
- **Harga tidak pernah dipercaya dari klien.** Nama layanan, satuan, dan harga selalu
  diambil ulang dari database sebagai snapshot, dan seluruh total dihitung ulang di
  server memakai `Decimal` (bukan floating point).
- **Bukti transfer privat.** Tidak ada URL publik untuk bukti transfer; tidak ada
  akses tanpa autentikasi walaupun ID pembayaran diketahui.
- **Transaksi database** dipakai saat membuat pesanan beserta item, riwayat status,
  dan baris pembayaran; serta saat mengubah status pesanan beserta riwayatnya dan
  saat mencatat keputusan pembayaran.
- **Kegagalan WhatsApp tidak merusak transaksi.** Notifikasi selalu dikirim setelah
  transaksi commit, dan kegagalan provider tidak pernah membatalkan data.
- **Rahasia tidak pernah bocor ke klien.** `FONNTE_TOKEN`, `passwordHash`, dan
  `SESSION_SECRET` tidak pernah dikirim ke browser. Ringkasan respons provider
  disaring agar tidak memuat token.
- **Template aman.** Tidak ada `eval` atau `Function`; hanya variabel terdaftar yang
  diganti.
- **Anti spam notifikasi.** Perubahan status yang tidak mengubah status tidak
  menghasilkan riwayat maupun notifikasi baru.
- **Batas unggahan** dan deteksi isi file mencegah file berbahaya yang menyamar
  sebagai gambar.
- **Akun dengan transaksi tidak dihapus permanen**, hanya dinonaktifkan; sesi aktif
  dicabut saat akun dinonaktifkan.

---

## 15. Batasan MVP (Diketahui)

1. **Pembayaran manual.** Tidak ada payment gateway, virtual account, atau verifikasi
   otomatis. Bukti transfer selalu diperiksa manusia.
2. **Satu pembayaran aktif per pesanan.** Pelanggan mengunggah ulang bukti transfer
   yang ditolak pada baris pembayaran yang sama. Keputusan verifikasi tetap tercatat
   pada tabel `payment_reviews`, sehingga riwayat tidak hilang.
3. **`Payment.amount` disinkronkan otomatis** dengan total pesanan selama pembayaran
   belum `PAID`. Setelah pembayaran diverifikasi lunas, nilainya dibekukan sebagai
   nilai historis.
4. **Berat aktual diisi manual oleh admin** per item KG. Jika belum ditimbang, total
   yang tampil kepada pelanggan adalah nilai sementara dan ditandai
   "Menunggu penimbangan". Pelanggan baru dapat mengunggah bukti transfer setelah
   penimbangan selesai agar nominal yang dibayar sudah pasti.
5. **Penyimpanan file di disk lokal** — tidak cocok untuk deployment serverless
   (lihat bagian 13).
6. **Ekspor laporan dibatasi 500 baris** per permintaan. Persempit filter untuk
   melihat data lainnya.
7. **Tanpa antrean pesan.** Pengiriman ulang notifikasi dilakukan manual oleh admin
   dari halaman Template Notifikasi (sesuai ruang lingkup MVP; tidak memakai message
   broker).
8. **Tidak ada fitur di luar ruang lingkup MVP**: multi-cabang, kurir & GPS,
   program loyalitas, inventori, akuntansi lengkap, chatbot, dan payment gateway.
9. **Alamat pengambilan/antar-jemput tidak diimplementasikan** karena tidak
   dibutuhkan operasional yang dimodelkan.
10. **Satu session per login, tanpa pembaruan otomatis (sliding).** Session
    berlaku 30 hari sejak login. Mengubah password mencabut seluruh session lain.
11. **Zonasi waktu tampilan tetap `Asia/Jakarta`.** Filter tanggal pada laporan juga
    memakai batas hari zona waktu tersebut.
12. **Layanan dapat dinonaktifkan, tidak dihapus**, agar snapshot transaksi lama tetap
    utuh.

---

## 16. Struktur Proyek

```
laundry-management/
├── prisma/
│   ├── schema.prisma          # Skema database
│   ├── migrations/            # Migrasi Prisma
│   └── seed.js                # Data development
├── scripts/
│   ├── prepare-test-db.mjs    # Menyiapkan database pengujian
│   └── smoke-test.mjs         # Pemeriksaan asap terhadap server berjalan
├── src/
│   ├── actions/               # Server Actions (auth, pesanan, pembayaran, dll.)
│   ├── app/
│   │   ├── (auth)/            # /login, /register
│   │   ├── admin/             # Halaman admin
│   │   ├── customer/          # Halaman pelanggan
│   │   ├── api/receipts/      # Pengiriman file bukti transfer (privat)
│   │   └── api/reports/       # Ekspor CSV
│   ├── components/
│   │   ├── forms/             # Form interaktif (Client Components)
│   │   ├── layout/            # Shell admin & pelanggan
│   │   └── ui/                # Komponen UI yang dapat dipakai ulang
│   ├── lib/                   # Prisma, auth/session, validasi, format, Fonnte, upload
│   ├── services/              # Aturan bisnis (pesanan, pembayaran, laporan, notifikasi)
│   └── middleware.js          # Pengalihan UX (bukan pengaman utama)
├── tests/                     # Pengujian Vitest
├── uploads/                   # Bukti transfer (privat, tidak ikut git)
├── .env.example
└── README.md
```

**Pemisahan tanggung jawab**

| Lapisan | Lokasi | Peran |
|---|---|---|
| UI | `src/app`, `src/components` | Tampilan & interaksi |
| Validasi | `src/lib/validation.js` | Skema Zod |
| Aturan bisnis | `src/services/*.js` | Perhitungan, transisi status, keputusan pembayaran |
| Akses data | `src/lib/prisma.js`, `src/services/*.js` | Prisma |
| Integrasi eksternal | `src/lib/fonnte.js` | Fonnte API |
| Otorisasi | `src/lib/auth.js`, `src/lib/session.js` | Session & role |
| Titik mutasi | `src/actions/*.js` | Server Actions |

---

## 17. Daftar Halaman

**Pintu masuk & registrasi**

| Halaman | Untuk | Registrasi |
|---|---|---|
| `/login` | Pelanggan | Tersedia, mengarah ke `/register` |
| `/register` | Pelanggan (selalu membuat akun `CUSTOMER`) | — |
| `/admin/login` | Admin | **Tidak** tersedia |

Pintu masuk admin dan pelanggan **dipisahkan**. Setiap pintu masuk memeriksa role
di server (`src/services/authService.js`), sehingga:

- akun admin yang mencoba masuk lewat `/login` ditolak dan diarahkan ke
  `/admin/login`;
- akun pelanggan yang mencoba masuk lewat `/admin/login` ditolak dan diarahkan ke
  `/login`;
- informasi role hanya diberikan setelah password terbukti benar, sehingga tidak
  membocorkan keberadaan akun kepada penebak.

Halaman `/admin/login` tidak memuat tautan registrasi sama sekali. Pengunjung area
admin tanpa sesi diarahkan ke `/admin/login`, sedangkan pengunjung area pelanggan
diarahkan ke `/login`.

**Pelanggan**

- `/customer/dashboard`
- `/customer/orders`
- `/customer/orders/new`
- `/customer/orders/[id]`
- `/customer/profile`

**Admin**

- `/admin/dashboard`
- `/admin/customers`, `/admin/customers/[id]`
- `/admin/orders`, `/admin/orders/[id]`
- `/admin/services`
- `/admin/payments`, `/admin/payments/[id]`
- `/admin/reports`
- `/admin/notification-templates`
- `/admin/settings`

**API (dilindungi otorisasi)**

- `GET /api/receipts/[paymentId]` — menyajikan bukti transfer (admin atau pemilik)
- `GET /api/reports/export` — ekspor CSV laporan (admin)

### Catatan Desain Antarmuka (Mobile-First untuk Pelanggan)

Mayoritas pelanggan membuka aplikasi dari ponsel, sehingga area pelanggan
dirancang mobile-first:

| Penyesuaian | Keterangan |
|---|---|
| **Navigasi bawah** | Lima menu pada bilah tetap di bawah layar: Beranda · Pesanan · **Pesan** · Profil · Keluar. Jumlah ganjil membuat tombol tambah pesanan tepat berada di tengah dan tombol keluar di ujung kanan. Tinggi sel 63 px. |
| **Satu tombol keluar** | Pada ponsel, keluar hanya ada di bilah bawah (header bersih). Pada layar >= 768 px, bilah bawah disembunyikan dan tombol keluar muncul kembali di header bersama menu lengkap. |
| **Kartu, bukan tabel** | Daftar pesanan pada ponsel memakai kartu bertumpuk yang mudah disentuh; tabel hanya muncul pada layar >= 768 px. |
| **Urutan prioritas** | Pada detail pesanan, kartu **Pembayaran** tampil lebih dulu di ponsel, lalu bertukar posisi ke kanan pada layar besar. |
| **Input anti-zoom iOS** | Seluruh input memakai ukuran font 16 px pada layar kecil agar Safari iOS tidak memperbesar halaman otomatis saat input difokuskan. |
| **Sasaran sentuh** | Tombol ukuran sedang/besar memiliki tinggi minimal 44 px. |
| **Keyboard ponsel** | `inputMode`, `autoComplete`, `autoCapitalize`, dan `autoCorrect` disetel sesuai jenis data (email, telepon, angka). |
| **Ruang aman** | Konten diberi jarak bawah agar tidak tertutup navigasi bawah, termasuk `env(safe-area-inset-bottom)` untuk perangkat berponi. |
| **Ikon layanan** | Setiap kartu layanan diberi badge ikon + warna yang dipilih otomatis dari kata kunci nama layanan (`src/components/ui/ServiceIcon.jsx`). Layanan baru buatan admin langsung mendapat ikon tanpa perlu kolom tambahan di database. Form Admin → Layanan menampilkan pratinjau ikon saat nama diketik. |

Area admin tetap dioptimalkan untuk desktop/tablet (sidebar navy) sesuai PRD.

---

## 18. Alur Status Pesanan dan Pembayaran

**Status pesanan**

```
PENDING ──▶ CONFIRMED ──▶ PROCESSING ──▶ READY_FOR_PICKUP ──▶ COMPLETED
   │            │              │
   └────────────┴──────────────┴──────▶ CANCELLED
```

`COMPLETED` dan `CANCELLED` bersifat terminal pada alur normal. Bila koreksi memang
diperlukan, admin dapat mengaktifkan **mode koreksi admin** pada halaman detail
pesanan. Koreksi divalidasi di server dan dicatat pada riwayat status dengan awalan
`[KOREKSI ADMIN]`.

**Status pembayaran** (independen dari status pesanan)

```
UNPAID ──▶ WAITING_VERIFICATION ──▶ PAID
                    │
                    └────▶ REJECTED ──▶ (unggah ulang) ──▶ WAITING_VERIFICATION
```

Verifikasi pembayaran **tidak** mengubah status pesanan secara otomatis, dan
mengunggah bukti transfer **tidak** berarti pembayaran lunas.

> **Prasyarat unggah bukti transfer — pesanan tidak boleh menunggu penimbangan.**
> Selama masih ada layanan berbasis KG yang berat aktualnya belum diisi admin,
> total biaya belum final sehingga pengajuan pembayaran ditolak. Aturan ini
> diperiksa di server (`isAwaitingWeighing()` pada `src/services/orderService.js`
> yang dipakai `submitPaymentReceipt`), dan pada UI form unggah diganti dengan
> keterangan agar pelanggan paham alasannya. Admin juga melihat catatan serupa di
> halaman detail pesanan. Ini mencegah pelanggan membayar nominal yang masih
> sementara.

---

## 19. Keputusan Implementasi (Asumsi)

1. **Autentikasi memakai session server-side sendiri** (bukan Auth.js). Alasannya:
   lebih mudah dijelaskan dan diaudit, memenuhi ketentuan "mekanisme autentikasi
   server-side yang aman" pada PRD, dan menghindari API pihak ketiga yang masih
   berstatus beta.
2. **`OrderItem` menyimpan `quantity` dan `weight`** (keduanya nullable) agar pesanan
   yang memuat layanan KG **dan** ITEM sekaligus dapat dihitung dengan benar. Setiap
   item dihitung sendiri-sendiri lalu dijumlahkan.
3. **Tabel `payment_reviews`** ditambahkan sebagai model riwayat kecil untuk mencatat
   keputusan verifikasi, sesuai saran PRD ("riwayat keputusan verifikasi yang
   tercatat") tanpa membangun subsistem pembayaran yang kompleks.
4. **`Order.weight`** adalah jumlah berat aktual seluruh item KG. Bernilai `null`
   sampai seluruh item KG ditimbang.
5. **Definisi pendapatan** dipakai konsisten di seluruh aplikasi: jumlah
   `Payment.amount` untuk pembayaran berstatus `PAID` (difilter `verifiedAt` pada
   laporan). Status pesanan tidak mempengaruhi nilai ini.
6. **Pesanan aktif** = pesanan yang belum `COMPLETED` dan belum `CANCELLED`.
7. **Link detail pesanan pada notifikasi** mengarah ke `/customer/orders/[id]` dan
   tetap memerlukan login. Tidak ada token akses anonim.
8. **Pintu masuk admin dan pelanggan dipisahkan** (`/admin/login` dan `/login`)
   dengan pemeriksaan role di server. Registrasi hanya tersedia di sisi pelanggan.
   Ini memenuhi kebutuhan pembedaan antarmuka tanpa mengorbankan keamanan: role
   tetap dibaca dari database, bukan dari halaman yang dipakai untuk login.
9. **Area pelanggan dirancang mobile-first** (navigasi bawah, daftar berbentuk
   kartu, input 16 px) karena mayoritas pelanggan mengakses lewat ponsel.
10. **Format nomor pesanan** mengikuti jenis layanan: Cuci Setrika `CS` + `YYMMDD`
    + 2 digit nomor urut, Setrika `ST`, dan Express `EX` (contoh `CS26010201`).
    Pesanan campuran memakai prioritas Express > Cuci Setrika > Setrika, sedangkan
    layanan lain memakai `LD`. Nomor urut dihitung terpisah per prefix per hari
    (zona Asia/Jakarta) dan dibatasi 01-99. Perubahan ini hanya berlaku untuk
    pesanan baru; nomor pesanan lama tidak diubah.

---

## 20. Pemecahan Masalah

| Gejala | Penyebab & solusi |
|---|---|
| `P1000` / autentikasi database gagal | Periksa `DATABASE_URL`; encode karakter khusus pada password (`@` → `%40`). |
| `P1001` tidak dapat menjangkau server | Pastikan layanan MySQL berjalan dan port 3306 terbuka. |
| `EPERM ... query_engine-windows.dll.node` saat `prisma generate` | Hentikan server Next.js yang sedang berjalan, lalu ulangi `npx prisma generate`. |
| Notifikasi berlabel "(simulasi)" | `FONNTE_DRY_RUN=true`. Setel `false` dan isi `FONNTE_TOKEN` untuk pengiriman nyata. |
| Notifikasi gagal dengan "FONNTE_TOKEN belum dikonfigurasi" | Isi `FONNTE_TOKEN` pada `.env`, lalu jalankan ulang server. |
| Notifikasi tidak terkirim padahal token benar | Pastikan template event aktif **dan** integrasi WhatsApp diaktifkan pada halaman Pengaturan. |
| Gambar bukti transfer tidak tampil | File mungkin hilang dari `uploads/receipts`; minta pelanggan mengunggah ulang. |
| `npm test` gagal terhubung ke database | Jalankan `npm run db:test:prepare` dan pastikan `laundry_db_test` sudah dibuat. |
| Perubahan skema tidak terbaca | `npx prisma generate`, lalu `npm run db:migrate`. |

---

## 21. Ringkasan Hasil Verifikasi

Dijalankan pada repositori ini (Node.js 24.21.0, MySQL 8.0.46):

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Migrasi database | `npx prisma migrate dev --name init` | ✅ Berhasil diterapkan |
| Seed data | `npm run db:seed` | ✅ 4 pengguna, 6 layanan, 8 template, 6 pesanan, 3 bukti transfer |
| Build produksi | `npm run build` | ✅ 23 rute terkompilasi tanpa galat |
| Lint | `npm run lint` | ✅ Tidak ada warning/error |
| Pengujian otomatis | `npm test` | ✅ 147/147 skenario lulus (11 berkas) |
| Pemeriksaan asap runtime | `node scripts/smoke-test.mjs` | ✅ 19/19 pemeriksaan lulus |
| Uji responsif 390 px | *Computed style* pada viewport 390 px | ✅ Navigasi bawah tampil (5 kolom), navigasi desktop & tabel tersembunyi |
| Uji bilah bawah 320–390 px | *Computed style* pada 320, 360, 390 px | ✅ 5 kolom sama lebar, tanpa overflow, tinggi sel 63 px, label tidak terpotong |

> Catatan: baris terakhir diverifikasi dengan membaca *computed style* pada viewport
> 390 px (bukan sekadar pratinjau desain). Untuk memeriksa sendiri: buka aplikasi di
> browser, aktifkan **Device Toolbar** (F12 → Ctrl+Shift+M), pilih perangkat
> 390 × 844, lalu buka `/customer/dashboard`.
