# Associate Cloud Engineer Technical Examination

**Developed by:** Pasindu Jayawardhane - DevOps Engineer

## Project Overview

This repository contains a minimal full-stack CRUD app to demonstrate infrastructure, security, containerization, and deployment readiness on AWS Free Tier.

## Stack

- Backend: Django + Django REST Framework
- Frontend: React (Vite)
- Database: PostgreSQL
- Reverse Proxy: Nginx
- Runtime: Docker + Docker Compose (`backend`, `frontend`, `postgres`, `nginx`)

## Features

- Create, read, update, delete Notes
- S3 File Upload for Notes
- Notes fields:
  - `id`
  - `title` (required)
  - `description`
  - `file` (uploaded attachment directly stored in AWS S3)
  - `created_at`
  - `updated_at`
- Backend health endpoint: `/health/`

## Project Structure

```text
.
├── backend/
├── frontend/
├── nginx/
├── docker-compose.yml
└── .env.example
```

## Run Locally (Docker)

1. Copy environment template:

```bash
cp .env.example .env
```

2. Build and start:

```bash
docker compose up --build
```

3. Open:

- Application (via Nginx): `http://localhost:8080`
- API root (via Nginx): `http://localhost:8080/api/`
- Admin (via Nginx): `http://localhost:8080/admin/`
- Nginx health: `http://localhost:8080/nginx-health`

4. Stop:

```bash
docker compose down
```

To also remove data volume:

```bash
docker compose down -v
```

## Run Locally (Without Docker)

Use two terminals.

Terminal 1: Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Terminal 2: Frontend

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`

If `5173` is already in use, Vite will use the next free port (for example `5174`).

## API Endpoints

- `GET /api/notes/` list notes (paginated)
- `POST /api/notes/` create note
- `GET /api/notes/{id}/` retrieve note
- `PUT /api/notes/{id}/` update note
- `PATCH /api/notes/{id}/` partial update note
- `DELETE /api/notes/{id}/` delete note

## Security/Production Best Practices Included

- Environment-driven configuration (no hardcoded secrets)
- Dockerized services with non-root backend user
- Separate Nginx reverse-proxy service for edge routing
- PostgreSQL healthcheck before app start
- Automatic migrations + static file collection in container startup
- Secure Django defaults for non-debug mode:
  - HSTS
  - secure cookies
  - XSS/content-type protections
  - optional HTTPS redirect behind reverse proxy
- CORS/CSRF allowed origins explicitly configured via env
- Basic API throttling enabled

Required environment groups are already templated in `.env.example`:
- PostgreSQL credentials/host/port
- Django secret key and runtime flags
- AWS deployment configuration variables (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, etc.)

## AWS Architecture & Deployment Guide

This section explains the design and steps for deploying this CRUD application in a secure, production-ready manner using the **AWS Free Tier**.

### 1. Architecture Design

The architecture uses a monolithic Docker Compose deployment hosted on a single Amazon EC2 instance (to stay strictly within the free tier), integrated with Amazon S3.
* **Component Layout**:
  * **Nginx** handles public requests on ports 80/443, terminating SSL/TLS (using Certbot), and acting as a reverse proxy for Frontend and Backend.
  * **React Frontend** serves static JS/CSS boundaries in an nginx container, mapping API calls to the backend via reverse proxy.
  * **Django Backend** functions as the API and interacts with the internal PostgreSQL database. Files are saved directly to S3 via `boto3`.
  * **PostgreSQL Database** runs as a container with mounted Docker volumes to persist data across container restarts.

### 2. AWS Free Tier Setup & Limitation Considerations

* **Compute (EC2)**: We will use a `t2.micro` or `t3.micro` instance (depending on region) under the 750 hours/month free tier allowance.
* **Storage (EBS)**: The EC2 instance will be configured with up to 30 GB of General Purpose SSD (gp2/gp3) storage, accommodating the OS, Docker images, and local PostgreSQL data.
* **Object Storage (S3)**: S3 Standard provides 5 GB of free tier storage, suitable for note attachments. 

*Future Scaling Strategy*: Currently deployed as a single node since AWS Free Tier does not cover a NAT Gateway, multi-AZ Load Balancers, and Managed RDS gracefully without incurring costs. To scale beyond free tier: Separate DB via Amazon RDS, split backend and frontend to Amazon ECS (Fargate), and place them in Private Subnets with an ALB routing traffic.

*Backups*: For zero-cost backups, we can schedule a cron job inside the EC2 to run `pg_dump` and sync the encrypted dump to the Free Tier S3 Bucket using the AWS CLI. S3 versioning/lifecycle policies will maintain previous versions.

### 3. Security Group Rules

Create a security group attached to the EC2 instance with the following ingress rules to strictly manage exposure:
* **Port 80 (HTTP)**: Allow `0.0.0.0/0` (Redirects to HTTPS in production)
* **Port 443 (HTTPS)**: Allow `0.0.0.0/0` (For encrypted API/Frontend Access)
* **Port 22 (SSH)**: Allow **My IP Only** (e.g., `203.0.113.1/32`) – Never open SSH globally. Everything else should be closed. The database port (5432) remains closed to the world and is only reachable over the internal Docker network.

### 4. IAM Configuration (Least Privilege)

Instead of using blanket permissions, you must create a specific IAM Policy limiting the application strictly to the required bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-notes-crud-upload-bucket/*"
    }
  ]
}
```
Attach this policy to an **IAM Role** attached to the EC2 instance (IAM Instance Profile). This effortlessly fulfills the "No Hardcoded Secrets" requirement.

**If you already launched your EC2 instance without a role:**
1. Navigate to **EC2** in the AWS Console.
2. Right-click your instance -> **Security** -> **Modify IAM Role**.
3. Select your S3 Access IAM Role and click **Update IAM role**.

Then, inside your `.env` file on the server, you **must leave the keys entirely blank**:
```bash
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```
Boto3 will automatically route through the secure EC2 Instance metadata to authenticate uploads dynamically!

### 5. Deployment Steps

1. **Launch EC2 instance**: Choose Ubuntu Server 24.04 LTS (Free tier eligible). Attach the Security Group outlined above, and select an existing key pair or create a new one to access via SSH.
2. **Setup Server Requirements**:
   ```bash
   ssh -i your-key.pem ubuntu@<ec2-ip-address>
   sudo apt update && sudo apt install docker.io docker-compose-v2 -y
   sudo systemctl enable docker
   ```
3. **Download Application & Configure**:
   ```bash
   git clone <repo_url> notes-app && cd notes-app
   cp .env.example .env
   ```
   Edit `.env` inside the server (`nano .env`) placing secure passwords for DB, strong Django Secret, AWS S3 bucket names, and `USE_S3=1`. Add `DJANGO_ALLOWED_HOSTS=<ec2-ip-address>,<domain>`.
4. **Deploy Containers**:
   ```bash
   sudo docker compose up -d --build
   ```
5. **SSL via Let's Encrypt** (assuming a mapped domain, e.g., `app.domain.com`):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d app.domain.com
   ```
6. Visit your deployed instance to test the application!

## Simple Infrastructure Diagram

```text
    [ Internet / Users ]
             │ (HTTPS : 443)
             ▼
 ┌───────────────────────┐ AWS EC2 Server
 │ ┌───────────────────┐ │
 │ │   Nginx Proxy     │ │
 │ └────┬──────────┬───┘ │
 │      │          │     │
 │ ┌────▼────┐ ┌───▼───┐ │
 │ │ React   │ │ Django│ │ ───(API Calls)───► [ AWS S3 Bucket ]
 │ │ Frontend│ │ API   │ │                    (Stores File Attachments)
 │ └─────────┘ └───┬───┘ │
 │                 │     │
 │             ┌───▼───┐ │
 │             │ PGSQL │ │ (Data persisted to Docker Volume / EBS)
 │             └───────┘ │
 └───────────────────────┘
```

## CI

GitHub Actions workflow included at `.github/workflows/ci.yml` for:

- Backend dependency install and tests
- Frontend dependency install and production build
