# Railway Deployment Architecture

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Production System                         │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  GitHub Repo    │────────▶│  GitHub Actions  │────────▶│  Railway App    │
│                 │         │                  │         │                 │
│  Push to main   │         │  Build & Deploy  │         │  Running App    │
└─────────────────┘         └──────────────────┘         └────────┬────────┘
                                                                   │
                                                                   │
                            ┌──────────────────────────────────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   External Services  │
                 ├──────────────────────┤
                 │  • Supabase (DB)     │
                 │  • Google Cloud      │
                 │  • Claude AI         │
                 │  • Telegram          │
                 │  • Twilio/WhatsApp   │
                 │  • SendGrid (Email)  │
                 └──────────────────────┘
```

## Deployment Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      Developer Workflow                            │
└────────────────────────────────────────────────────────────────────┘

    Developer                 GitHub              Railway
        │                        │                    │
        │  1. git push          │                    │
        ├──────────────────────▶│                    │
        │                        │                    │
        │                        │  2. Webhook        │
        │                        │    triggers        │
        │                        ├───────────────────▶│
        │                        │                    │
        │                        │                    │  3. Clone repo
        │                        │                    │     Build Docker
        │                        │                    │     Run tests
        │                        │                    │─────┐
        │                        │                    │     │
        │                        │                    │◀────┘
        │                        │                    │
        │                        │                    │  4. Deploy
        │                        │                    │     Zero-downtime
        │                        │                    │─────┐
        │                        │                    │     │
        │                        │                    │◀────┘
        │                        │                    │
        │                        │  5. Status         │
        │                        │◀───────────────────┤
        │                        │                    │
        │  6. Notification       │                    │
        │◀───────────────────────┤                    │
        │                        │                    │
        │  7. Test deployment    │                    │
        ├───────────────────────────────────────────▶│
        │         (HTTPS)        │                    │
        │                        │                    │
```

## Docker Build Process

```
┌────────────────────────────────────────────────────────────────────┐
│                    Multi-Stage Docker Build                        │
└────────────────────────────────────────────────────────────────────┘

Stage 1: Builder
┌─────────────────────────────────────┐
│  node:18-alpine                     │
│  ├── Copy package.json              │
│  ├── npm ci (all dependencies)      │
│  ├── Copy source code               │
│  └── npm run build                  │
│      └── Compile TypeScript         │
│          Output: dist/              │
└─────────────────┬───────────────────┘
                  │
                  │  Copy dist/
                  ▼
Stage 2: Production
┌─────────────────────────────────────┐
│  node:18-alpine                     │
│  ├── Copy package.json              │
│  ├── npm ci --only=production       │
│  ├── Copy dist/ from builder        │
│  ├── Copy config/ (credentials)     │
│  ├── Create non-root user           │
│  └── CMD ["node", "dist/main"]      │
└─────────────────┬───────────────────┘
                  │
                  │  ~200-300MB
                  ▼
            Railway Container
```

## Environment Variables Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    Environment Configuration                       │
└────────────────────────────────────────────────────────────────────┘

Development (.env)                  Railway (Production)
┌─────────────────────┐            ┌─────────────────────────┐
│ DATABASE_URL=...    │            │ DATABASE_URL=...        │
│ JWT_SECRET=...      │            │ JWT_SECRET=...          │
│ CLAUDE_API_KEY=...  │            │ CLAUDE_API_KEY=...      │
│ ...                 │            │ NODE_ENV=production     │
│                     │            │ PORT=3000               │
│ Google Cloud:       │            │                         │
│ GOOGLE_CLOUD_...    │            │ Google Cloud:           │
│ KEY_FILE=./config/  │            │ GOOGLE_CLOUD_KEY_JSON_  │
│ service.json        │            │ BASE64=<encoded>        │
└──────────┬──────────┘            └────────────┬────────────┘
           │                                    │
           │  Local file                        │  Base64 decoded
           ▼                                    ▼
    ┌─────────────┐                    ┌──────────────┐
    │ Credentials │                    │  Credentials │
    │   Object    │                    │    Object    │
    └─────────────┘                    └──────────────┘
```

## Network Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        Network Flow                                │
└────────────────────────────────────────────────────────────────────┘

Internet
   │
   │  HTTPS (SSL automatic)
   ▼
┌─────────────────────────────┐
│  Railway Load Balancer      │
│  *.up.railway.app           │
└─────────────┬───────────────┘
              │
              │  Port 3000
              ▼
┌─────────────────────────────┐
│  Backend Container          │
│  ┌───────────────────────┐  │
│  │  NestJS Application   │  │
│  │  - Health Checks      │  │
│  │  - API Endpoints      │  │
│  │  - WebSocket (future) │  │
│  └───────────────────────┘  │
└─────────────┬───────────────┘
              │
              │  Private Network
              ▼
    ┌──────────────────┐
    │  External APIs   │
    │  - Supabase      │◀── PostgreSQL + pgvector
    │  - Google Cloud  │◀── Translation, Gmail
    │  - Claude        │◀── AI Processing
    │  - Telegram      │◀── Bot API
    │  - Twilio        │◀── WhatsApp
    │  - SendGrid      │◀── Email
    └──────────────────┘
```

## Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                        Request Flow                                │
└────────────────────────────────────────────────────────────────────┘

User/Frontend/Bot
      │
      │  HTTPS Request
      ▼
┌──────────────────┐
│  Railway LB      │
└────────┬─────────┘
         │
         │  Forward
         ▼
┌──────────────────────────┐
│  NestJS Middleware       │
│  1. CORS Check           │
│  2. Helmet Security      │
│  3. Rate Limiting        │
│  4. JWT Validation       │
└────────┬─────────────────┘
         │
         │  Process
         ▼
┌──────────────────────────┐
│  Controller              │
│  (Route Handler)         │
└────────┬─────────────────┘
         │
         │  Business Logic
         ▼
┌──────────────────────────┐
│  Service Layer           │
│  - Business Logic        │
│  - External API Calls    │
└────────┬─────────────────┘
         │
         │  Data Access
         ▼
┌──────────────────────────┐
│  Repository/Database     │
│  - TypeORM               │
│  - Supabase              │
└────────┬─────────────────┘
         │
         │  Response
         ▼
┌──────────────────────────┐
│  JSON Response           │
│  - Status Code           │
│  - Data Payload          │
│  - Error Handling        │
└──────────────────────────┘
```

## Health Check System

```
┌────────────────────────────────────────────────────────────────────┐
│                      Health Check Architecture                     │
└────────────────────────────────────────────────────────────────────┘

Railway Health Checker
      │
      │  Every 30s
      ▼
GET /health
      │
      ▼
┌──────────────────────┐
│  Health Controller   │
│  ┌────────────────┐  │
│  │ Basic Check    │  │  → Status: ok/error
│  │ Uptime         │  │  → Timestamp
│  │ Memory Usage   │  │  → Process info
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ DB Check       │  │  → Query: SELECT 1
│  │ GET /health/db │  │  → Connection status
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ Detailed Check │  │  → All components
│  │ /health/detail │  │  → Resource usage
│  └────────────────┘  │
└──────────────────────┘
      │
      │  Response
      ▼
┌──────────────────────┐
│  200 OK              │
│  {                   │
│    status: "ok",     │
│    timestamp: "..."  │
│  }                   │
└──────────────────────┘
      │
      │  If healthy
      ▼
   Keep Running
      │
      │  If unhealthy (3 fails)
      ▼
   Auto Restart
```

## Security Layers

```
┌────────────────────────────────────────────────────────────────────┐
│                        Security Architecture                       │
└────────────────────────────────────────────────────────────────────┘

Layer 1: Network
┌─────────────────────────────┐
│ Railway Infrastructure      │
│ • SSL/TLS automatic         │
│ • DDoS protection           │
│ • Network isolation         │
└─────────────┬───────────────┘
              │
Layer 2: Application
┌─────────────────────────────┐
│ NestJS Middleware           │
│ • Helmet (headers)          │
│ • CORS policy               │
│ • Rate limiting             │
└─────────────┬───────────────┘
              │
Layer 3: Authentication
┌─────────────────────────────┐
│ JWT Authentication          │
│ • Token validation          │
│ • Role-based access         │
│ • Session management        │
└─────────────┬───────────────┘
              │
Layer 4: Data
┌─────────────────────────────┐
│ Input Validation            │
│ • class-validator           │
│ • Sanitization              │
│ • SQL injection prevention  │
└─────────────┬───────────────┘
              │
Layer 5: Secrets
┌─────────────────────────────┐
│ Environment Variables       │
│ • Encrypted at rest         │
│ • Not in code/logs          │
│ • Railway-managed           │
└─────────────────────────────┘
```

## Scaling Strategy

```
┌────────────────────────────────────────────────────────────────────┐
│                        Scaling Architecture                        │
└────────────────────────────────────────────────────────────────────┘

Current (Starter)           Future (Production)
┌─────────────────┐         ┌─────────────────────────────────┐
│  Single         │         │  Multiple Instances             │
│  Container      │         │  ┌──────────┐  ┌──────────┐    │
│  ┌──────────┐  │         │  │ Instance │  │ Instance │    │
│  │ Backend  │  │   ───▶  │  │    1     │  │    2     │    │
│  │  App     │  │         │  └──────────┘  └──────────┘    │
│  └──────────┘  │         │         ▲           ▲           │
└─────────────────┘         │         └───────────┘           │
                            │      Load Balancer              │
                            └─────────────────────────────────┘
                                          │
                                          │
                            ┌─────────────▼───────────────┐
                            │  Horizontal Scaling         │
                            │  • Auto-scale on CPU/Memory │
                            │  • Health-based routing     │
                            │  • Session affinity         │
                            └─────────────────────────────┘
```

---

## Legend

```
┌─────────┐
│  Box    │  = Component/Service
└─────────┘

    │
    ▼       = Data/Control Flow

────────▶   = Directional Flow

◀────┐
     │      = Loop/Cycle
─────┘
```

## Related Documentation

- Architecture details: `docs/RAILWAY_DEPLOYMENT.md`
- Network configuration: `docs/RAILWAY_DEPLOYMENT.md` (Networking section)
- Security setup: `docs/RAILWAY_DEPLOYMENT.md` (Security Checklist)
- Scaling info: `docs/RAILWAY_DEPLOYMENT.md` (Cost Considerations)
