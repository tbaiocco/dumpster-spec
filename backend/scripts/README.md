# Backend Deployment Scripts

This directory contains helper scripts for deploying the backend application to Railway.

## Scripts

### 🔐 encode-google-credentials.sh

Encodes your Google Cloud service account JSON file to base64 for Railway deployment.

**Usage:**
```bash
./scripts/encode-google-credentials.sh
```

**What it does:**
- Reads the Google Cloud service account JSON from `config/clutter-476009-3631b1ce193d.json`
- Encodes it to base64 (single line, no wrapping)
- Outputs the encoded string for you to copy

**When to use:**
- Before first Railway deployment
- When rotating Google Cloud credentials
- When setting up a new Railway environment

**Output:**
Copy the output and set it as `GOOGLE_CLOUD_KEY_JSON_BASE64` environment variable in Railway.

---

### 🧪 test-railway-config.sh

Tests your Railway deployment configuration locally before deploying.

**Usage:**
```bash
./scripts/test-railway-config.sh
```

**What it does:**
1. Checks if `Dockerfile.prod` exists
2. Checks if `.dockerignore` exists
3. Builds the production Docker image locally
4. Reports image size
5. Shows image layer information
6. Verifies supporting configuration files exist

**When to use:**
- Before deploying to Railway for the first time
- After making changes to Dockerfile
- To troubleshoot build issues locally

**Requirements:**
- Docker installed and running
- Run from the `backend/` directory

**Notes:**
- This script only builds the image, it doesn't run it
- To test the running container, use the manual test command shown in output
- Remember to clean up test images: `docker rmi dumpster-backend-test:latest`

---

## Quick Deployment Workflow

### First Time Setup

1. **Encode credentials:**
   ```bash
   cd backend
   ./scripts/encode-google-credentials.sh
   ```
   Copy the output.

2. **Test configuration:**
   ```bash
   ./scripts/test-railway-config.sh
   ```

3. **Deploy to Railway:**
   - Follow `docs/RAILWAY_QUICKSTART.md`
   - Use the encoded credentials from step 1

### Subsequent Deployments

Railway will automatically deploy when you push to your connected branch. No scripts needed!

### Manual Deployment via CLI

```bash
# Install Railway CLI (one time)
npm install -g @railway/cli

# Login (one time)
railway login

# Link project (one time)
railway link

# Deploy
railway up
```

## Troubleshooting

### "Permission denied" errors
Make scripts executable:
```bash
chmod +x scripts/*.sh
```

### "Google Cloud key file not found"
Ensure the file exists at: `backend/config/clutter-476009-3631b1ce193d.json`

### Docker build fails
- Check Docker is running: `docker ps`
- Verify you're in the `backend/` directory
- Check Dockerfile syntax: `docker build -f Dockerfile.prod --no-cache .`

## Related Documentation

- [Railway Quick Start](../../docs/RAILWAY_QUICKSTART.md) - Fast deployment guide
- [Railway Full Guide](../../docs/RAILWAY_DEPLOYMENT.md) - Complete documentation
- [CI/CD Setup](../../docs/CICD_RAILWAY.md) - Automated deployments

## Security Notes

⚠️ **Important:**
- Never commit the encoded credentials to git
- Never commit the raw service account JSON to git
- Keep your Railway tokens secure
- Rotate credentials regularly
- Use environment variables for all secrets

## Support

If you encounter issues:
1. Check the documentation in `docs/`
2. Review Railway logs in the dashboard
3. Verify all environment variables are set
4. Test Docker build locally first
