# Configuration Directory

This directory contains all configuration files for the backend application.

## Structure

```
config/
├── environments/          # Environment-specific variables
│   ├── .env              # Base configuration (committed)
│   ├── .env.development  # Development overrides (committed)
│   ├── .env.acceptance   # Staging/acceptance (NOT committed)
│   └── .env.production   # Production secrets (NOT committed)
├── *.json                # Service account keys (NOT committed)
└── README.md            # This file
```

## Environment Files

### `.env` (Base Configuration)
- Contains shared configuration across all environments
- Safe to commit to version control
- No sensitive information

### `.env.development` 
- Development-specific overrides
- Safe to commit to version control
- May contain development API keys with limited scope

### `.env.acceptance` 
- Staging/acceptance environment configuration
- **NEVER commit** - contains real credentials
- Used for staging deployments

### `.env.production`
- Production environment configuration
- **NEVER commit** - contains production secrets
- Used in production deployments

## Loading Priority

1. System environment variables (highest priority)
2. `config/environments/.env.${NODE_ENV}`
3. `config/environments/.env.development` (fallback)
4. `config/environments/.env` (base)

## Usage

The application automatically loads the appropriate environment file based on the `NODE_ENV` variable:

```bash
# Development
NODE_ENV=development npm run start:dev

# Acceptance
NODE_ENV=acceptance npm run start:acceptance

# Production
NODE_ENV=production npm run start:prod
```

## Security

- Sensitive environment files are excluded from version control via `.gitignore`
- Production environments should use system environment variables
- Service account keys and certificates go in this directory but are never committed