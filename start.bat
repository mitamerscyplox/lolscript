@echo off
cd /d "%~dp0"

set PORT=8080
set URL=http://localhost:%PORT%

echo Starting LOLScript.store on %URL% ...
start "" cmd /c "node serve.mjs %PORT%"

timeout /t 2 /nobreak >nul

where chrome >nul 2>&1
if %ERRORLEVEL%==0 (
  start "" chrome "%URL%"
  goto :done
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%URL%"
  goto :done
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%URL%"
  goto :done
)

if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%URL%"
  goto :done
)

start "" "%URL%"

:done
echo Site opened. Keep the server window open while you browse.
exit /b 0
