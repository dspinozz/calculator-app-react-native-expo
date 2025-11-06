# Deployment Guide

## Flask Deployment Options

### Option 1: Docker (Recommended for Portfolio) ✅

**Why Docker?**
- Shows modern deployment practices
- Easy to run locally
- Professional setup
- Highlights DevOps skills

**Deploy:**
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Files:**
- `Dockerfile` - Container definition
- `docker-compose.yml` - Multi-container setup
- `.dockerignore` - Exclude files from build

### Option 2: Gunicorn (Production WSGI Server)

**Why Gunicorn?**
- Industry standard for Flask
- Production-ready
- Simple deployment
- Shows you know proper deployment

**Deploy:**
```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn --bind 0.0.0.0:2000 --workers 4 calculator_app:app

# Or use config file
gunicorn -c gunicorn_config.py calculator_app:app
```

**Configuration:**
- `gunicorn_config.py` - Production settings
- Workers: CPU count * 2 + 1
- Timeout: 120 seconds

### Option 3: Cloud Platforms

#### Heroku
```bash
# Add Procfile
echo "web: gunicorn calculator_app:app" > Procfile

# Deploy
git push heroku main
```

#### Railway
- Connect GitHub repo
- Auto-detects Python
- Sets environment variables
- One-click deploy

#### Render
- Connect GitHub repo
- Set build command: `pip install -r requirements.txt`
- Set start command: `gunicorn calculator_app:app`
- Auto-deploys on push

#### DigitalOcean App Platform
- Connect GitHub
- Auto-detects Flask
- Sets up database
- Auto-scaling

### Option 4: Traditional VPS

**Setup:**
1. SSH into server
2. Install Python, pip
3. Clone repository
4. Install dependencies
5. Run with Gunicorn + Nginx
6. Use systemd for process management

**Example systemd service:**
```ini
[Unit]
Description=Calculator App
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/calculator
Environment="PATH=/var/www/calculator/venv/bin"
ExecStart=/var/www/calculator/venv/bin/gunicorn -c gunicorn_config.py calculator_app:app

[Install]
WantedBy=multi-user.target
```

## Environment Variables

Set these in production:
```bash
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
LOG_LEVEL=info
```

## Database

SQLite works for small deployments. For production:
- Use PostgreSQL (recommended)
- Or MySQL
- Update database.py to use SQLAlchemy

## Security Checklist

- [ ] Use HTTPS (TLS/SSL)
- [ ] Set strong SECRET_KEY
- [ ] Restrict CORS origins
- [ ] Enable rate limiting
- [ ] Use environment variables
- [ ] Regular security updates
- [ ] Database backups

## Monitoring

Consider adding:
- Sentry for error tracking
- Prometheus for metrics
- Log aggregation (ELK stack)
- Health check endpoint

## Recommended for Portfolio

**Best Choice: Docker + Docker Compose**

Shows:
1. Containerization knowledge
2. Production-ready deployment
3. DevOps skills
4. Modern practices

**Quick Start:**
```bash
docker-compose up
# App runs on http://localhost:2000
```
