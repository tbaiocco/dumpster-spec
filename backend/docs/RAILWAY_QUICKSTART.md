# Railway Deployment - Quick Start

## 🚀 Manual Deployment (First Time)

### 1. Prepare Credentials
```bash
cd backend
./scripts/encode-google-credentials.sh
```
Copy the output base64 string.

### 2. Deploy to Railway

1. **Create Project**: https://railway.app/dashboard → New Project → Deploy from GitHub
2. **Select Repo**: Choose `dumpster` repository
3. **Configure Service**:
   - Service Name: `dumpster-backend`
   - Dockerfile Path: `backend/Dockerfile.prod`
   - Start Command: `node dist/main`

4. **Set Environment Variables**: Go to Variables tab, paste all from `.env.railway`:
   ```bash
   DATABASE_URL=...
   SUPABASE_URL=...
   JWT_SECRET=...
   GOOGLE_CLOUD_KEY_JSON_BASE64=<paste from step 1>
   NODE_ENV=production
   PORT=3000
   CORS_ORIGIN=https://your-frontend.railway.app
   # ... (see .env.railway for complete list)
   ```

5. **Deploy**: Railway auto-deploys. Monitor in Deployments tab.

6. **Test**: Visit `https://your-app.railway.app/health`

## 🔄 Automated CI/CD Setup

### 1. Get Railway Token
1. Visit: https://railway.app/account/tokens
2. Create token: "GitHub Actions - Dumpster"
3. Copy the token

### 2. Add to GitHub
1. Go to: `github.com/tbaiocco/dumpster-spec/settings/secrets/actions`
2. New secret: `RAILWAY_TOKEN`
3. Paste token value

### 3. Enable Auto-Deploy
Push to `main` or your feature branch → GitHub Actions automatically deploys!

## 📋 Common Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project (first time)
railway link

# Deploy manually
railway up

# View logs
railway logs

# Check status
railway status

# Open in browser
railway open
```

## ✅ Verification Checklist

- [ ] Railway project created
- [ ] All environment variables set
- [ ] Google Cloud credentials encoded and added
- [ ] First deployment successful
- [ ] Health check responding: `/health`
- [ ] API docs accessible (if enabled): `/api`
- [ ] GitHub Actions workflow configured
- [ ] Railway token added to GitHub secrets
- [ ] CORS updated with frontend URL

## 🔗 Important URLs

- Railway Dashboard: https://railway.app/dashboard
- Your API: https://dumpster-backend-production.up.railway.app
- GitHub Actions: https://github.com/tbaiocco/dumpster-spec/actions
- Documentation: See `docs/RAILWAY_DEPLOYMENT.md`

## 🆘 Quick Fixes

**Build fails?**
- Check Dockerfile path in Railway settings
- Verify package.json scripts

**Runtime errors?**
- Check all env vars are set
- View logs in Railway dashboard

**Health check fails?**
- Ensure `/health` endpoint exists
- Check PORT is set correctly

**CORS errors?**
- Update CORS_ORIGIN with actual frontend URL
- Redeploy after changing env vars

## 📚 Full Documentation

- [Complete Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [CI/CD Setup](./CICD_RAILWAY.md)
