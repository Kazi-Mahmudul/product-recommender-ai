#!/bin/sh

# Print environment for debugging
echo "Environment variables:"
echo "PORT: $PORT"
echo "ENVIRONMENT: $ENVIRONMENT"

# Check if PORT is set, if not set it to 8000
if [ -z "$PORT" ]; then
  echo "PORT is not set, using default 8000"
  PORT=8000
else
  echo "Using PORT: $PORT"
fi

# Start the application using gunicorn with the correct port
echo "Starting server with command: gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT"
exec gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT