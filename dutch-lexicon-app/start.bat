@echo off
rem Launch Lexicon NL on Windows: double-click this file.
cd /d "%~dp0"
where py >nul 2>nul && (py -3 serve.py %* & goto :eof)
where python >nul 2>nul && (python serve.py %* & goto :eof)
echo Python 3 was not found. You can still open index.html directly in your browser.
pause
