# Build stage
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies to a temporary location
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

# Final stage
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# Install runtime dependencies (only what's needed to run, not build)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python dependencies from builder stage
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Run as non-root user for security (GCP Cloud Run overrides this usually, but good practice)
# RUN useradd -m appuser && chown -R appuser /app
# USER appuser

# Make start script executable
RUN chmod +x start_server.sh

# Command to run the application using start_server.sh which includes proxy headers
CMD ["./start_server.sh"]