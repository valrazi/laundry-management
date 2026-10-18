@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   LANGKAH 2 - MENYIAPKAN DATABASE
echo ============================================================
echo.

if not exist ".env" (
  echo [GAGAL] File .env belum ada. Jalankan 1-INSTALL.bat lebih dulu.
  goto :selesai
)
if not exist "node_modules" (
  echo [GAGAL] Komponen belum terpasang. Jalankan 1-INSTALL.bat lebih dulu.
  goto :selesai
)

echo Menerapkan struktur database terbaru...
echo.
call npx prisma migrate deploy
if errorlevel 1 (
  echo.
  echo [GAGAL] Migrasi database gagal.
  echo Periksa dua hal berikut:
  echo   1. MySQL atau XAMPP sudah menyala
  echo   2. DATABASE_URL di file .env sudah benar
  goto :selesai
)

echo.
echo Memeriksa apakah data awal perlu dibuat...
call node scripts/seed-if-needed.mjs
if errorlevel 1 (
  echo [PERINGATAN] Data awal gagal dibuat.
  echo Database tetap siap, tetapi akun admin mungkin belum ada.
)

echo.
echo [SELESAI] Database siap dipakai.
echo Langkah berikutnya: jalankan 3-JALANKAN.bat

:selesai
echo.
pause
endlocal
