@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   LANGKAH 3 - MENJALANKAN APLIKASI LAUNDRY
echo ============================================================
echo.

if not exist "node_modules" (
  echo [GAGAL] Komponen belum terpasang. Jalankan 1-INSTALL.bat lebih dulu.
  goto :selesai
)
if not exist ".env" (
  echo [GAGAL] File .env belum ada. Jalankan 1-INSTALL.bat lebih dulu.
  goto :selesai
)

echo Aplikasi akan terbuka otomatis di browser:
echo    http://localhost:3000
echo.
echo JANGAN tutup jendela ini selama aplikasi dipakai.
echo Untuk menghentikan aplikasi, tekan Ctrl+C lalu Y.
echo.
echo Menyiapkan server, mohon tunggu sekitar 10 detik...
echo.

start "" /min powershell -NoProfile -Command "Start-Sleep -Seconds 10; Start-Process 'http://localhost:3000'"
call npm run dev

:selesai
echo.
pause
endlocal
