@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   LANGKAH 4 - MENGAMBIL UPDATE TERBARU
echo ============================================================
echo.

if not exist ".git" (
  echo [INFO] Folder ini bukan salinan dari repository Git.
  echo Update otomatis tidak tersedia. Mintalah file terbaru
  echo kepada pemilik aplikasi.
  goto :selesai
)

where git >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] Git belum terpasang di komputer ini.
  echo Unduh di https://git-scm.com
  goto :selesai
)

echo Mengambil update dari repository...
echo.
git pull --ff-only
if errorlevel 1 (
  echo.
  echo [PERHATIAN] Update tidak bisa diterapkan otomatis.
  echo Biasanya karena ada perubahan lokal pada file proyek.
  echo Hubungi pemilik aplikasi.
  goto :selesai
)

echo.
echo Memperbarui komponen bila ada yang baru...
call npm install
if errorlevel 1 (
  echo [PERINGATAN] Pembaruan komponen gagal. Coba jalankan 1-INSTALL.bat.
)

echo.
echo Menyiapkan Prisma Client...
call npx prisma generate

echo.
echo Menerapkan perubahan database bila ada...
call npx prisma migrate deploy
if errorlevel 1 (
  echo [PERINGATAN] Migrasi gagal. Periksa apakah MySQL sudah menyala.
)

echo.
echo Membuat data awal bila database masih kosong...
call node scripts/seed-if-needed.mjs

echo.
echo [SELESAI] Aplikasi sudah diperbarui.
echo Jalankan 3-JALANKAN.bat untuk memakai versi terbaru.

:selesai
echo.
pause
endlocal
