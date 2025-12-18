# Extract User-Client to New Repository

## Method 1: Simple Copy (Recommended for Clean Start)

```bash
# Create new repository on GitHub (e.g., dumpster-user-client)

# Clone it locally
git clone https://github.com/tbaiocco/dumpster-user-client.git
cd dumpster-user-client

# Copy all user-client files (from outside the new repo)
cp -r /home/baiocte/personal/dumpster/user-client/* .
cp /home/baiocte/personal/dumpster/user-client/.* . 2>/dev/null || true

# Initialize git if needed
git add .
git commit -m "feat: initial user-client setup from dumpster monorepo

- React 19.2.0 + TypeScript 5.9.3
- Vite 7.3.0 build system
- i18n support (en/pt/es)
- Modern Lucide icons
- Tailwind CSS 4.1.18
- Docker multi-stage build ready
- Railway deployment configured"

git push origin main
```

## Method 2: Preserve Git History (Advanced)

If you want to keep the commit history for user-client files:

```bash
# Clone the original repo
git clone https://github.com/tbaiocco/dumpster-spec.git dumpster-user-client
cd dumpster-user-client

# Filter only user-client directory history
git filter-branch --subdirectory-filter user-client -- --all

# Or use git-filter-repo (faster, cleaner)
# pip install git-filter-repo
# git filter-repo --path user-client/ --path-rename user-client/:

# Add new remote
git remote remove origin
git remote add origin https://github.com/tbaiocco/dumpster-user-client.git

# Push to new repo
git push -u origin main
```

## After Extraction

1. **Update .gitignore** (if needed) - check root-level ignores
2. **Update README.md** - remove monorepo references
3. **Deploy to Railway**:
   - Connect new GitHub repo
   - Set `VITE_API_URL` environment variable
   - Deploy!
4. **Custom Domain** (optional):
   - Add in Railway settings
   - Configure DNS records
   - Example: `app.yourdomain.com`

## Files to Review in New Repo

- `package.json` - Clean and ready
- `Dockerfile` - Production-ready multi-stage build
- `railway.json` - Deployment configuration
- `.dockerignore` - Optimized builds
- `.railwayignore` - Faster deployments
- `RAILWAY_DEPLOY.md` - Complete deployment guide

## Environment Variables Needed

For Railway deployment:
```
VITE_API_URL=https://your-backend.railway.app
```

For local development (`.env.local`):
```
VITE_API_URL=http://localhost:3000
```

## Estimated Timeline

- Repository setup: 5 minutes
- Railway connection: 5 minutes
- First deployment: 5-10 minutes
- Custom domain (optional): 30-60 minutes

Total: **15-30 minutes** to be fully deployed
