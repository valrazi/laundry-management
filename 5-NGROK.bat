@echo off
setlocal
cd /d "%~dp0"

set PORT=%~1
if "%PORT%"=="" set PORT=3000

echo ============================================================
echo   NGROK - MEMBUKA APLIKASI LAUNDRY KE INTERNET
echo ============================================================
echo.
echo Aplikasi lokal di port %PORT% akan dibuka ke internet.
echo.

where ngrok >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] ngrok belum terpasang di komputer ini.
  echo.
  echo Cara memasang:
  echo   1. Daftar gratis di https://ngrok.com
  echo   2. Unduh ngrok untuk Windows
  echo   3. Simpan ngrok.exe di folder ini atau masukkan ke PATH
  echo   4. Buka Command Prompt, jalankan sekali:
  echo        ngrok config add-authtoken TOKEN_ANDA
  echo.
  goto :selesai
)

if not exist "scripts\ngrok-sync-app-url.mjs" (
  echo [PERINGATAN] Script pembaru APP_URL tidak ditemukan.
  echo Alamat publik tetap muncul, tetapi APP_URL tidak diperbarui.
)

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo [CATATAN] Aplikasi laundry sedang berjalan.
  echo Setelah alamat publik muncul, tutup jendela 3-JALANKAN.bat lalu
  echo jalankan lagi supaya link pesanan memakai alamat baru.
  echo.
)

echo Alamat publik akan muncul di bawah ini, dan APP_URL di file .env
echo akan otomatis diperbarui. Perhatikan baris:
echo    [ngrok] APP_URL diperbarui menjadi https://...
echo.
echo JANGAN tutup jendela ini selama alamat tersebut dipakai.
echo Untuk berhenti, tekan Ctrl+C.
echo.

start "" /b node scripts\ngrok-sync-app-url.mjs
ngrok http %PORT%

:selesai
echo.
pause
endlocal
