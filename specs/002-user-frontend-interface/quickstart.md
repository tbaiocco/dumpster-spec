# Quickstart Guide: User Frontend Interface

**Feature**: `002-user-frontend-interface`  
**Date**: 2025-12-15  
**Audience**: Frontend developers implementing this feature

---

## Overview

This guide provides a quick-start path for implementing the Clutter.AI User Frontend Interface. Follow these steps to set up your environment and begin development.

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Access to the repository
- Backend API running locally or accessible endpoint
- Valid authentication credentials for testing

---

## Quick Setup (5 minutes)

### 1. Clone and Navigate

```bash
cd /path/to/dumpster
cd admin-dashboard  # Use existing React structure
```

### 2. Install Dependencies

```bash
npm install
# Additional dependencies for this feature
npm install date-fns react-window
```

### 3. Environment Configuration

Create `.env.local` file:

```env
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_AUTH_ENABLED=true
```

### 4. Start Development Server

```bash
npm start
```

Application will open at `http://localhost:3001` (or next available port).

---

## Project Structure

```
admin-dashboard/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Base design system components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Badge.tsx
│   │   ├── DumpCard.tsx     # Dump display card
│   │   ├── TimeBucket.tsx   # Time bucket grouping
│   │   ├── SearchBar.tsx    # Search interface
│   │   ├── FilterPanel.tsx  # Advanced filters
│   │   └── Toast.tsx        # Toast notifications
│   ├── pages/               # Route-level pages
│   │   ├── Dashboard.tsx    # Main dashboard (/)
│   │   ├── Search.tsx       # Search page (/search)
│   │   ├── Tracking.tsx     # Reminders & Tracking (/tracking)
│   │   └── Feedback.tsx     # Feedback page (/feedback)
│   ├── services/            # API integration layer
│   │   ├── api.ts           # Axios instance with interceptors
│   │   ├── dumps.service.ts # Dump operations
│   │   ├── search.service.ts# Search operations
│   │   └── feedback.service.ts # Feedback operations
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.tsx  # Authentication state
│   │   ├── DumpsContext.tsx # Dumps state & actions
│   │   ├── ToastContext.tsx # Toast notifications
│   │   └── ThemeContext.tsx # UI theme (brand colors)
│   ├── hooks/               # Custom React hooks
│   │   ├── useDumps.ts      # Dump operations
│   │   ├── useSearch.ts     # Search logic
│   │   ├── useTimeBuckets.ts# Time bucket calculations
│   │   └── useOptimistic.ts # Optimistic updates
│   ├── utils/               # Utility functions
│   │   ├── dates.ts         # Date manipulation
│   │   ├── sorting.ts       # Dump sorting logic
│   │   └── validation.ts    # Form validation
│   ├── types/               # TypeScript type definitions
│   │   ├── dump.types.ts    # Dump-related types
│   │   ├── api.types.ts     # API request/response types
│   │   └── ui.types.ts      # UI state types
│   ├── App.tsx              # Root component with routing
│   └── index.tsx            # Entry point
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── contract/            # API contract tests
└── tailwind.config.js       # Tailwind configuration (brand colors)
```

---

## Key Files to Start With

### 1. Update Tailwind Config

**File**: `tailwind.config.js`

```javascript
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'clutter-stone': '#FAFAF9',
        'clutter-white': '#FFFFFF',
        'clutter-purple': '#B929EB',
        'clutter-cyan': '#2DD9F6',
        'clutter-text': '#1E293B',
        'clutter-muted': '#64748B',
      },
      fontFamily: {
        'heading': ['Outfit', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        'clutter-purple': '0 10px 40px -10px rgba(185, 41, 235, 0.2)',
        'clutter-cyan': '0 10px 40px -10px rgba(45, 217, 246, 0.2)',
      },
    },
  },
  plugins: [],
};
```

### 2. Create API Service

**File**: `src/services/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
});

// Request interceptor: Add authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3. Create Type Definitions

**File**: `src/types/dump.types.ts`

Copy type definitions from `data-model.md`.

---

## Development Workflow

### Phase 1: Foundation (Week 1)

1. **Setup Design System** (Day 1-2)
   - Configure Tailwind with brand colors
   - Create base UI components (Button, Card, Input, Modal, Badge)
   - Add Google Fonts (Outfit, Inter)

2. **API Integration** (Day 3)
   - Create axios instance with interceptors
   - Create service files for API endpoints
   - Add TypeScript types from data-model.md

3. **Routing** (Day 4)
   - Configure React Router
   - Create basic page components
   - Add navigation

4. **Context Setup** (Day 5)
   - Create AuthContext
   - Create DumpsContext
   - Create ToastContext

### Phase 2: Dashboard Core (Week 2)

1. **Dashboard Layout** (Day 1-2)
   - Create dashboard page
   - Implement time bucket logic
   - Add dump fetching

2. **Dump Cards** (Day 3)
   - Create DumpCard component
   - Implement sorting
   - Add empty states

3. **Time Buckets** (Day 4-5)
   - Group dumps by time bucket
   - Add expand/collapse for future buckets
   - Implement lazy loading

### Phase 3: Search & Discovery (Week 3)

1. **Search Interface** (Day 1-2)
   - Create search bar
   - Implement natural language search
   - Add loading states

2. **Filters** (Day 3-4)
   - Create filter panel
   - Integrate enum values from backend
   - Add filter state management

3. **Results Display** (Day 5)
   - Render search results
   - Add pagination
   - Handle empty states

### Phase 4: Action & Review (Week 4)

1. **Detail Modal** (Day 1-2)
   - Create modal component
   - Add dump detail view
   - Implement edit form

2. **Accept/Reject** (Day 3-4)
   - Add accept/reject buttons
   - Implement optimistic updates
   - Add error handling with retry

3. **Testing** (Day 5)
   - Unit tests for components
   - Integration tests for flows
   - Contract tests for API

### Phase 5: Specialized Views (Week 5)

1. **Tracking Hub** (Day 1-2)
   - Filter for reminders/tracking
   - Add specialized icons
   - Implement timeline view

2. **Feedback System** (Day 3)
   - Create feedback form
   - Add "My Feedback" list
   - Implement status badges

3. **Mobile Polish** (Day 4-5)
   - Test responsive breakpoints
   - Adjust touch targets
   - Final QA

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
npm test -- DumpCard.test
```

### Run with Coverage

```bash
npm test -- --coverage
```

### Contract Tests

```bash
npm test -- contract/
```

---

## Common Commands

```bash
# Start development server
npm start

# Run tests
npm test

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Build for production
npm run build

# Type checking
npx tsc --noEmit
```

---

## Key Concepts

### 1. Time Bucket Calculation

```typescript
import { isToday, isTomorrow, startOfDay, addDays, startOfWeek, startOfMonth } from 'date-fns';

function getTimeBucket(dump: Dump): TimeBucket {
  const date = new Date(dump.extractedEntities.dates[0].date);
  const now = new Date();
  
  if (date < startOfDay(now)) return 'overdue';
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  
  const nextWeekEnd = addDays(startOfWeek(addDays(now, 7)), 6);
  if (date <= nextWeekEnd) return 'nextWeek';
  
  const nextMonthEnd = addDays(startOfMonth(addDays(now, 30)), 30);
  if (date <= nextMonthEnd) return 'nextMonth';
  
  return 'later';
}
```

### 2. Optimistic Updates

```typescript
async function acceptDump(dumpId: string, edits: DumpEdits) {
  const originalDump = getDump(dumpId);
  
  // 1. Update UI immediately
  updateDump({ ...originalDump, ...edits, status: 'Approved' });
  
  try {
    // 2. Send to backend
    await dumpsService.updateDump(dumpId, edits);
  } catch (error) {
    // 3. Rollback on error
    updateDump(originalDump);
    showToast({
      type: 'error',
      message: 'Failed to accept dump',
      action: { label: 'Retry', onClick: () => acceptDump(dumpId, edits) }
    });
  }
}
```

### 3. Authentication Flow

```typescript
// Check auth on app load
useEffect(() => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    navigate('/login');
  } else {
    fetchUser();
  }
}, []);
```

---

## Troubleshooting

### API Connection Issues

Check `.env.local` has correct `REACT_APP_API_BASE_URL`.

```bash
# Verify backend is running
curl http://localhost:3000/api/health
```

### Authentication Errors

Clear local storage and re-login:

```javascript
localStorage.clear();
window.location.href = '/login';
```

### Build Errors

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

1. Review `research.md` for technical decisions
2. Review `data-model.md` for TypeScript types
3. Review `contracts/api-contracts.md` for API details
4. Start with Phase 1: Foundation tasks
5. Follow TDD approach where possible

---

## Resources

- **Spec**: `specs/002-user-frontend-interface/spec.md`
- **Research**: `specs/002-user-frontend-interface/research.md`
- **Data Model**: `specs/002-user-frontend-interface/data-model.md`
- **API Contracts**: `specs/002-user-frontend-interface/contracts/api-contracts.md`
- **React Docs**: https://react.dev
- **Tailwind Docs**: https://tailwindcss.com
- **date-fns Docs**: https://date-fns.org

---

## Support

For questions or issues:
1. Review documentation first
2. Check existing tests for examples
3. Consult team members
4. Create detailed issue with reproduction steps
