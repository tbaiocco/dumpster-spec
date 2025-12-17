# Railway Commands Cheat Sheet

## 🚀 First Time Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project (run in backend directory)
cd backend
railway link
```

## 📤 Deployment

```bash
# Deploy current directory
railway up

# Deploy specific service
railway up --service backend

# Deploy to specific environment
railway up --environment production

# Deploy with verbose output
railway up --verbose
```

## 📊 Monitoring

```bash
# View real-time logs
railway logs

# View logs for specific service
railway logs --service backend

# Check deployment status
railway status

# List all deployments
railway list
```

## 🔧 Environment Variables

```bash
# List all environment variables
railway variables

# Set a variable
railway variables set KEY=value

# Delete a variable
railway variables delete KEY

# Export variables to .env file
railway variables export
```

## 🌐 Project Management

```bash
# Open project in browser
railway open

# Open Railway dashboard
railway dashboard

# Link to different project
railway link

# Unlink current project
railway unlink

# Get project info
railway status
```

## 🔄 Rollback & Recovery

```bash
# List deployments
railway list

# Redeploy specific deployment
railway redeploy <deployment-id>

# View deployment logs
railway logs --deployment <deployment-id>
```

## 🧪 Local Development

```bash
# Run command with Railway environment
railway run npm start

# Run any command
railway run <command>

# Shell into Railway environment
railway shell
```

## 🔐 Authentication

```bash
# Login
railway login

# Logout
railway logout

# Check auth status
railway whoami
```

## 📋 Helper Scripts (Backend Directory)

```bash
# Encode Google Cloud credentials
./scripts/encode-google-credentials.sh

# Test Railway configuration
./scripts/test-railway-config.sh
```

## 🐳 Docker Commands

```bash
# Build production image locally
docker build -f Dockerfile.prod -t dumpster-backend .

# Run production image locally
docker run -p 3000:3000 --env-file .env dumpster-backend

# Test with Railway environment
railway run docker-compose up
```

## 🧹 Cleanup

```bash
# Remove test Docker images
docker rmi dumpster-backend-test:latest

# Remove unused Docker resources
docker system prune -a

# Unlink Railway project
railway unlink
```

## 📱 Quick Actions

### Deploy Now
```bash
cd backend && railway up
```

### View Logs
```bash
railway logs --tail 100
```

### Check Health
```bash
curl https://your-app.railway.app/health
```

### Update Environment Variable
```bash
railway variables set CORS_ORIGIN=https://new-frontend.com
```

### Rollback
```bash
railway list
railway redeploy <previous-deployment-id>
```

## 🎯 Common Workflows

### Initial Deployment
```bash
# 1. Encode credentials
cd backend
./scripts/encode-google-credentials.sh

# 2. Test configuration
./scripts/test-railway-config.sh

# 3. Link and deploy
railway link
railway up
```

### Update Deployment
```bash
# Just push to GitHub (if CI/CD enabled)
git add .
git commit -m "Update backend"
git push origin main

# Or deploy manually
railway up
```

### Debug Issues
```bash
# Check status
railway status

# View logs
railway logs --tail 200

# Check environment
railway variables

# Test locally with Railway env
railway run npm run start:dev
```

### Environment Setup
```bash
# Development
railway link --environment development
railway up

# Staging
railway link --environment staging
railway up

# Production
railway link --environment production
railway up
```

## 💡 Pro Tips

1. **Always test locally first:**
   ```bash
   ./scripts/test-railway-config.sh
   ```

2. **Check logs after deployment:**
   ```bash
   railway logs --tail 100
   ```

3. **Verify health endpoint:**
   ```bash
   curl https://your-app.railway.app/health
   ```

4. **Use environments for staging:**
   ```bash
   railway up --environment staging
   ```

5. **Monitor resource usage:**
   - Check Railway dashboard for CPU/Memory metrics
   - Set up usage alerts

## 🔗 Quick Links

- Railway Dashboard: `railway dashboard`
- Project Browser: `railway open`
- Documentation: https://docs.railway.app
- CLI Reference: https://docs.railway.app/develop/cli

## 📞 Getting Help

```bash
# CLI help
railway --help

# Command-specific help
railway up --help
railway logs --help

# Version info
railway --version
```

---

**Need detailed instructions?** See `docs/RAILWAY_QUICKSTART.md`

**Setting up CI/CD?** See `docs/CICD_RAILWAY.md`

**Complete guide?** See `docs/RAILWAY_DEPLOYMENT.md`
