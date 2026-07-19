#!/bin/bash
set -e

echo "=== AnimPlay Deployment Script ==="

# Configuration
APP_NAME="animplay"
APP_DIR="/opt/animplay"
DOMAIN_NAME="${DOMAIN_NAME:-animplay.your-domain.com}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/animplay_db}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

# Install dependencies
echo "[1/6] Installing system dependencies..."
apt update
apt install -y nginx certbot python3-certbot-nginx mongodb

# Create app directory
echo "[2/6] Setting up application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p /var/www/animplay

# Copy files
echo "[3/6] Copying application files..."
cp -r server $APP_DIR/
cp -r client $APP_DIR/
cp -r shared $APP_DIR/
cp package.json $APP_DIR/
cp ecosystem.config.js $APP_DIR/

# Install Node dependencies
echo "[4/6] Installing Node.js dependencies..."
cd $APP_DIR/server && npm ci --only=production
cd $APP_DIR/client && npm ci

# Build
echo "[5/6] Building application..."
cd $APP_DIR/server && npm run build
cd $APP_DIR/client && npm run build
cp -r $APP_DIR/client/dist/* /var/www/animplay/

# Create environment file
echo "[6/6] Configuring environment..."
cat > $APP_DIR/server/.env << EOF
NODE_ENV=production
MONGO_URI=$MONGO_URI
JWT_SECRET=$JWT_SECRET
PORT=3001
EOF

# Create PM2 service
pm2 delete $APP_NAME || true
pm2 start $APP_DIR/ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx
cat > /etc/nginx/sites-available/animplay << 'NGINX'
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    root /var/www/animplay;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/animplay /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo ""
echo "=== Deployment Complete ==="
echo "App URL: http://$DOMAIN_NAME"
echo "API: http://$DOMAIN_NAME/api"
echo "Socket: http://$DOMAIN_NAME/socket.io"
echo ""
echo "To enable SSL, run:"
echo "  certbot --nginx -d $DOMAIN_NAME"
echo ""
echo "To view logs:"
echo "  pm2 logs animplay-server"
