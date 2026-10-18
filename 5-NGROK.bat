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

echo Pastikan aplikasi laundry sudah berjalan lebih dulu
echo lewat 3-JALANKAN.bat.
echo.
echo Setelah ngrok menyala, akan muncul alamat seperti:
echo    https://xxxx-xxxx-xxxx.ngrok-free.app
echo Alamat itulah yang dibagikan ke dosen atau teman.
echo.
echo JANGAN tutup jendela ini selama alamat tersebut dipakai.
echo Untuk berhenti, tekan Ctrl+C.
echo.

ngrok http %PORT%

:selesai
echo.
pause
endlocal
