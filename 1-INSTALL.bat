@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   LANGKAH 1 - INSTALASI APLIKASI LAUNDRY
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] Node.js belum terpasang di komputer ini.
  echo.
  echo Unduh di https://nodejs.org lalu pilih versi LTS.
  echo Setelah terpasang, tutup dan buka lagi jendela ini.
  goto :selesai
)

for /f "delims=" %%v in ('node -v') do set NODEVER=%%v
echo Node.js terdeteksi: %NODEVER%
echo.

if exist "node_modules" (
  echo Komponen sudah terpasang sebelumnya, langkah ini dilewati.
) else (
  echo Memasang komponen. Perlu internet, bisa beberapa menit.
  echo Mohon tunggu dan jangan tutup jendela ini.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [GAGAL] Pemasangan komponen gagal. Periksa koneksi internet.
    goto :selesai
  )
)

echo.
if exist ".env" (
  echo File pengaturan .env sudah ada, dilewati.
) else (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo File pengaturan .env sudah dibuat dari contoh.
    echo.
    echo PENTING: buka file .env dengan Notepad, lalu sesuaikan
    echo DATABASE_URL dengan password MySQL di komputer ini.
    echo.
    echo Contoh isi:
    echo   DATABASE_URL="mysql://root:PASSWORD@127.0.0.1:3306/laundry_db"
    echo.
  ) else (
    echo [PERINGATAN] File .env.example tidak ditemukan.
  )
)

echo.
echo Menyiapkan Prisma Client...
call npx prisma generate
if errorlevel 1 (
  echo [GAGAL] Prisma generate gagal.
  goto :selesai
)

echo.
echo [SELESAI] Instalasi berhasil.
echo Langkah berikutnya: jalankan 2-MIGRATE.bat

:selesai
echo.
pause
endlocal
