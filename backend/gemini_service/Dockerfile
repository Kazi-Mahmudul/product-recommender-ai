# Use Node.js 18 slim image for smaller size and security
FROM node:18-slim

# Set environment variables for production
ENV NODE_ENV=production
ENV NPM_CONFIG_CACHE=/tmp/.npm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set work directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/.npm

# Copy application code
COPY . .

# Set proper permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user for security
USER appuser

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start the application
CMD ["node", "index.js"]