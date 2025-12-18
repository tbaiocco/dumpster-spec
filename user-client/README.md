# Clutter.AI User Client

Modern, charming, and efficient React application for Clutter.AI end users to view, search, review, and manage their captured information dumps.

## Overview

This is a standalone React application built with Vite, TypeScript, and Tailwind CSS. It provides the user-facing interface for Clutter.AI, featuring:

- **Time-bucketed Dashboard**: View daily action items organized by Today, Tomorrow, This Week, etc.
- **Natural Language Search**: Search through captured dumps with advanced filters
- **Review & Accept Flow**: Review AI-processed information with optimistic UI updates
- **Reminders & Tracking Hub**: Specialized view for time-sensitive items
- **Feedback System**: Submit and track product feedback

## Tech Stack

- **React 19** with TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling with Clutter.AI brand tokens
- **React Router 7** - Client-side routing
- **Axios** - HTTP client with authentication interceptors
- **date-fns** - Date manipulation for time bucket calculations
- **Lucide React** - Icon library
- **Headless UI** - Accessible UI components
- **Class Variance Authority** - Component variant management

## Brand Identity

- **Colors**: Electric Purple (#B929EB), Bright Cyan (#2DD9F6), Warm Stone (#FAFAF9)
- **Typography**: Outfit (headings), Inter (body)
- **Design**: Charming rounded corners, subtle shadows, gradient accents

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:3001` (or configure via `.env`)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env to set VITE_API_URL if backend is not on localhost:3001
   ```

## Deployment

### Railway (Recommended)

See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for detailed deployment instructions.

**Quick Deploy:**
1. Connect GitHub repo to Railway
2. Set root directory: `user-client`
3. Add environment variable: `VITE_API_URL=https://your-backend.railway.app`
4. Railway auto-detects Dockerfile and deploys

**Build Options:**
- **Dockerfile** (default): Multi-stage build with Nginx
- **Nixpacks**: Alternative using `nixpacks.toml` with serve

### Docker (Manual)

```bash
# Build with API URL
docker build --build-arg VITE_API_URL=https://api.example.com -t user-client .

# Run
docker run -p 80:80 user-client
```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   
   Application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
user-client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base components (Button, Card, Modal, etc.)
│   │   ├── DashboardLayout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ...
│   ├── pages/              # Route components
│   │   ├── Dashboard.tsx
│   │   ├── Search.tsx
│   │   ├── Tracking.tsx
│   │   ├── Feedback.tsx
│   │   └── auth/
│   ├── services/           # API client layer
│   │   ├── api.ts
│   │   ├── dumps.service.ts
│   │   ├── search.service.ts
│   │   └── feedback.service.ts
│   ├── contexts/           # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── DumpsContext.tsx
│   │   └── SearchContext.tsx
│   ├── hooks/              # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useDumps.ts
│   │   ├── useSearch.ts
│   │   └── useOptimistic.ts
│   ├── utils/              # Helper functions
│   │   ├── time-buckets.ts
│   │   ├── sorting.ts
│   │   └── formatting.ts
│   ├── types/              # TypeScript definitions
│   │   ├── dump.types.ts
│   │   ├── search.types.ts
│   │   └── feedback.types.ts
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── tailwind.config.js      # Tailwind with Clutter.AI brand tokens
├── vite.config.ts          # Vite configuration (port 3000)
└── package.json
```

## Development Notes

### Separation of Concerns

This application is completely separate from the `admin-dashboard/` application:
- **Different port**: User client on 3000, admin dashboard on 3001
- **Independent deployment**: Can be deployed separately
- **Shared design system**: UI components and Tailwind config ported from admin-dashboard for consistency
- **Same backend**: Both apps connect to the same NestJS backend API

### Authentication

All API calls include authentication headers via Axios interceptor configured in `src/services/api.ts`. Users must log in before accessing protected routes.

### Performance Targets

- Dashboard load: <2 seconds
- Search results: <3 seconds  
- API operations: <300ms
- Smooth 60fps animations

### Mobile Responsiveness

Application is mobile-first and tested at:
- 320px (iPhone SE)
- 768px (iPad)
- 1024px (Desktop)

## API Integration

Backend API base URL is configured via `VITE_API_URL` environment variable (default: `http://localhost:3001`).

All endpoints require authentication and automatically filter by userId:
- `GET /api/dumps` - Fetch user's dumps
- `POST /api/search` - Natural language search
- `PATCH /api/dumps/:id` - Accept/reject dumps
- `GET /api/metadata/enums` - Filter enum values
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback` - View user's feedback

## Contributing

This feature is part of the Clutter.AI monorepo. See `/specs/002-user-frontend-interface/` for:
- `spec.md` - Feature specification with user stories
- `plan.md` - Implementation plan with architecture
- `tasks.md` - Detailed task breakdown
- `data-model.md` - TypeScript interfaces
- `contracts/api-contracts.md` - API documentation

## License

Proprietary - Clutter.AI
