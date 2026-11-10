# FaceMark &mdash; Production Deployment Guide

This guide walks you through deploying **FaceMark** to a single cloud Virtual Machine (VM) using `docker-compose.prod.yml` with automated HTTPS, as well as alternative options for managed cloud platforms.

---

## 1. Hardware Requirements & RAM Sizing

FaceMark's biometric facial recognition engine runs entirely on the CPU using ONNX Runtime and InsightFace.

### RAM Sizing Guide

| Component | Default (`buffalo_l`) | Low-Memory Fallback (`buffalo_s`) |
| :--- | :--- | :--- |
| **Model Size** | ~350 MB weights | ~85 MB weights |
| **Inference RAM** | ~1.2 GB &ndash; 1.8 GB RAM | ~400 MB &ndash; 600 MB RAM |
| **Min. Recommended VM**| **4 GB RAM** (e.g. 2 vCPU, 4GB RAM) | **1 GB &ndash; 2 GB RAM** (e.g. 1 vCPU, 2GB RAM) |
| **Swap File** | 2 GB Swap recommended | 1 GB &ndash; 2 GB Swap recommended |
| **Use Case** | Wide classroom photos with 30+ faces | Small groups (5&ndash;15 students) or budget hosting |

> [!WARNING]
> **RAM Memory Warning for `buffalo_l`:**
> Running the default `buffalo_l` model on a VM with $\le 2$ GB RAM without swap may trigger Linux Out-Of-Memory (OOM) killer terminations during startup or batch recognition.
>
> If your cloud VM has **2 GB RAM or less** (e.g. \$4&ndash;6/mo Hetzner CX22, DigitalOcean Basic, AWS `t4g.small`), switch to `buffalo_s` in your `.env`:
> ```bash
> MODEL_NAME=buffalo_s
> ```
> This reduces memory consumption by over **65%** while retaining high biometric verification accuracy.

### Enabling Swap Space (Recommended on all Linux VMs)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 2. Deploying on a Single Cloud VM (Ubuntu 22.04 LTS / Debian 12)

### Step 1: Install Docker & Docker Compose V2
```bash
# Update package lists
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker and Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker compose version
```

### Step 2: Clone Repository & Configure Environment
```bash
git clone https://github.com/<your-username>/facemark.git
cd facemark
cp .env.example .env
```

### Step 3: Configure Production `.env`
Edit `.env` using `nano .env` and configure the following production values:

```bash
# 1. Environment Flag
ENVIRONMENT=production

# 2. Strong Random JWT Secret Key (Generate with: openssl rand -hex 32)
SECRET_KEY=9a4c8e1f57b23d90218f4a7c83de21b4a92358cb123e45f90a21bc34def56789

# 3. Database Credentials (Change from defaults!)
POSTGRES_USER=facemark_prod_user
POSTGRES_PASSWORD=YourStrongDatabasePassword123!
POSTGRES_DB=facemark_production_db

# 4. Production Seed Passwords (MUST be changed from admin123 / teacher123)
SEED_ADMIN_EMAIL=admin@yourtuitiondomain.com
SEED_ADMIN_PASSWORD=AdminSecurePassword2026!
SEED_TEACHER_EMAIL=teacher@yourtuitiondomain.com
SEED_TEACHER_PASSWORD=TeacherSecurePassword2026!

# 5. Face Model Selection (buffalo_l for 4GB+ RAM, buffalo_s for <= 2GB RAM)
MODEL_NAME=buffalo_l

# 6. CORS Allowed Origins (Comma-separated exact domains)
CORS_ORIGINS=https://facemark.yourtuitiondomain.com,http://localhost

# 7. Login Rate Limiting (SlowAPI)
RATE_LIMIT_LOGIN=5/minute
```

### Step 4: Build & Launch Production Containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 5: Verify Container Health
```bash
docker compose -f docker-compose.prod.yml ps
```
All three services (`facemark_prod_db`, `facemark_prod_backend`, `facemark_prod_frontend`) should show status `Up (healthy)`.

---

## 3. Configuring Domain & HTTPS (SSL/TLS)

In production, user webcams and facial photo uploads require a secure HTTPS context.

### Option A: Caddy Server (Recommended & Zero-Config)
Caddy automatically provisions and renews Let's Encrypt SSL certificates with zero maintenance.

1. Install Caddy on host:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

2. Edit `/etc/caddy/Caddyfile`:
   ```caddy
   facemark.yourtuitiondomain.com {
       reverse_proxy localhost:80
   }
   ```

3. Reload Caddy:
   ```bash
   sudo systemctl reload caddy
   ```
   Caddy will automatically issue an HTTPS certificate and redirect all HTTP traffic to HTTPS.

---

### Option B: Host Nginx + Let's Encrypt Certbot

1. Install Nginx and Certbot:
   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. Configure `/etc/nginx/sites-available/facemark`:
   ```nginx
   server {
       server_name facemark.yourtuitiondomain.com;

       location / {
           proxy_pass http://localhost:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           client_max_body_size 15M;
       }
   }
   ```

3. Enable configuration and obtain certificate:
   ```bash
   sudo ln -s /etc/nginx/sites-available/facemark /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d facemark.yourtuitiondomain.com
   ```

---

## 4. Alternative: Managed Cloud Platforms

If you prefer not to manage a Linux VM, you can deploy FaceMark on managed container platforms:

### Render
1. Create a **PostgreSQL** instance on Render.
2. Create a **Web Service** pointing to `./facemark/backend/Dockerfile.prod`:
   - Set instance type to **Standard** (2 GB RAM) or **Pro** (4 GB RAM).
   - Set environment variables (`DATABASE_URL`, `SECRET_KEY`, `MODEL_NAME=buffalo_s` if using 2GB instance).
   - Attach a persistent disk mounted at `/home/appuser/.insightface` to persist model downloads.
3. Create a **Static Site** for `./facemark/frontend` (or Web Service using `frontend/Dockerfile.prod` with `VITE_API_BASE_URL` pointing to backend).

### Railway
1. Add PostgreSQL from Railway marketplace.
2. Deploy backend service using `facemark/backend/Dockerfile.prod`:
   - Set environment variables referencing `${{ Postgres.DATABASE_URL }}`.
   - Allocate minimum 2 GB RAM.
3. Deploy frontend using `facemark/frontend/Dockerfile.prod`.

---

## 5. Operations, Maintenance & Backups

### Automated Database Backups
Create a daily backup cron job:
```bash
mkdir -p ~/facemark_backups
crontab -e
```
Add the following entry to backup every morning at 3:00 AM:
```cron
0 3 * * * docker compose -f /path/to/facemark/docker-compose.prod.yml exec -T db pg_dump -U postgres facemark_db | gzip > ~/facemark_backups/facemark_$(date +\%Y\%m\%d).sql.gz
```

### Viewing Production Logs
```bash
# View backend logs
docker compose -f docker-compose.prod.yml logs -f --tail=100 backend

# View frontend access logs
docker compose -f docker-compose.prod.yml logs -f --tail=100 frontend
```

### Applying Future Database Migrations
```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Updating to the Latest Release
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```
