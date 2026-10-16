# MT5Connector - MetaTrader 5 Account Statistics & Analytics

A full-stack web application for tracking, analyzing, and aggregating MetaTrader 5 trading accounts (Live, Demo, and Prop Firm challenges) via a lightweight compiled MQL5 Expert Advisor.

## Features
- **Multi-Tenant User Isolation**: Each registered user has their own isolated accounts, deals, and positions.
- **Compiled EA Connector**: Pre-compiled `AccountStatsConnector.ex5` for 1-click download and setup.
- **SQLite Database with WAL Mode**: High concurrency, crash-resilient local storage.
- **Rich Dashboard & Analytics**: P&L calendar, EA performance breakdown, session charts, deal logs.

---

## Moving to a Linux VPS

### 1. Requirements on Linux VPS
- Ubuntu 22.04 / 24.04 (or Debian 11/12)
- Node.js 20 LTS
- Nginx (for reverse proxy)
- PM2 (for background service management)

### 2. Fast Setup on Linux VPS
```bash
# Clone the repository
git clone <YOUR_GITHUB_REPO_URL> mt5connector
cd mt5connector

# Run the automated setup script
chmod +x setup-linux.sh
./setup-linux.sh
```

### 3. Migrating Your Existing Database & Secret
To carry over your existing trade history and user accounts from your Windows server:
1. Copy `server/database.sqlite` from the Windows server to `server/database.sqlite` on the Linux VPS.
2. Copy `server/.env` (to preserve your `JWT_SECRET` so existing user logins remain valid).

### 4. Nginx & Cloudflare Configuration
1. Copy the Nginx config:
   ```bash
   sudo cp nginx-mt5connector.conf /etc/nginx/sites-available/mt5connector.uk
   sudo ln -s /etc/nginx/sites-available/mt5connector.uk /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
2. (Optional SSL via Certbot):
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d mt5connector.uk -d www.mt5connector.uk
   ```

---

## Cloudflare DNS Setup

### Do you need Cloudflare Tunnel on a Linux VPS?
**No, you do not need Cloudflare Tunnel anymore.** Linux VPS servers have a direct public IP address, so you can point your domain directly to the VPS using an **A record**:

1. In your **Cloudflare Dashboard** -> **DNS** -> **Records**:
   - Find and **delete** the old `CNAME` record for `mt5connector.uk` that pointed to the Cloudflare Tunnel (`*.cfargotunnel.com`).
   - Add a new **A record**:
     - **Type**: `A`
     - **Name**: `@` (or `mt5connector.uk`)
     - **IPv4 address**: `<YOUR_LINUX_VPS_IP>`
     - **Proxy status**: **Proxied (Orange Cloud)**
   - Add a CNAME for www (optional):
     - **Type**: `CNAME`
     - **Name**: `www`
     - **Target**: `@`
     - **Proxy status**: **Proxied (Orange Cloud)**
2. In **SSL/TLS**:
   - Set encryption mode to **Full** (or **Full (strict)** if you set up Certbot on Nginx).
