# Research: User Frontend Interface

**Feature**: `002-user-frontend-interface`  
**Date**: 2025-12-15  
**Status**: Complete

## Overview

This document consolidates research findings for building the Clutter.AI User Frontend Interface. All technical unknowns from the specification have been resolved through analysis of the existing codebase and industry best practices.

---

## 1. Frontend Framework & Architecture

### Decision: React 19 with TypeScript

**Rationale**:
- Existing admin-dashboard uses React 19.2.0 with TypeScript
- Team already familiar with React patterns
- Strong ecosystem for UI components and state management
- TypeScript provides type safety for API contracts

**Alternatives Considered**:
- Vue.js: Would require team retraining and dual-framework maintenance
- Svelte: Smaller bundle but lacks ecosystem maturity
- Next.js: Overkill for client-side only application with existing backend

**Implementation Approach**:
- Use Create React App structure (already established)
- TypeScript 4.9.5 for type safety
- React Router DOM 7.9.5 for navigation

---

## 2. State Management Strategy

### Decision: React Context + Custom Hooks

**Rationale**:
- Feature complexity fits within React's built-in state management
- Avoid unnecessary library dependencies (Redux, MobX)
- Context API sufficient for auth state, user data, and UI preferences
- Custom hooks provide reusable stateful logic

**State Structure**:
```typescript
// Auth Context
- user: User | null
- isAuthenticated: boolean
- login/logout methods

// Dumps Context
- dumps: Dump[]
- filters: SearchFilters
- timeBuckets: Record<TimeBucket, Dump[]>
- actions: accept/reject/fetch

// UI Context
- theme: BrandTheme
- toasts: Toast[]
- modals: ModalState
```

**Alternatives Considered**:
- Redux: Over-engineered for this scope; unnecessary boilerplate
- Zustand: Good but adds dependency when Context suffices
- Jotai/Recoil: Atomic state not needed for this feature

---

## 3. API Integration & Authentication

### Decision: Axios with Interceptors

**Rationale**:
- Already used in admin-dashboard (axios 1.13.2)
- Interceptors handle authentication headers automatically
- Request/response transformation in one place
- Error handling centralized

**Authentication Flow**:
```typescript
// Axios interceptor adds userId to all requests
axios.interceptors.request.use((config) => {
  const token = getAuthToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor handles 401/403
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
    }
    return Promise.reject(error);
  }
);
```

**Implementation Details**:
- Create `src/services/api.ts` with configured axios instance
- Create `src/services/dumps.service.ts` for dump operations
- Create `src/services/search.service.ts` for search operations
- Create `src/services/feedback.service.ts` for feedback operations

**Alternatives Considered**:
- Fetch API: Lacks interceptors, requires more boilerplate
- React Query: Excellent but adds complexity; Context + custom hooks sufficient

---

## 4. Design System Implementation

### Decision: Tailwind CSS with Custom Configuration

**Rationale**:
- Already configured in admin-dashboard (tailwind-merge 3.4.0)
- Utility-first approach matches rapid prototyping needs
- Easy to enforce brand identity through config
- Excellent mobile-first responsive utilities

**Brand Configuration**:
```javascript
// tailwind.config.js extensions
module.exports = {
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
};
```

**Component Library**:
- Use class-variance-authority (CVA) for component variants
- Use clsx for conditional classes
- Use lucide-react for icons (already installed)
- Use @headlessui/react for accessible modals/dialogs

**Alternatives Considered**:
- Material-UI: Too opinionated, doesn't match brand identity
- Ant Design: Heavy bundle size, overkill for this scope
- Chakra UI: Good but Tailwind more flexible for custom designs

---

## 5. Routing Strategy

### Decision: React Router v7 with Code Splitting

**Rationale**:
- Already installed (react-router-dom 7.9.5)
- v7 provides excellent code-splitting and lazy loading
- Nested routes support for complex layouts

**Route Structure**:
```typescript
/                    -> Dashboard (time-bucketed dumps)
/search              -> Search & Discovery
/tracking            -> Reminders & Tracking Hub
/feedback            -> Feedback submission & list
/login               -> Authentication (if not handled externally)
```

**Implementation**:
- Use React.lazy() for route-based code splitting
- Implement ProtectedRoute wrapper for auth checking
- Implement layout components (DashboardLayout) for shared UI

**Alternatives Considered**:
- TanStack Router: New but lacks ecosystem maturity
- Reach Router: Deprecated in favor of React Router

---

## 6. Time Bucket Logic

### Decision: Date-fns for Date Manipulation

**Rationale**:
- Lightweight, tree-shakeable
- Excellent timezone support
- Clean API for calendar-based calculations

**Bucket Calculation**:
```typescript
import { 
  isToday, 
  isTomorrow, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth 
} from 'date-fns';

function getBucketForDump(dump: Dump): TimeBucket {
  const date = new Date(dump.extractedEntities.dates[0]);
  
  if (date < startOfToday()) return 'overdue';
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  if (isWithinNextWeek(date)) return 'nextWeek';
  if (isWithinNextMonth(date)) return 'nextMonth';
  return 'later';
}
```

**Alternatives Considered**:
- Moment.js: Deprecated, large bundle size
- Day.js: Good but date-fns more widely adopted
- Luxon: Heavier, overkill for these operations

---

## 7. Optimistic UI Updates

### Decision: Local State + Rollback on Error

**Rationale**:
- Simplest implementation matching user expectations
- No external library needed
- Explicit error handling with retry capability

**Implementation Pattern**:
```typescript
async function acceptDump(dumpId: string, edits: DumpEdits) {
  // 1. Optimistic update
  const originalDump = getDump(dumpId);
  updateDumpInState({ ...originalDump, ...edits, status: 'Approved' });
  closeModal();
  
  try {
    // 2. API call
    await api.patch(`/dumps/${dumpId}`, edits);
  } catch (error) {
    // 3. Rollback on failure
    updateDumpInState(originalDump);
    openModal(dumpId); // Re-open with edits preserved
    showToast({
      type: 'error',
      message: 'Failed to accept dump',
      action: { label: 'Retry', onClick: () => acceptDump(dumpId, edits) }
    });
  }
}
```

**Alternatives Considered**:
- Tanstack Query mutations: Excellent but adds complexity
- SWR with optimistic updates: Good but overkill for this scope

---

## 8. Performance Optimization

### Decision: Lazy Loading + Virtual Scrolling for Lists

**Rationale**:
- Dashboard may contain hundreds of dumps
- Virtual scrolling renders only visible items
- Code-splitting reduces initial bundle size

**Implementation**:
- Use React.lazy() for route-based splitting
- Use react-window for virtual scrolling (if needed based on data volume)
- Implement pagination for search results (20 items per page)
- Lazy-load future time buckets on expand

**Performance Targets**:
- Initial load: <2s (SC-001)
- Search results: <3s (SC-002)
- API operations: <300ms (SC-004)
- Smooth 60fps animations

**Alternatives Considered**:
- React-virtualized: Heavier, react-window is successor
- Infinite scroll without virtualization: Memory issues with large lists

---

## 9. Testing Strategy

### Decision: React Testing Library + Jest

**Rationale**:
- Already configured in admin-dashboard
- Encourages testing user behavior not implementation
- Excellent accessibility testing support

**Test Coverage Requirements**:
- Unit tests: ≥80% coverage (Constitution requirement)
- Integration tests: All API interactions
- Component tests: All user-facing components
- E2E tests: Critical user journeys (P1 stories)

**Test Structure**:
```
tests/
├── unit/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/
│   ├── api/
│   └── flows/
└── contract/
    └── api-contracts.test.ts
```

**Alternatives Considered**:
- Vitest: Faster but Jest is established standard
- Cypress: Good for E2E but RTL sufficient for component testing

---

## 10. Mobile Responsiveness

### Decision: Mobile-First Tailwind Breakpoints

**Rationale**:
- Tailwind's mobile-first approach matches requirements
- Responsive utilities handle all breakpoint scenarios
- Touch targets automatically sized correctly

**Breakpoint Strategy**:
```css
/* Mobile first - base styles are mobile */
.card { @apply p-4; }

/* Tablet - sm: 640px */
@screen sm { .card { @apply p-6; } }

/* Desktop - md: 768px */
@screen md { .card { @apply p-8; } }

/* Large desktop - lg: 1024px */
@screen lg { .card { @apply p-10; } }
```

**Touch Targets**:
- Minimum 44x44px for all interactive elements
- Adequate spacing between clickable areas
- Swipe gestures for modal dismissal

**Alternatives Considered**:
- CSS Grid only: Less flexible than Tailwind utilities
- Media queries in JS: More complex, less maintainable

---

## 11. Error Handling & Toast Notifications

### Decision: Custom Toast Context with React Portal

**Rationale**:
- Simple, lightweight implementation
- No external library needed
- Full control over styling and behavior

**Toast Types**:
- Success: Green accent, checkmark icon
- Error: Red accent, X icon, optional retry action
- Info: Blue accent, info icon
- Warning: Yellow accent, warning icon

**Implementation**:
```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  action?: { label: string; onClick: () => void; };
  duration?: number; // Auto-dismiss
}
```

**Alternatives Considered**:
- react-hot-toast: Good library but adds dependency
- Material-UI Snackbar: Requires full MUI installation

---

## 12. Font Loading Strategy

### Decision: Google Fonts with font-display: swap

**Rationale**:
- Outfit and Inter both available on Google Fonts
- font-display: swap prevents FOIT (Flash of Invisible Text)
- Optimized delivery through Google's CDN

**Implementation**:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800&display=swap" rel="stylesheet">
```

**Alternatives Considered**:
- Self-hosted fonts: More complex setup, no performance benefit
- System fonts: Doesn't match brand identity

---

## Summary of Key Decisions

| Area | Decision | Justification |
|------|----------|---------------|
| Framework | React 19 + TypeScript | Existing codebase standard |
| State Management | Context API + Custom Hooks | Sufficient for feature complexity |
| API Layer | Axios with interceptors | Already used, centralized auth |
| Styling | Tailwind CSS | Mobile-first, brand customization |
| Routing | React Router v7 | Already installed, code-splitting |
| Date Logic | date-fns | Lightweight, calendar-aware |
| Testing | React Testing Library + Jest | Configured, behavior-focused |
| Performance | Lazy loading + Virtual scrolling | Handles large datasets |
| Notifications | Custom Toast Context | Simple, no extra dependencies |

---

## Unresolved Items

None. All technical unknowns from specification have been resolved through research and analysis of existing codebase patterns.

---

## Next Steps

1. Proceed to Phase 1: Generate data-model.md and API contracts
2. Update agent context with new frontend patterns
3. Begin implementation following 5-phase plan structure
