# Deploying to AWS EC2 (single instance, HTTP)

Target architecture:

```
Internet :80 ──► EC2 instance ──► nginx ──► /        → React build (static)
                                          /api/*   → uvicorn :8000 (FastAPI)
                                                       │
                                                       ▼
                                                  S3 (Excel)  (via instance IAM role)
```

- One EC2 instance, t3.small, Amazon Linux 2023
- Nginx fronts everything on port 80
- FastAPI runs as a systemd service
- IAM **instance role** gives S3 access (no AWS keys on the server)
- HTTP only, accessed via the instance's public IP

> Choose this path for the simplest, cheapest first deploy. For the ECS Fargate + CloudFront alternative (production-grade, more moving parts), see [README.md](README.md).

## Prerequisites

- S3 bucket name and object key for your Excel file (e.g. `my-bucket` / `reports/india.xlsx`)
- Your laptop's public IP (visit `https://checkip.amazonaws.com/`) — needed to lock SSH down to just you
- AWS Console access in your chosen region (steps below use `us-east-1`; substitute everywhere if different)

---

## Phase 1 — AWS Console (IAM role, security group, EC2)

### 1.1 IAM role for the EC2 instance

1. **IAM → Roles → Create role**
2. Trusted entity type: **AWS service**
3. Use case: **EC2** → **Next**
4. Skip policy picker → **Next**
5. Role name: `india-info-ec2-role` → **Create role**
6. Open the new role → **Add permissions → Create inline policy** → JSON tab → paste:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::<S3_BUCKET>/<S3_KEY>"
     }]
   }
   ```

   Replace `<S3_BUCKET>` and `<S3_KEY>` with the real values. **Next** → policy name: `india-info-s3-read` → **Create policy**.

### 1.2 Security group

1. **EC2 → Security Groups → Create security group**
2. Name: `india-info-sg`, VPC: default
3. Inbound rules:
   - **SSH**, source **My IP**
   - **HTTP**, source **Anywhere-IPv4** (`0.0.0.0/0`)
4. Outbound: leave default → **Create security group**

### 1.3 Launch the EC2 instance

1. **EC2 → Instances → Launch instances**
2. **Name:** `india-info`
3. **AMI:** Amazon Linux 2023
4. **Instance type:** `t3.small` (or `t3.micro` for free tier)
5. **Key pair:** create a new one named `india-info-key` → download the `.pem` file
6. **Network settings → Edit → Firewall:** **select existing security group** → `india-info-sg`
7. **Advanced details → IAM instance profile:** `india-info-ec2-role`
8. **Storage:** 20 GB gp3 → **Launch instance**

Wait ~2 min for **Running** + **2/2 checks passed**.

### 1.4 (Recommended) Elastic IP

Without this, the public IP changes on reboot.

1. **EC2 → Elastic IPs → Allocate Elastic IP address** → Allocate
2. Select the EIP → **Actions → Associate Elastic IP address** → choose your instance → Associate
3. Copy the EIP — your permanent public IP.

---

## Phase 2 — SSH in and install software

From Windows PowerShell, in the folder where `india-info-key.pem` lives:

```powershell
# Restrict the key file permissions (required by SSH on Windows)
icacls .\india-info-key.pem /inheritance:r
icacls .\india-info-key.pem /grant:r "$($env:USERNAME):(R)"

# SSH in — replace <EIP>
ssh -i .\india-info-key.pem ec2-user@<EIP>
```

From here on, commands run on the **EC2 instance** (`[ec2-user@... ~]$`).

```bash
sudo dnf update -y
sudo dnf install -y python3.11 python3.11-pip git nginx

# Node 20 for building the frontend
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

python3.11 --version
node --version
nginx -v
```

---

## Phase 3 — Clone the repo and build

```bash
sudo mkdir -p /opt/india-info && sudo chown ec2-user:ec2-user /opt/india-info
cd /opt/india-info
git clone https://github.com/jl354367/india_info.git .

# Backend
cd /opt/india-info/report-app/backend
python3.11 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

# Frontend
cd /opt/india-info/report-app/frontend
npm ci
npm run build
# Produces report-app/frontend/dist/
```

---

## Phase 4 — systemd service for the API

```bash
sudo tee /etc/systemd/system/india-info-api.service > /dev/null <<'EOF'
[Unit]
Description=India Info FastAPI
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/opt/india-info/report-app/backend
Environment="AWS_REGION=us-east-1"
Environment="S3_BUCKET=<YOUR_BUCKET>"
Environment="S3_KEY=<YOUR_KEY>"
Environment="CACHE_TTL_SECONDS=600"
Environment="CORS_ORIGINS=*"
ExecStart=/opt/india-info/report-app/backend/.venv/bin/gunicorn -k uvicorn.workers.UvicornWorker -w 2 -b 127.0.0.1:8000 app.main:app
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Edit the file and fill in real values for `<YOUR_BUCKET>` and `<YOUR_KEY>`:

```bash
sudo nano /etc/systemd/system/india-info-api.service
# Ctrl-O, Enter to save; Ctrl-X to exit
```

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now india-info-api
sudo systemctl status india-info-api          # should be "active (running)"

curl http://127.0.0.1:8000/api/health/        # → {"status":"ok"}
curl http://127.0.0.1:8000/api/report/metadata # → JSON with rowCount > 0
```

If errors, check logs:

```bash
sudo journalctl -u india-info-api -n 100 --no-pager
```

---

## Phase 5 — Nginx

```bash
sudo tee /etc/nginx/conf.d/india-info.conf > /dev/null <<'EOF'
server {
    listen 80 default_server;
    server_name _;

    root /opt/india-info/report-app/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback for react-router routes like /report/3
    location / {
        try_files $uri /index.html;
    }
}
EOF

# AL2023's default nginx.conf already has a :80 default server — disable it
sudo sed -i 's/listen       80 default_server;/listen       8080;/' /etc/nginx/nginx.conf

# Let nginx read the frontend files
sudo chmod o+x /opt /opt/india-info /opt/india-info/report-app /opt/india-info/report-app/frontend
sudo chmod -R o+rX /opt/india-info/report-app/frontend/dist

sudo nginx -t
sudo systemctl enable --now nginx
```

---

## Phase 6 — Smoke test

From your laptop:

```powershell
curl http://<EIP>/api/health/
curl http://<EIP>/api/report/metadata
```

Open `http://<EIP>/` in a browser — the table should render with all 9 columns.

---

## Future updates

```bash
cd /opt/india-info
git pull
cd report-app/backend && .venv/bin/pip install -r requirements.txt
cd ../frontend && npm ci && npm run build
sudo systemctl restart india-info-api
sudo systemctl reload nginx
```

Wrap in `/opt/india-info/deploy.sh` for one-command future deploys.

---

## Common pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` from nginx | API not running on :8000 | `sudo journalctl -u india-info-api`. If SELinux denial in logs: `sudo setsebool -P httpd_can_network_connect 1` |
| Browser blank page or 403 on `/` | nginx can't read `dist/` | Re-run the `chmod o+x /opt …` chain in Phase 5 |
| `AccessDenied` from S3 in journalctl | Bucket/key in systemd Environment doesn't match IAM policy Resource ARN | Make them match exactly |
| Browser console: CORS errors | Frontend was built before `.env.production` existed | `cd report-app/frontend && npm run build` |
| Public IP changed after reboot | No Elastic IP attached | Phase 1.4 |
| `Connection refused` on first SSH | Security group SSH rule still says "anywhere" with wrong IP, or you used the wrong key file | Re-check SG inbound rules; confirm `.pem` path |

---

## Adding HTTPS later (when you have a domain)

1. Point an A-record at the Elastic IP
2. Update SG inbound: add **HTTPS (443)** from `0.0.0.0/0`
3. On the instance:
   ```bash
   sudo dnf install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```
4. Certbot rewrites the nginx config and sets up auto-renewal.
