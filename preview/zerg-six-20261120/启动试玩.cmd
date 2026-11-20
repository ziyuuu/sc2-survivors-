@echo off
setlocal
cd /d "%~dp0..\.."
set "SC2_ZERG_TRIAL=http://127.0.0.1:15302/preview/zerg-six-20261120/"
powershell -NoProfile -Command "try {$r=Invoke-WebRequest -UseBasicParsing $env:SC2_ZERG_TRIAL -TimeoutSec 3; if($r.StatusCode -eq 200 -and $r.Content.Contains('/preview/zerg-six-20261120/main.ts')){exit 0}} catch {}; exit 1"
if not errorlevel 1 goto open
call npm run assets:restore
if errorlevel 1 goto failed
start "SC2 Zerg Trial" /min node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 15302 --strictPort
powershell -NoProfile -Command "for($i=0;$i -lt 20;$i++){try{if((Invoke-WebRequest -UseBasicParsing $env:SC2_ZERG_TRIAL -TimeoutSec 1).StatusCode -eq 200){exit 0}}catch{};Start-Sleep -Milliseconds 500};exit 1"
if errorlevel 1 goto failed
:open
start "" "%SC2_ZERG_TRIAL%"
exit /b 0
:failed
echo Zerg trial could not start. Check the server and asset errors above.
pause
exit /b 1
