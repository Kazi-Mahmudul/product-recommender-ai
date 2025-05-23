# Deployment Guide

This guide will help you deploy the Product Recommender API to a production environment.

## Prerequisites

- Ubuntu 20.04 or later
- Python 3.8 or later
- MySQL 8.0 or later
- Nginx (for reverse proxy)
- Domain name (optional, for SSL)

## Deployment Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd product_recommender
   ```

2. **Configure Environment Variables**
   - Copy `.env.production` to `.env`
   - Update the values in `.env` with your production settings

3. **Run the Deployment Script**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. **Configure Nginx**
   - Copy `nginx.conf` to `/etc/nginx/sites-available/product-recommender`
   - Update the `server_name` with your domain
   - Create a symbolic link:
     ```bash
     sudo ln -s /etc/nginx/sites-available/product-recommender /etc/nginx/sites-enabled/
     ```
   - Test and reload Nginx:
     ```bash
     sudo nginx -t
     sudo systemctl reload nginx
     ```

5. **Set Up SSL (Optional)**
   - Install Certbot:
     ```bash
     sudo apt-get install certbot python3-certbot-nginx
     ```
   - Obtain SSL certificate:
     ```bash
     sudo certbot --nginx -d your_domain.com
     ```

## Monitoring and Maintenance

- Check service status:
  ```bash
  sudo systemctl status product-recommender
  ```

- View logs:
  ```bash
  sudo journalctl -u product-recommender
  ```

- Restart service:
  ```bash
  sudo systemctl restart product-recommender
  ```

## Backup and Recovery

1. **Database Backup**
   ```bash
   mysqldump -u product_user -p product_recommender > backup.sql
   ```

2. **Restore Database**
   ```bash
   mysql -u product_user -p product_recommender < backup.sql
   ```

## Security Considerations

1. **Firewall Configuration**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Regular Updates**
   ```bash
   sudo apt-get update
   sudo apt-get upgrade
   ```

3. **Security Monitoring**
   - Regularly check logs for suspicious activity
   - Keep all packages updated
   - Monitor system resources

## Troubleshooting

1. **Service Won't Start**
   - Check logs: `sudo journalctl -u product-recommender`
   - Verify environment variables
   - Check database connection

2. **Nginx Issues**
   - Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify configuration: `sudo nginx -t`

3. **Database Connection Issues**
   - Verify MySQL is running: `sudo systemctl status mysql`
   - Check database credentials
   - Verify network connectivity

## Support

For any issues or questions, please contact the development team or create an issue in the repository. 