#!/usr/bin/env bash
set -e

echo "=== Setting up MT5Connector on Linux VPS ==="

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 2. Install dependencies
echo "Installing server and client dependencies..."
npm run install:all

# 3. Build frontend
echo "Building frontend..."
npm run build

# 4. Ensure .env exists in server
if [ ! -f "server/.env" ]; then
    echo "Creating server/.env with random JWT_SECRET..."
    SECRET=$(openssl rand -hex 32)
    cat <<EOF > server/.env
PORT=5000
JWT_SECRET=${SECRET}
EOF
fi

# 5. Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 globally..."
    sudo npm install -g pm2
fi

# 6. Start with PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "=== MT5Connector setup complete! ==="
echo "Check status: pm2 status"
echo "View logs:    pm2 logs mt5connector"
