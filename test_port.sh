#!/bin/bash
# Simple test script to verify PORT variable

echo "Testing PORT variable..."
echo "PORT is set to: $PORT"

if [ -z "$PORT" ]; then
  echo "PORT is not set, using default 8080"
  PORT=8080
fi

echo "Starting server on port $PORT"