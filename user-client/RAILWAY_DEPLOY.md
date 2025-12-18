# User Client - Railway Deployment Guide

## Prerequisites

1. Railway account (https://railway.app)
2. Railway CLI installed (optional): `npm i -g @railway/cli`
3. Backend API already deployed and accessible

## Environment Variables

Set these in Railway dashboard or via CLI:

### Required
- `VITE_API_URL` - Your backend API URL (e.g., `https://api.yourdomain.com`)

### Optional
- `PORT` - Port for the container (default: 80, Railway auto-assigns)

## Deployment Methods

### Method 1: Railway Dashboard (Recommended)

1. Go to https://railway.app/new
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account and select the user-client repository
4. **Configure deployment:**
   - **Builder**: Dockerfile (should auto-detect)
   - **Branch**: `main` (or your preferred branch)
5. Add environment variables:
   - `VITE_API_URL=https://your-backend-api.railway.app`
6. Deploy!

Railway will automatically:
- Detect the Dockerfile
- Build the Docker image with build args
- Deploy to a Railway domain (e.g., `your-app.railway.app`)
- Provide SSL certificate automatically

### Method 2: Railway CLI

### Method 2: Railway CLI

```bash
# Login to Railway
railway login

# Link to project (or create new)
railway link

# Set environment variables
railway variables set VITE_API_URL=https://your-backend-api.railway.app

# Deploy
railway up
```

1. Connect repository to Railway project
2. Enable automatic deployments from `002-user-frontend-interface` branch
3. Every push will trigger automatic deployment

## Build Process

### Method 3: GitHub Integration (CI/CD)

1. Connect repository to Railway project
2. Enable automatic deployments from `main` branch (or your preferred branch)
3. Every push will trigger automatic deployment
- Uses `VITE_API_URL` build arg

**Stage 2: Production**
- Nginx Alpine image
- Serves static files
- SPA routing support
- Health check endpoint at `/health`

## Post-Deployment

### Verify Deployment

```bash
# Check health endpoint
curl https://your-app.railway.app/health

# Should return: "healthy"
```

### Custom Domain (Optional)

1. Go to Railway project settings
2. Add custom domain
3. Update DNS records as instructed
4. Railway handles SSL automatically

### Monitoring

Railway provides:
- Deployment logs
- Application metrics
- Health check status
- Automatic rollback on failure

## Troubleshooting

### Build Fails

Check Railway build logs for:
- Node version compatibility
- Missing dependencies
- TypeScript errors

### Runtime Issues

1. Check environment variables are set correctly
2. Verify API URL is accessible from Railway
3. Check nginx logs in Railway console
4. Verify health check endpoint responds

### CORS Issues

If frontend can't reach backend:
1. Backend must allow Railway domain in CORS
2. Update backend environment: `FRONTEND_URL=https://your-app.railway.app`

## Configuration Files

- `Dockerfile` - Multi-stage build configuration
- `railway.json` - Railway-specific settings
- `.dockerignore` - Files excluded from Docker build
- `nginx.conf` - Embedded in Dockerfile (SPA routing, caching, security headers)

## Performance Optimization

Already configured:
- Gzip compression for text assets
- 1-year cache for static assets (js, css, images)
- Immutable cache headers
- SPA fallback routing

## Security

Already configured:
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Health check endpoint
- Minimal Alpine-based image
- Non-root nginx process

## Common Issues

### App Shows "Unable to connect to API"

**Cause**: `VITE_API_URL` environment variable not set or incorrect

**Solution**: 
1. Check service variables in Railway
2. Verify backend URL is correct and accessible
3. Ensure backend has frontend URL in CORS whitelist

## Cost Estimation

Railway Starter Plan:
- $5/month for 500 hours
- This frontend should use ~730 hours/month if running 24/7
- Estimated cost: ~$7-8/month

Pro Plan: $20/month for unlimited usage

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: [Your repo]/issues
