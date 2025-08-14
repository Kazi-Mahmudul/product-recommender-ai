# Dockerfile for Pipeline Trigger API Service
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements-trigger-api.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-trigger-api.txt

# Copy application code
COPY dags/scheduling/trigger_api.py .
COPY dags/utils/ ./utils/
COPY dags/config/ ./config/

# Create necessary directories
RUN mkdir -p /app/logs /app/triggers

# Set environment variables
ENV FLASK_APP=trigger_api.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

# Start the application
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"]