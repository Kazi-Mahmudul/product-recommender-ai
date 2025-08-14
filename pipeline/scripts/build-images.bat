@echo off
REM Build script for all pipeline service images (Windows)

setlocal enabledelayedexpansion

REM Configuration
if "%REGISTRY%"=="" set REGISTRY=localhost:5000
if "%TAG%"=="" set TAG=latest
if "%BUILD_ARGS%"=="" set BUILD_ARGS=

echo 🏗️  Building pipeline service images...

REM Function to build and tag image
:build_image
set service=%1
set dockerfile=%2
set context=%3
set image_name=%REGISTRY%/pipeline-%service%:%TAG%

echo Building %service% service...

docker build %BUILD_ARGS% -f "%dockerfile%" -t "%image_name%" "%context%"
if %errorlevel% neq 0 (
    echo ❌ Failed to build %service% service
    exit /b 1
)

echo ✅ Successfully built %image_name%

REM Also tag as latest
docker tag "%image_name%" "%REGISTRY%/pipeline-%service%:latest"

goto :eof

REM Build scraper service
call :build_image "scraper" "pipeline/docker/services/scraper.dockerfile" "."

echo 🎉 All images built successfully!

REM Show built images
echo Built images:
docker images | findstr "pipeline-"

REM Optional: Push to registry
if "%PUSH_IMAGES%"=="true" (
    echo 📤 Pushing images to registry...
    for /f "tokens=1" %%i in ('docker images --format "{{.Repository}}:{{.Tag}}" ^| findstr "pipeline-"') do (
        echo Pushing %%i...
        docker push "%%i"
    )
    echo ✅ Images pushed to registry
)

pause