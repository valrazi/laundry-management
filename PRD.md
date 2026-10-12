# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Laundry Management System with WhatsApp Notification

**Versi:** 1.0  
**Platform:** Web Application  
**Target:** Proyek skripsi  
**Bahasa aplikasi:** Bahasa Indonesia

## 1. Ringkasan Produk

Laundry Management System adalah aplikasi web untuk membantu operasional usaha laundry, mulai dari pengelolaan pelanggan, pemesanan layanan laundry, pemantauan status pesanan, pembayaran, hingga pelaporan.

Sistem memiliki dua jenis pengguna utama, yaitu Admin dan Pelanggan. Aplikasi juga terintegrasi dengan layanan WhatsApp gateway Fonnte untuk mengirimkan notifikasi otomatis kepada pelanggan ketika pesanan dibuat dan ketika status pesanan berubah.

Sistem tidak bertujuan menjadi platform laundry berskala besar. Pengembangan difokuskan pada fitur inti yang relevan untuk operasional laundry dan kebutuhan penelitian skripsi.

## 2. Tujuan Produk

1. Mempermudah pelanggan membuat pesanan laundry secara online.
2. Memungkinkan pelanggan memantau status dan biaya pesanan.
3. Membantu admin mengelola pelanggan, layanan, pesanan, pembayaran, dan laporan.
4. Mengotomatisasi pengiriman notifikasi status pesanan melalui WhatsApp.
5. Menyediakan riwayat transaksi yang terstruktur untuk kebutuhan operasional dan evaluasi sistem.

### Indikator keberhasilan

- Pelanggan dapat mendaftar, login, membuat pesanan, dan melihat detail pesanan.
- Admin dapat mengelola pesanan dari awal hingga selesai.
- Pelanggan dapat mengunggah bukti transfer.
- Perubahan status pesanan yang valid memicu permintaan notifikasi WhatsApp.
- Admin dapat mengelola template notifikasi dan melihat laporan transaksi.
- Sistem menerapkan pembatasan akses berdasarkan role.
- Data transaksi dan pembayaran tersimpan secara konsisten di MySQL.

## 3. Target Pengguna

### 3.1 Admin

Admin bertanggung jawab atas operasional sistem, termasuk pengelolaan data pelanggan, layanan, pesanan, pembayaran, laporan, dan template notifikasi.

### 3.2 Pelanggan

Pelanggan adalah pengguna yang memiliki akun untuk membuat pesanan, memantau proses laundry, melihat rincian biaya, mengunggah bukti transfer, dan mengelola profil.

Tidak diperlukan role tambahan seperti kasir, kurir, supervisor, atau superadmin pada versi pertama.

## 4. Ruang Lingkup

### 4.1 Fitur yang termasuk dalam MVP

- Autentikasi dan otorisasi Admin serta Pelanggan.
- Dashboard Admin dan Dashboard Pelanggan.
- CRUD data pelanggan.
- CRUD layanan laundry dan harga.
- Pembuatan dan pengelolaan pesanan.
- Pembaruan status pesanan dan berat aktual.
- Pengelolaan pembayaran dan verifikasi bukti transfer.
- Upload bukti transfer oleh pelanggan.
- Notifikasi WhatsApp melalui Fonnte.
- Pengelolaan template notifikasi.
- Laporan transaksi sederhana.
- Pengelolaan profil pelanggan.
- Riwayat perubahan status pesanan.

### 4.2 Fitur di luar MVP

- Aplikasi mobile native.
- Multi-cabang dan multi-tenant.
- Integrasi payment gateway.
- Pembayaran otomatis melalui virtual account.
- Kurir dan pelacakan GPS.
- Program loyalitas, kupon, dan membership.
- Sistem inventori bahan laundry.
- Akuntansi lengkap.
- Arsitektur microservices.
- Chatbot AI dan pemrosesan percakapan WhatsApp.
- Integrasi WhatsApp resmi Meta secara langsung.

## 5. Teknologi yang Digunakan

| Komponen | Teknologi |
|---|---|
| Full-stack framework | Next.js App Router |
| Bahasa pemrograman | JavaScript |
| UI | React + Tailwind CSS |
| Database | MySQL |
| ORM | Prisma |
| Autentikasi | Auth.js atau mekanisme autentikasi server-side yang aman |
| Validasi | Zod |
| Ikon | Lucide |
| Integrasi WhatsApp | Fonnte API |
| Pengelolaan environment | `.env` |
| Deployment awal | Server Node.js |

Gunakan satu proyek Next.js untuk frontend dan backend. Backend terdiri dari Server Actions dan/atau Route Handlers sesuai kebutuhan. Tidak diperlukan backend Express.js terpisah.

## 6. Desain UI/UX

### 6.1 Palet warna

- Putih: `#FFFFFF`
- Biru muda: `#61A5F8`
- Navy: `#1E3A5F`

### 6.2 Area Admin

- Background utama berwarna putih atau abu-abu sangat muda.
- Sidebar menggunakan navy `#1E3A5F`.
- Tombol aksi utama menggunakan biru `#61A5F8`.
- Navigasi sidebar: Dashboard, Pelanggan, Pesanan, Layanan, Pembayaran, Laporan, Template Notifikasi, dan Pengaturan.
- Dashboard berisi kartu statistik, pesanan terbaru, dan ringkasan pendapatan.

### 6.3 Area Pelanggan

- Background putih.
- Aksen biru muda.
- Navigasi sederhana dan mudah digunakan pada perangkat mobile.
- Dashboard menampilkan jumlah pesanan aktif, riwayat pesanan, dan tombol Buat Pesanan.
- Detail pesanan menampilkan status, layanan, berat, rincian harga, pembayaran, dan riwayat status.

Gunakan desain bersih, konsisten, responsif, dan tidak berlebihan. Hindari animasi yang tidak diperlukan.

## 7. Alur Bisnis

### 7.1 Alur Pelanggan

1. Pelanggan menerima link website melalui WhatsApp atau kanal komunikasi laundry.
2. Pelanggan membuka website.
3. Pelanggan login atau membuat akun.
4. Pelanggan masuk ke Dashboard Pelanggan.
5. Pelanggan memilih layanan laundry dan mengisi detail pesanan.
6. Sistem menyimpan pesanan dengan nomor pesanan unik.
7. Sistem mengirim notifikasi WhatsApp berisi konfirmasi pesanan dan link detail pesanan.
8. Admin memproses pesanan dan memperbarui status serta berat aktual.
9. Pelanggan memantau status pesanan melalui dashboard atau link detail.
10. Pelanggan mengunggah bukti transfer.
11. Admin memverifikasi pembayaran.
12. Pesanan diproses hingga selesai dan pelanggan menerima notifikasi sesuai konfigurasi.

**Catatan:** Welcome message saat pelanggan pertama kali mengirim pesan WhatsApp pada hari tersebut ditangani oleh konfigurasi Fonnte. Aplikasi web tidak perlu mengimplementasikan mekanisme welcome message tersebut.

### 7.2 Alur Admin

1. Admin login.
2. Admin masuk ke Dashboard Admin.
3. Admin melihat statistik pesanan, pembayaran, dan pendapatan.
4. Admin mengelola data pelanggan.
5. Admin mengelola layanan dan harga.
6. Admin melihat pesanan masuk dan membuka detail pesanan.
7. Admin memperbarui status, berat aktual, dan rincian biaya sesuai kondisi pesanan.
8. Admin memeriksa bukti transfer dan memperbarui status pembayaran.
9. Sistem mengirimkan notifikasi WhatsApp berdasarkan event yang sesuai.
10. Admin melihat laporan serta mengelola template notifikasi.

## 8. Kebutuhan Fungsional

### FR-01: Autentikasi dan Hak Akses

- Pelanggan dapat mendaftar menggunakan nama, nomor WhatsApp, email, dan password.
- Nomor WhatsApp harus unik.
- Email harus unik apabila digunakan sebagai identitas login.
- Sistem menyediakan login dan logout.
- Password disimpan dalam bentuk hash, bukan plaintext.
- Sistem membedakan role `ADMIN` dan `CUSTOMER`.
- Pelanggan hanya dapat melihat serta mengubah data miliknya sendiri.
- Admin dapat mengakses seluruh modul administrasi.
- Registrasi publik selalu membuat akun dengan role `CUSTOMER`.
- Pembuatan akun admin dilakukan melalui proses terkontrol, bukan melalui pilihan role pada form registrasi publik.

### FR-02: Dashboard Pelanggan

Dashboard menampilkan:

- Ringkasan jumlah pesanan aktif.
- Pesanan terbaru.
- Status setiap pesanan.
- Nomor pesanan.
- Tanggal pesanan.
- Estimasi atau total biaya sesuai tahap pemrosesan.
- Tombol melihat detail pesanan.
- Tombol membuat pesanan baru.

### FR-03: Pemesanan Laundry

Pelanggan dapat membuat pesanan dengan data:

- Layanan laundry.
- Jumlah item atau catatan pesanan jika diperlukan.
- Catatan khusus untuk laundry.
- Alamat atau informasi pengambilan hanya jika memang dibutuhkan oleh operasional usaha.

Setelah pesanan dibuat:

- Sistem menghasilkan nomor pesanan yang unik.
- Sistem menyimpan layanan dan harga yang berlaku pada saat pemesanan sebagai snapshot transaksi.
- Sistem menentukan status awal pesanan.
- Sistem mengirimkan notifikasi WhatsApp jika pengaturan notifikasi aktif.

**Keputusan MVP:** Harga final berbasis berat ditentukan atau diperbarui oleh admin setelah berat aktual diketahui. Sebelum itu, sistem boleh menampilkan estimasi atau label “Menunggu penimbangan”. Jangan menganggap berat estimasi sebagai berat aktual.

### FR-04: Detail dan Status Pesanan

Pelanggan dapat melihat:

- Nomor pesanan.
- Tanggal pesanan.
- Daftar layanan.
- Berat aktual jika sudah dicatat.
- Harga per satuan.
- Subtotal, biaya tambahan jika ada, dan total biaya.
- Status pesanan.
- Status pembayaran.
- Bukti transfer yang diunggah.
- Riwayat perubahan status.

Pelanggan tidak dapat mengubah status pesanan, berat aktual, atau total biaya.

### FR-05: Pengelolaan Pesanan oleh Admin

Admin dapat:

- Melihat seluruh pesanan.
- Mencari pesanan berdasarkan nomor pesanan atau nama pelanggan.
- Memfilter pesanan berdasarkan status dan tanggal.
- Melihat detail pesanan.
- Memperbarui status pesanan.
- Mencatat berat aktual.
- Memperbarui rincian biaya sesuai aturan harga.
- Menambahkan catatan internal bila diperlukan.

Setiap perubahan status harus divalidasi di server dan dicatat dalam riwayat status.

### FR-06: Status Pesanan

Gunakan status berikut sebagai standar MVP:

1. `PENDING` — pesanan baru menunggu konfirmasi atau penimbangan.
2. `CONFIRMED` — pesanan sudah dikonfirmasi.
3. `PROCESSING` — laundry sedang diproses.
4. `READY_FOR_PICKUP` — pesanan selesai diproses dan siap diambil atau diserahkan.
5. `COMPLETED` — pesanan sudah diserahkan atau selesai.
6. `CANCELLED` — pesanan dibatalkan.

Status disimpan dalam bentuk enum atau nilai terkontrol. Label yang ditampilkan kepada pengguna menggunakan bahasa Indonesia.

Transisi status harus mengikuti aturan bisnis. Pesanan yang sudah selesai atau dibatalkan tidak dapat kembali ke status sebelumnya melalui perubahan biasa. Jika koreksi khusus diperlukan, admin harus mengikuti mekanisme koreksi yang tercatat.

### FR-07: Pengelolaan Layanan

Admin dapat:

- Menambah layanan.
- Mengedit nama dan deskripsi layanan.
- Menetapkan harga.
- Memilih satuan harga, misalnya per kilogram atau per item.
- Mengaktifkan atau menonaktifkan layanan.
- Melihat daftar layanan.

Layanan yang sudah digunakan pada transaksi tidak boleh mengubah nilai transaksi historis. Simpan snapshot nama layanan, satuan, dan harga saat pesanan dibuat.

### FR-08: Pembayaran

Metode pembayaran MVP adalah transfer manual.

Alur pembayaran:

1. Sistem menampilkan instruksi pembayaran yang dapat dikonfigurasi.
2. Pelanggan mengunggah bukti transfer.
3. Sistem menyimpan referensi file bukti transfer.
4. Status pembayaran menjadi `WAITING_VERIFICATION`.
5. Admin memeriksa bukti transfer.
6. Admin menerima atau menolak pembayaran.
7. Jika ditolak, admin dapat menambahkan alasan agar pelanggan dapat memperbaiki bukti transfer.
8. Jika diterima, status pembayaran menjadi `PAID`.

Status pembayaran:

- `UNPAID`
- `WAITING_VERIFICATION`
- `PAID`
- `REJECTED`

Pembayaran dan status pesanan merupakan dua hal berbeda. Perubahan status pembayaran tidak boleh otomatis mengubah status pesanan kecuali terdapat aturan bisnis yang jelas.

Jika pesanan memiliki beberapa pembayaran, sistem perlu mendukung riwayat pembayaran atau mempertahankan desain satu pembayaran aktif per pesanan. Untuk MVP, gunakan satu pembayaran aktif dengan riwayat keputusan verifikasi yang tercatat.

### FR-09: Upload Bukti Transfer

- Format yang diizinkan: JPG, JPEG, PNG, dan WebP.
- Batas ukuran file harus ditentukan melalui konfigurasi, dengan default maksimal 5 MB.
- Validasi ekstensi, MIME type, dan ukuran file di server.
- Nama file harus dibuat secara acak untuk mencegah konflik.
- File tidak boleh dieksekusi sebagai kode.
- File hanya boleh diakses oleh pemilik pesanan dan admin.
- Pengguna tidak dapat mengunggah bukti pembayaran untuk pesanan milik orang lain.

Untuk deployment awal pada satu server Node.js, penyimpanan file lokal dapat digunakan. Lokasi file harus berada di direktori upload yang tidak memungkinkan eksekusi kode. Siapkan abstraksi sederhana agar penyimpanan dapat dipindahkan ke object storage jika diperlukan.

### FR-10: Profil Pelanggan

Pelanggan dapat:

- Melihat profil.
- Mengedit nama.
- Mengedit nomor WhatsApp dengan validasi keunikan.
- Mengedit email jika diizinkan.
- Mengubah password dengan verifikasi password saat ini.

Pelanggan tidak dapat mengubah role atau ID akun.

### FR-11: Dashboard Admin

Dashboard menampilkan ringkasan:

- Total pesanan.
- Pesanan aktif.
- Pesanan selesai.
- Pesanan menunggu verifikasi pembayaran.
- Total pendapatan dari pembayaran yang telah diverifikasi.
- Daftar pesanan terbaru.

Definisi pendapatan harus konsisten, misalnya menghitung transaksi yang berstatus `PAID`, bukan semua pesanan yang dibuat.

### FR-12: Pengelolaan Pelanggan

Admin dapat:

- Melihat daftar pelanggan.
- Mencari pelanggan berdasarkan nama, email, atau nomor WhatsApp.
- Melihat detail pelanggan dan riwayat pesanannya.
- Melihat status akun.
- Menonaktifkan akun jika diperlukan.

Admin tidak boleh melihat password pelanggan. Penghapusan permanen akun yang memiliki transaksi sebaiknya dihindari; gunakan penonaktifan akun.

### FR-13: Laporan

Sediakan laporan sederhana:

- Laporan pesanan berdasarkan rentang tanggal.
- Laporan transaksi berdasarkan status pesanan.
- Laporan pembayaran berdasarkan status pembayaran.
- Laporan pendapatan berdasarkan pembayaran yang telah diverifikasi.
- Filter berdasarkan tanggal dan status.
- Tampilan tabel dengan total sesuai filter.

Ekspor CSV boleh disediakan sebagai fitur tambahan. Tidak diperlukan sistem business intelligence atau visualisasi kompleks.

### FR-14: Template Notifikasi

Admin dapat mengelola template pesan WhatsApp untuk event berikut:

- Pesanan dibuat.
- Pesanan dikonfirmasi.
- Pesanan sedang diproses.
- Pesanan siap diambil.
- Pesanan selesai.
- Pesanan dibatalkan.
- Pembayaran diterima atau ditolak, jika notifikasi pembayaran diaktifkan.

Setiap template memiliki:

- Nama event.
- Isi pesan.
- Status aktif/nonaktif.
- Daftar variabel yang diperbolehkan.

Contoh variabel:

- `{{customerName}}`
- `{{orderNumber}}`
- `{{orderStatus}}`
- `{{serviceName}}`
- `{{weight}}`
- `{{totalPrice}}`
- `{{orderUrl}}`

Sistem harus mengganti variabel dengan data aktual sebelum mengirim pesan. Variabel yang tidak dikenal tidak boleh dibiarkan diam-diam dalam pesan produksi; lakukan validasi saat template disimpan.

## 9. Integrasi WhatsApp Fonnte

### 9.1 Tanggung Jawab Integrasi

Aplikasi bertanggung jawab untuk:

- Mengirim notifikasi pesanan dan pembayaran yang dikonfigurasi.
- Membentuk isi pesan berdasarkan template.
- Memanggil API Fonnte dari server.
- Mencatat waktu, event, penerima, dan hasil pengiriman.
- Menangani kegagalan pengiriman tanpa merusak transaksi utama.

Fonnte bertanggung jawab atas mekanisme welcome message otomatis yang telah dikonfigurasi pada layanan mereka. Aplikasi tidak perlu membangun fitur tersebut.

### 9.2 Pengiriman Notifikasi

Gunakan endpoint pengiriman Fonnte `POST https://api.fonnte.com/send` dengan header `Authorization` berisi token API. Token tidak menggunakan skema Bearer menurut dokumentasi Fonnte.

Referensi: https://docs.fonnte.com/api-send-message/

Semua panggilan Fonnte wajib dilakukan dari server. Jangan memanggil Fonnte langsung dari browser.

Simpan token pada environment variable `FONNTE_TOKEN`.

### 9.3 Trigger Notifikasi

Notifikasi pesanan dibuat dikirim setelah transaksi pesanan berhasil disimpan.

Notifikasi perubahan status dikirim hanya ketika:

1. Status sebelumnya berbeda dari status baru.
2. Transisi status valid.
3. Perubahan status berhasil disimpan.
4. Template untuk event tersebut aktif.

Jangan mengirim notifikasi jika admin hanya mengedit catatan atau menyimpan form tanpa mengubah status.

Notifikasi pembayaran merupakan event terpisah dari notifikasi status pesanan.

### 9.4 Link Detail Pesanan

Pesan WhatsApp dapat berisi link detail pesanan yang mengarah ke halaman login atau autentikasi yang sesuai.

Gunakan URL dari environment variable `APP_URL`, bukan URL localhost yang ditulis permanen dalam kode.

Link tidak boleh memberikan akses tanpa autentikasi hanya karena nomor pesanan diketahui. Jika dibutuhkan akses langsung tanpa login, gunakan token akses acak yang aman, memiliki masa berlaku, dan hanya memberikan akses baca terhadap pesanan terkait.

### 9.5 Logging dan Kegagalan

Simpan log notifikasi yang berisi:

- Pesanan terkait jika ada.
- Penerima.
- Event notifikasi.
- Waktu pengiriman.
- Status `PENDING`, `SENT`, atau `FAILED`.
- Respons ringkas dari Fonnte atau pesan error yang aman.

Jangan menyimpan token API ke log.

Bedakan keberhasilan menerima respons API dari keberhasilan pesan benar-benar diterima di perangkat WhatsApp. Jangan mengklaim pesan telah dibaca atau terkirim ke penerima hanya karena request API berhasil.

Jika API gagal, transaksi pesanan tetap tersimpan. Admin dapat melihat kegagalan dan melakukan pengiriman ulang secara manual. Untuk MVP, tidak diperlukan message broker atau sistem antrean terpisah.

### 9.6 Pengaturan Integrasi

- Token Fonnte disimpan di environment variable.
- Status aktif/nonaktif integrasi dapat dikelola melalui konfigurasi sistem.
- Sediakan mode pengujian atau dry-run untuk development.
- Pesan welcome tidak dikirim dari aplikasi web.
- Jangan mengirim notifikasi saat seed database atau proses migrasi berjalan.

## 10. Struktur Database Awal

### User

- `id`
- `name`
- `email` (unique)
- `phone` (unique)
- `passwordHash`
- `role`
- `isActive`
- `createdAt`
- `updatedAt`

### Service

- `id`
- `name`
- `description`
- `price`
- `priceUnit` — `KG` atau `ITEM`
- `isActive`
- `createdAt`
- `updatedAt`

### Order

- `id`
- `orderNumber` (unique)
- `customerId`
- `status`
- `weight`
- `subtotal`
- `additionalCost`
- `totalPrice`
- `customerNotes`
- `adminNotes`
- `createdAt`
- `updatedAt`
- `completedAt` (nullable)

### OrderItem

- `id`
- `orderId`
- `serviceId` (nullable jika perlu mempertahankan transaksi setelah layanan diarsipkan)
- `serviceNameSnapshot`
- `priceSnapshot`
- `priceUnitSnapshot`
- `quantity` atau `weight`, sesuai jenis layanan
- `subtotal`

### OrderStatusHistory

- `id`
- `orderId`
- `oldStatus`
- `newStatus`
- `changedByUserId`
- `notes`
- `createdAt`

### Payment

- `id`
- `orderId`
- `amount`
- `status`
- `proofFilePath`
- `rejectionReason`
- `verifiedByUserId`
- `verifiedAt`
- `createdAt`
- `updatedAt`

### NotificationTemplate

- `id`
- `eventKey` (unique)
- `name`
- `message`
- `isActive`
- `updatedAt`

### NotificationLog

- `id`
- `orderId` (nullable)
- `paymentId` (nullable)
- `recipientPhone`
- `eventKey`
- `messageSnapshot`
- `status`
- `providerResponse`
- `errorMessage`
- `createdAt`
- `sentAt` (nullable)

### SystemSetting (opsional untuk MVP)

- `id`
- `key` (unique)
- `value`
- `updatedAt`

Catatan implementasi:
- Gunakan foreign key dan index yang sesuai.
- Gunakan tipe `Decimal` untuk nilai uang, bukan floating point.
- Simpan waktu secara konsisten dan tampilkan dalam zona waktu Asia/Jakarta.
- Gunakan transaksi database ketika beberapa operasi saling bergantung, misalnya menyimpan pesanan, item, dan riwayat status awal.
- Status pesanan dan status pembayaran harus disimpan terpisah.

## 11. Aturan Bisnis Utama

1. Pelanggan tidak boleh melihat pesanan pelanggan lain.
2. Hanya admin yang dapat mengubah status pesanan, berat aktual, harga final, dan status verifikasi pembayaran.
3. Setiap pesanan memiliki nomor unik.
4. Harga layanan pada pesanan merupakan snapshot dan tidak berubah ketika admin mengedit harga layanan untuk transaksi baru.
5. Setiap perubahan status pesanan dicatat pada `OrderStatusHistory`.
6. Notifikasi status dikirim setelah perubahan status berhasil disimpan.
7. Kegagalan WhatsApp tidak boleh membatalkan transaksi database.
8. Bukti transfer tidak otomatis dianggap valid hanya karena berhasil diunggah.
9. Pendapatan dihitung dari pembayaran yang telah diverifikasi.
10. Pesanan selesai atau dibatalkan tidak boleh diubah kembali melalui alur normal.
11. Data sensitif, token, dan bukti transfer tidak boleh terekspos melalui endpoint publik.
12. Semua validasi dan pemeriksaan hak akses harus dilakukan di server.

## 12. Kebutuhan Nonfungsional

### Keamanan

- Hash password menggunakan algoritma yang sesuai, seperti Argon2id atau bcrypt.
- Lindungi session/cookie menggunakan konfigurasi yang aman.
- Validasi input di server.
- Lindungi seluruh route admin.
- Terapkan pemeriksaan kepemilikan pesanan.
- Hindari SQL injection, XSS, dan akses file tanpa otorisasi.
- Jangan mengirim secret ke client bundle.

### Performa dan Keandalan

- Gunakan pagination pada tabel admin.
- Gunakan pencarian dan filter di server.
- Hindari query database berulang yang tidak diperlukan.
- Gunakan timeout untuk request ke Fonnte.
- Tangani error secara konsisten.
- Pastikan notifikasi tidak terkirim berulang akibat submit ganda atau perubahan data yang tidak relevan.

### Maintainability

- Pisahkan UI, validasi, aturan bisnis, akses database, dan integrasi Fonnte.
- Gunakan komponen UI yang dapat digunakan kembali.
- Hindari duplikasi logic perubahan status.
- Gunakan migrasi Prisma dan seed untuk data awal.
- Sediakan `.env.example` tanpa secret asli.
- Dokumentasikan langkah setup dan pengujian.

## 13. Halaman yang Diperlukan

### Publik dan autentikasi

- `/login`
- `/register`

### Pelanggan

- `/customer/dashboard`
- `/customer/orders`
- `/customer/orders/new`
- `/customer/orders/[id]`
- `/customer/profile`

### Admin

- `/admin/dashboard`
- `/admin/customers`
- `/admin/customers/[id]`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/services`
- `/admin/payments`
- `/admin/payments/[id]`
- `/admin/reports`
- `/admin/notification-templates`
- `/admin/settings` (opsional)

Semua route harus memeriksa autentikasi, role, dan kepemilikan data di server.

## 14. Kriteria Penerimaan

Sistem dinyatakan memenuhi kebutuhan MVP apabila:

1. Registrasi pelanggan dan login berjalan dengan benar.
2. Pengguna tanpa autentikasi tidak dapat mengakses halaman privat.
3. Pelanggan tidak dapat mengakses data pesanan milik pelanggan lain.
4. Admin dapat melakukan CRUD layanan dan mengelola pesanan.
5. Perubahan berat dan harga final dihitung sesuai aturan bisnis.
6. Pelanggan dapat mengunggah bukti transfer dengan validasi file.
7. Admin dapat menerima atau menolak pembayaran.
8. Setiap perubahan status pesanan tercatat dalam riwayat.
9. Notifikasi WhatsApp hanya dipicu oleh event yang sesuai.
10. Kegagalan API WhatsApp tidak menghapus atau membatalkan pesanan.
11. Template notifikasi dapat diubah tanpa mengubah source code.
12. Laporan menampilkan hasil sesuai filter dan definisi pendapatan.
13. Migrasi database, seed, dan petunjuk menjalankan aplikasi tersedia.
14. Pengujian mencakup autentikasi, otorisasi, alur pesanan, pembayaran, dan notifikasi.

## 15. Rencana Pengembangan

**Tahap 1 — Fondasi:** setup Next.js, Prisma, MySQL, autentikasi, role, dan layout.

**Tahap 2 — Master data:** pengelolaan pelanggan dan layanan.

**Tahap 3 — Pesanan:** pembuatan pesanan, detail pesanan, status, berat, dan riwayat.

**Tahap 4 — Pembayaran:** upload bukti transfer, verifikasi, dan status pembayaran.

**Tahap 5 — WhatsApp:** integrasi Fonnte, template notifikasi, dan logging.

**Tahap 6 — Dashboard dan laporan:** statistik, filter, dan rekap transaksi.

**Tahap 7 — Pengujian:** pengujian fungsional, keamanan akses, error handling, dan dokumentasi.

Prioritaskan penyelesaian alur utama terlebih dahulu. Jangan menambahkan teknologi atau fitur di luar ruang lingkup tanpa alasan yang jelas.
