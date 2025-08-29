#!/bin/sh

# Print environment for debugging
echo "Environment variables:"
echo "PORT: $PORT"
echo "ENVIRONMENT: $ENVIRONMENT"

# Check if PORT is set, if not set it to 8080 (default for Cloud Run)
if [ -z "$PORT" ]; then
  echo "PORT is not set, using default 8080"
  PORT=8080
else
  echo "Using PORT: $PORT"
fi

# Start the application using Uvicorn (simpler, Cloud Run manages scaling)
echo "Starting server with command: uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers"
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers