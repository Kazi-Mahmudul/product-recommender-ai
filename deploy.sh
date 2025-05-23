#!/bin/bash

# Exit on error
set -e

echo "Starting deployment process..."

# 1. Update system packages
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. Install required system packages
echo "Installing system dependencies..."
sudo apt-get install -y python3-pip python3-venv mysql-server

# 3. Create and activate virtual environment
echo "Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# 4. Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.production.txt

# 5. Set up MySQL
echo "Setting up MySQL..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS product_recommender;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'product_user'@'localhost' IDENTIFIED BY 'secure_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON product_recommender.* TO 'product_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 6. Run database migrations
echo "Running database migrations..."
alembic upgrade head

# 7. Set up systemd service
echo "Setting up systemd service..."
sudo tee /etc/systemd/system/product-recommender.service << EOF
[Unit]
Description=Product Recommender API
After=network.target

[Service]
User=$USER
WorkingDirectory=$(pwd)
Environment="PATH=$(pwd)/venv/bin"
Environment="ENVIRONMENT=production"
ExecStart=$(pwd)/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app -b 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
EOF

# 8. Start the service
echo "Starting the service..."
sudo systemctl daemon-reload
sudo systemctl enable product-recommender
sudo systemctl start product-recommender

echo "Deployment completed successfully!"
echo "You can check the service status with: sudo systemctl status product-recommender" 