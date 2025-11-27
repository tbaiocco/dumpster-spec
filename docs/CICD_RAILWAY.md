# CI/CD Setup for Railway

This document explains how to set up automated deployments to Railway using GitHub Actions.

## Prerequisites

1. Railway project created and configured (see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md))
2. GitHub repository with admin access
3. Railway API token

## Step 1: Get Railway API Token

1. Go to [Railway Account Settings](https://railway.app/account/tokens)
2. Click **"Create Token"**
3. Give it a descriptive name (e.g., "GitHub Actions - Dumpster Backend")
4. Copy the token (you'll only see it once)

## Step 2: Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `RAILWAY_TOKEN`
5. Value: Paste the Railway API token
6. Click **"Add secret"**

## Step 3: Link Railway Project ID (Optional)

If you need more control, you can specify the exact project and service:

1. Get your Railway project ID:
   ```bash
   railway status
   ```

2. Add these as GitHub secrets:
   - `RAILWAY_PROJECT_ID`: Your Railway project ID
   - `RAILWAY_SERVICE_ID`: Your service ID (if multiple services)

## Step 4: Verify Workflow

The workflow file `.github/workflows/deploy-backend.yml` is already set up. It will:

- Trigger on pushes to `main` or `001-universal-life-inbox-implementation-extra-phase` branches
- Only run when backend files change
- Can be manually triggered via GitHub Actions UI

## Workflow Customization

### Deploy to Multiple Environments

Create separate workflows for staging and production:

**`.github/workflows/deploy-backend-staging.yml`**:
```yaml
name: Deploy Backend to Railway (Staging)

on:
  push:
    branches:
      - develop
      - staging
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway Staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_STAGING }}
        run: |
          railway up --service backend --environment staging
```

**`.github/workflows/deploy-backend-production.yml`**:
```yaml
name: Deploy Backend to Railway (Production)

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway Production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PRODUCTION }}
        run: |
          railway up --service backend --environment production
```

### Add Tests Before Deployment

Update the workflow to include testing:

```yaml
name: Deploy Backend to Railway

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run linter
        working-directory: ./backend
        run: npm run lint

      - name: Run tests
        working-directory: ./backend
        run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd backend
          railway up --service backend
```

### Add Deployment Notifications

Add Slack/Discord notifications:

```yaml
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Backend deployment to Railway'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Manual Deployment via CLI

You can also deploy manually using the Railway CLI:

```bash
# Login to Railway
railway login

# Link to your project (first time only)
cd backend
railway link

# Deploy
railway up

# Or deploy to specific environment
railway up --environment production
```

## Monitoring Deployments

### Via GitHub Actions

1. Go to **Actions** tab in your repository
2. Click on the workflow run
3. View logs and deployment status

### Via Railway Dashboard

1. Go to your Railway project
2. Click on the **Deployments** tab
3. View build logs and deployment history

## Rollback Strategy

### Via Railway Dashboard
1. Go to **Deployments** tab
2. Find the last working deployment
3. Click **"Redeploy"**

### Via Railway CLI
```bash
# List deployments
railway status

# Rollback to specific deployment
railway rollback <deployment-id>
```

### Via GitHub
1. Revert the problematic commit
2. Push to trigger a new deployment

## Environment-Specific Configuration

Create Railway environments for different stages:

1. **Development**: Auto-deploy from `develop` branch
2. **Staging**: Auto-deploy from `staging` branch
3. **Production**: Auto-deploy from `main` branch or releases

Configure different environment variables for each:
- Database URLs
- API keys
- Feature flags
- Log levels

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify Railway token is valid
3. Ensure all environment variables are set in Railway
4. Check Railway build logs

### Environment Variables Not Updating

Railway requires a redeploy to pick up new environment variables:
```bash
railway up --service backend
```

### Build Timeouts

If builds take too long:
1. Optimize Dockerfile (use multi-stage builds)
2. Cache dependencies
3. Upgrade Railway plan for more resources

## Security Best Practices

1. **Never commit secrets**: Always use GitHub Secrets and Railway environment variables
2. **Rotate tokens**: Regularly rotate Railway API tokens
3. **Limit permissions**: Use separate tokens for staging and production
4. **Enable branch protection**: Require reviews before merging to main
5. **Use environments**: Configure GitHub environments for production with required reviewers

## Cost Optimization

- Deploy only on changes to backend files
- Use caching for dependencies
- Schedule deployments during off-peak hours
- Monitor Railway usage dashboard

## Next Steps

1. Set up staging environment in Railway
2. Configure branch protection rules
3. Add integration tests to workflow
4. Set up monitoring and alerting
5. Document deployment procedures for team
