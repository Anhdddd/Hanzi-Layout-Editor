#!/bin/bash
set -e

# ============================================
# Hanzi Layout Editor — VPS Deployment Script
# ============================================
# Run this script as root on Ubuntu VPS
# Usage: bash deploy.sh
# ============================================

APP_DIR="/var/www/Hanzi-Layout-Editor"
DOMAIN_OR_IP="36.50.55.55"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Hanzi Layout Editor — VPS Deployment  ║"
echo "╚════════════════════════════════════════╝"
echo ""

# ─── Step 1: System Update ───
echo "▶ [1/10] Updating system packages..."
apt-get update -y
apt-get install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release git

# ─── Step 2: Install Node.js 20.x ───
echo ""
echo "▶ [2/10] Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "   Node.js $(node -v) installed"
else
  echo "   Node.js $(node -v) already installed"
fi

# ─── Step 3: Install PM2 ───
echo ""
echo "▶ [3/10] Installing PM2..."
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
  echo "   PM2 installed"
else
  echo "   PM2 already installed"
fi

# ─── Step 4: Install Docker ───
echo ""
echo "▶ [4/10] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "   Docker installed"
else
  echo "   Docker already installed: $(docker --version)"
fi

# ─── Step 5: Start PostgreSQL Container ───
echo ""
echo "▶ [5/10] Setting up PostgreSQL container..."
if docker ps -a --format '{{.Names}}' | grep -q '^hanzi-postgres$'; then
  if docker ps --format '{{.Names}}' | grep -q '^hanzi-postgres$'; then
    echo "   PostgreSQL container already running"
  else
    docker start hanzi-postgres
    echo "   PostgreSQL container started"
  fi
else
  docker run -d \
    --name hanzi-postgres \
    --restart unless-stopped \
    -e POSTGRES_DB=hanzi_editor \
    -e POSTGRES_USER=hanzi_user \
    -e POSTGRES_PASSWORD=hanzi_pass \
    -p 5432:5432 \
    -v hanzi_pgdata:/var/lib/postgresql/data \
    --memory=256m \
    postgres:15-alpine
  echo "   PostgreSQL container created and started"
fi

# Wait for PostgreSQL to be ready
echo "   Waiting for PostgreSQL to be ready..."
sleep 5
for i in {1..10}; do
  if docker exec hanzi-postgres pg_isready -U hanzi_user -d hanzi_editor &>/dev/null; then
    echo "   PostgreSQL is ready!"
    break
  fi
  echo "   Waiting... ($i/10)"
  sleep 2
done

# ─── Step 6: Install Nginx ───
echo ""
echo "▶ [6/10] Installing Nginx..."
if ! command -v nginx &> /dev/null; then
  apt-get install -y nginx
  systemctl enable nginx
  echo "   Nginx installed"
else
  echo "   Nginx already installed"
fi

# ─── Step 7: Create .env for server ───
echo ""
echo "▶ [7/10] Creating server .env..."
cat > "$APP_DIR/server/.env" << 'EOF'
# Server
PORT=3050

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hanzi_editor
DB_USER=hanzi_user
DB_PASSWORD=hanzi_pass

# JWT
JWT_SECRET=hanzi-layout-editor-prod-secret-2026-vps
JWT_EXPIRES_IN=7d
EOF
echo "   .env created at $APP_DIR/server/.env"

# ─── Step 8: Install Dependencies & Build Frontend ───
echo ""
echo "▶ [8/10] Installing dependencies..."

# Server dependencies
cd "$APP_DIR/server"
npm install --omit=dev
echo "   Server dependencies installed"

# Frontend dependencies & build
cd "$APP_DIR/web"
npm install
echo "   Frontend dependencies installed"

echo "   Building frontend..."
npx vite build
echo "   Frontend built successfully"

# ─── Step 9: Seed Database ───
echo ""
echo "▶ [9/10] Seeding database..."
cd "$APP_DIR/server"
node src/seed.js
echo "   Database seeded"

# ─── Step 10: Install Chromium for Puppeteer ───
echo ""
echo "▶ [10/10] Installing Chromium dependencies for PDF generation..."
apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2t64 \
  libatspi2.0-0 \
  libxshmfence1 \
  fonts-noto-cjk \
  fonts-noto-cjk-extra \
  2>/dev/null || apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2 \
  libatspi2.0-0 \
  libxshmfence1 \
  fonts-noto-cjk \
  fonts-noto-cjk-extra \
  2>/dev/null || true
echo "   Chromium dependencies installed"
echo "   CJK fonts installed (fonts-noto-cjk) — critical for Chinese PDF rendering"

# ─── Configure Nginx ───
echo ""
echo "▶ Configuring Nginx..."
cat > /etc/nginx/sites-available/hanzi-layout << NGINX
server {
    listen 80;
    server_name $DOMAIN_OR_IP;

    # Frontend — Vite build output
    root $APP_DIR/web/dist;
    index index.html;

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        client_max_body_size 50M;
    }

    # SPA fallback — serve index.html for all non-file routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/hanzi-layout /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test and reload
nginx -t && systemctl reload nginx
echo "   Nginx configured and reloaded"

# ─── Add Swap (for 2GB RAM VPS) ───
echo ""
echo "▶ Adding swap space (2GB) for low-memory VPS..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "   2GB swap added"
else
  echo "   Swap already exists"
fi

# ─── Start Backend with PM2 ───
echo ""
echo "▶ Starting backend with PM2..."
cd "$APP_DIR/server"
pm2 delete hanzi-server 2>/dev/null || true
pm2 start src/index.js --name hanzi-server --max-memory-restart 512M
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║         DEPLOYMENT COMPLETE! ✓            ║"
echo "╠═══════════════════════════════════════════╣"
echo "║                                           ║"
echo "║  Frontend: http://$DOMAIN_OR_IP     ║"
echo "║  Login:    http://$DOMAIN_OR_IP/login.html║"
echo "║  API:      http://$DOMAIN_OR_IP/api/health║"
echo "║                                           ║"
echo "║  Admin account:                           ║"
echo "║    Email:    admin@gmail.com               ║"
echo "║    Password: 123456                        ║"
echo "║                                           ║"
echo "║  PM2 commands:                            ║"
echo "║    pm2 status                             ║"
echo "║    pm2 logs hanzi-server                  ║"
echo "║    pm2 restart hanzi-server               ║"
echo "║                                           ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
