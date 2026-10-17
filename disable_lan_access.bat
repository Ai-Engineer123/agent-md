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

echo [1/3] Removing Windows Firewall Inbound Rule for Port 80...
netsh advfirewall firewall delete rule name="Allow Caddy Port 80" >nul 2>&1

echo [2/3] Setting Wi-Fi network profile back to Public mode...
powershell -NoProfile -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Public" >nul 2>&1

echo [3/3] Flushing DNS...
ipconfig /flushdns >nul

echo =========================================================
echo ROLLBACK COMPLETE!
echo.
echo Port 80 firewall rule has been DELETED.
echo Wi-Fi network profile is restored to PUBLIC mode.
echo External LAN access is now BLOCKED.
echo =========================================================
pause
