@echo off
echo Setting up Artifact Registry Lifecycle Policy...

SET PROJECT_ID=product-recommendations-469010
SET REPO_NAME=cloud-run-source-deploy
SET LOCATION=asia-southeast1

echo Project: %PROJECT_ID%
echo Repo: %REPO_NAME%
echo Location: %LOCATION%

REM Delete untagged images (ALWAYS safe and usually the source of bloat)
echo.
echo Deleting untagged images...
gcloud artifacts repositories set-cleanup-policies %REPO_NAME% ^
  --project=%PROJECT_ID% ^
  --location=%LOCATION% ^
  --policy=%~dp0artifact_lifecycle_policy.json ^
  --no-dry-run

echo.
echo Done! Cycle policy applied.
pause
