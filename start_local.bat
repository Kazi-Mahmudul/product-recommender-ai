@echo off
echo Starting Peyechi Local Environment...

:: Create .local-env if it doesn't exist (using logic here just in case, but we crated it)
if not exist .local-env (
    echo WARNING: .local-env not found! Backend might not fail to load config.
)

:: Start Backend
:: Using python -m uvicorn to ensure we use the python environment
echo Starting Backend on port 8000...
start "Peyechi Backend" cmd /k "cd /d %~dp0 && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait a bit for backend to init (optional, but good for UX)
timeout /t 5

:: Start Frontend
echo Starting Frontend on port 3000...
start "Peyechi Frontend" cmd /k "cd /d %~dp0frontend && set REACT_APP_API_BASE=http://localhost:8000&& set REACT_APP_GEMINI_API=http://localhost:8000&& npm start"

echo ===================================================
echo Local Environment Started!
echo Backend: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo ===================================================
pause
