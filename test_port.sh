#!/bin/bash
# Simple test script to verify PORT variable

echo "Testing PORT variable..."
echo "PORT is set to: $PORT"

if [ -z "$PORT" ]; then
  echo "PORT is not set, using default 8000"
  PORT=8000
fi

echo "Starting server on port $PORT"