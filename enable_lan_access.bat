@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo =========================================================
    echo ERROR: Please RIGHT-CLICK this file and select:
    echo        "Run as administrator"
    echo =========================================================
    pause
    exit /b 1
)

echo [1/3] Setting Wi-Fi network to Private mode...
powershell -NoProfile -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private" >nul 2>&1

echo [2/3] Adding Windows Firewall Inbound Rule for Port 80 (HTTP)...
netsh advfirewall firewall delete rule name="Allow Caddy Port 80" >nul 2>&1
netsh advfirewall firewall add rule name="Allow Caddy Port 80" dir=in action=allow protocol=TCP localport=80 >nul 2>&1

echo [3/3] Flushing DNS...
ipconfig /flushdns >nul

echo =========================================================
echo SUCCESS! LAN ACCESS ENABLED!
echo.
echo Your Host PC IP: 192.168.29.24
echo.
echo ON THE OTHER SYSTEM (Laptop/Mobile):
echo 1. Connect to the same Wi-Fi (VIPRAS_TECH_5G)
echo 2. Open browser and test: http://192.168.29.24
echo =========================================================
pause
