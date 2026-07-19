# AnimPlay Deployment Guide

## Quick Start (Docker)

```bash
# 1. Clone repo
git clone <your-repo-url>
cd AnimPlay

# 2. Copy environment
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and JWT_SECRET

# 3. Start with Docker Compose
docker compose up -d

# 4. Check logs
docker compose logs -f animplay
```

## Manual Deployment (VPS)

### 1. Server Setup
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### 2. Build & Deploy
```bash
# Clone repo
git clone <your-repo-url>
cd AnimPlay

# Install dependencies
cd server && npm ci
cd ../client && npm ci

# Build
cd ../server && npm run build
cd ../client && npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/animplay
sudo ln -s /etc/nginx/sites-available/animplay /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL
```bash
sudo certbot --nginx -d your-domain.com
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Set to `production` |

## Architecture

```
Internet
    |
    v
Nginx (port 80/443)
    |
    |-- /api/*        -> Node.js backend (port 3001)
    |-- /socket.io/*  -> Socket.io (port 3001)
    |-- /*            -> React static files (client/dist/)
    |
    v
MongoDB (port 27017)
```

## Scaling

For production with multiple servers:
1. Use MongoDB Atlas or a replicated MongoDB cluster
2. Use Socket.io Redis adapter for horizontal scaling:
   ```bash
   npm install @socket.io/redis-adapter redis
   ```
3. Configure sticky sessions in Nginx:
   ```nginx
   upstream animplay {
       ip_hash;
       server 127.0.0.1:3001;
   }
   ```
