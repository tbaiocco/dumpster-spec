# Railway Deployment Guide

## Prerequisites

1. [Railway Account](https://railway.app/) - Sign up for a free account
2. [Railway CLI](https://docs.railway.app/develop/cli) (optional, for CLI deployments)
3. GitHub repository connected to Railway (for automatic deployments)

## Manual Deployment Steps

### Step 1: Create a New Project on Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select the `dumpster` repository
6. Choose the branch: `001-universal-life-inbox-implementation-extra-phase`

### Step 2: Configure the Service

1. Railway will detect the Dockerfile automatically
2. Click on the created service
3. Go to **Settings** tab:
   - **Service Name**: `dumpster-backend`
   - **Root Directory**: Leave empty (or set to `/` if needed)
   - **Dockerfile Path**: `backend/Dockerfile.prod`
   - **Build Command**: (leave empty, handled by Dockerfile)
   - **Start Command**: `node dist/main`

### Step 3: Configure Environment Variables

1. Go to the **Variables** tab
2. Click **"Raw Editor"** for bulk import
3. Add the following variables (replace with your actual values):

```bash
# Database Configuration
DATABASE_URL=your_supabase_connection_string
DATABASE_HOST=your_supabase_host
DATABASE_PORT=6543
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_NAME=postgres

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_at_least_32_chars

# AI Services Configuration
CLAUDE_API_KEY=your_claude_api_key
HUGGINGFACE_API_KEY=your_huggingface_key

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_KEY_FILE=./config/clutter-476009-3631b1ce193d.json

# Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Twilio WhatsApp Configuration
WHATSAPP_ACCOUNT_SID=your_twilio_sid
WHATSAPP_AUTH_TOKEN=your_twilio_auth_token
WHATSAPP_PHONE_NUMBER=whatsapp:+your_number

# Email Configuration - SendGrid
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=your_email@domain.com
EMAIL_FROM_NAME="Your App Notifications"
SENDGRID_API_KEY=your_sendgrid_api_key

# App Configuration
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.railway.app

# Logging
LOG_LEVEL=info
```

4. Click **"Save"**

### Step 4: Handle Google Cloud Service Account

Since Railway doesn't support file uploads directly, you have two options:

#### Option A: Convert to Environment Variable (Recommended)
1. Convert the JSON key file to a base64 string:
   ```bash
   cd backend
   base64 -w 0 config/clutter-476009-3631b1ce193d.json
   ```
2. Add to Railway variables:
   ```
   GOOGLE_CLOUD_KEY_JSON_BASE64=<paste_base64_string>
   ```
3. Update your code to decode this at runtime (see modification below)

#### Option B: Use Google Cloud Secret Manager
- Store credentials in Google Secret Manager
- Access them via API in your application

### Step 5: Configure Networking

1. Go to **Settings** tab
2. Under **Networking**:
   - **Generate Domain**: Click to get a Railway-provided domain
   - **Custom Domain**: (optional) Add your own domain later
3. Note the generated URL (e.g., `https://dumpster-backend-production.up.railway.app`)

### Step 6: Deploy

1. Railway will automatically trigger a deployment
2. Monitor the **Deployments** tab for build progress
3. Check logs for any errors
4. Once deployed, visit: `https://your-app.railway.app/health`

### Step 7: Verify Deployment

Test your endpoints:
```bash
# Health check
curl https://your-app.railway.app/health

# API documentation (if enabled)
curl https://your-app.railway.app/api
```

## Automatic Deployments (CI/CD)

Railway automatically deploys when you push to the connected branch. To customize:

### Using railway.json

The `railway.json` file in the root configures the deployment:
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile.prod"
  },
  "deploy": {
    "startCommand": "node dist/main",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Deploy with Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

## Code Modifications for Google Cloud Credentials

Update `backend/src/config/google-cloud.config.ts` (create if doesn't exist):

```typescript
import { registerAs } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export default registerAs('googleCloud', () => {
  // If base64 encoded credentials are provided (Railway deployment)
  if (process.env.GOOGLE_CLOUD_KEY_JSON_BASE64) {
    const credentials = JSON.parse(
      Buffer.from(
        process.env.GOOGLE_CLOUD_KEY_JSON_BASE64,
        'base64',
      ).toString('utf-8'),
    );
    
    return {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials,
    };
  }

  // Otherwise use file path (local development)
  const keyFilePath = process.env.GOOGLE_CLOUD_KEY_FILE;
  if (keyFilePath && fs.existsSync(keyFilePath)) {
    return {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: keyFilePath,
    };
  }

  throw new Error('Google Cloud credentials not configured');
});
```

## Monitoring

1. **Logs**: View real-time logs in Railway dashboard
2. **Metrics**: Monitor CPU, memory, and network usage
3. **Alerts**: Set up notifications for deployment failures

## Troubleshooting

### Build Failures
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Check build logs for specific errors

### Runtime Errors
- Verify all environment variables are set
- Check application logs in Railway dashboard
- Ensure database is accessible from Railway

### Port Issues
- Railway automatically assigns PORT via environment variable
- Your app correctly uses `process.env.PORT ?? 3000`

## Cost Considerations

Railway offers:
- **Starter Plan**: $5/month for 500 hours (hobby projects)
- **Developer Plan**: $20/month for unlimited hours
- Free trial: $5 credit

## Rollback

To rollback to a previous deployment:
1. Go to **Deployments** tab
2. Find the working deployment
3. Click **"Redeploy"**

## Update CORS After Deployment

Once you have your Railway URL, update the environment variable:
```
CORS_ORIGIN=https://your-frontend-domain.railway.app,https://dumpster-backend-production.up.railway.app
```

## Security Checklist

- [ ] All sensitive environment variables are set in Railway (not committed to git)
- [ ] JWT_SECRET is strong (at least 32 characters)
- [ ] Database password is strong
- [ ] API keys are valid and have appropriate permissions
- [ ] CORS is configured correctly
- [ ] Health check endpoint is working
- [ ] SSL/HTTPS is enabled (automatic with Railway)

## Next Steps

1. Deploy frontend to Railway or Vercel
2. Update frontend API URL to point to Railway backend
3. Set up custom domain
4. Configure monitoring and alerts
5. Set up staging environment for testing
