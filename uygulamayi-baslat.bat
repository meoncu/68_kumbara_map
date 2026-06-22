@echo off
title Kumbara Takip Sistemi
cls
echo ========================================
echo Kumbara Takip Sistemi - Baslatiliyor...
echo ========================================
echo.

cd /d "%~dp0web"

echo [1/3] Node surecleri temizleniyor...
taskkill /F /IM node.exe >nul 2>&1
echo.

echo [2/3] On bellek temizleniyor...
if exist .next (
    echo .next klasoru siliniyor...
    rmdir /s /q .next >nul 2>&1
)
echo.

echo [3/3] Geliştirme sunucusu baslatiliyor...
echo.
echo ========================================
echo Tarayicida acmak icin: http://localhost:3000
echo Cikmak icin: Ctrl + C
echo ========================================
echo.

call npm run dev
pause
