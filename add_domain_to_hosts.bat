@echo off
:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo =========================================================
    echo ERROR: Please RIGHT-CLICK this file and select:
    echo        "Run as administrator"
    echo =========================================================
    pause
    exit /b 1
)

set HOSTS_FILE=%WINDIR%\System32\drivers\etc\hosts

:: Check if already exists
findstr /i "md.agent.com" "%HOSTS_FILE%" >nul 2>&1
if %errorLevel% equ 0 (
    echo md.agent.com is already present in your hosts file!
) else (
    echo.>>"%HOSTS_FILE%"
    echo 127.0.0.1    md.agent.com>>"%HOSTS_FILE%"
    echo 192.168.0.200    md.agent.com>>"%HOSTS_FILE%"
    echo SUCCESS: Added md.agent.com to %HOSTS_FILE%
)

:: Flush DNS
ipconfig /flushdns >nul
echo.
echo DNS Cache Flushed successfully!
echo You can now open: http://md.agent.com
echo =========================================================
pause
