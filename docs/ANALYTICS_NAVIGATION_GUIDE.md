# Analytics Dashboard Navigation Guide

## Dashboard Sidebar Structure

```
┌─────────────────────────────────────┐
│  🎯 Clutter.AI                      │
├─────────────────────────────────────┤
│  MAIN NAVIGATION                    │
│  ┌─────────────────────────────┐   │
│  │ 📊 Dashboard                │   │
│  │ 👥 Users                    │   │
│  │ 📄 Dumps                    │   │
│  │ ✓  Reviews                  │   │
│  │ 💬 Feedback                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ANALYTICS                          │
│  ┌─────────────────────────────┐   │
│  │ 📊 Analytics                │   │ → /analytics (System Overview)
│  │ 🔍 Search Metrics           │   │ → /analytics/search
│  │ 💡 AI Metrics               │   │ → /analytics/ai
│  │ 📈 User Stats          ✨NEW│   │ → /analytics/users
│  │ ⚡ Feature Usage       ✨NEW│   │ → /analytics/features
│  └─────────────────────────────┘   │
│                                     │
│  🚪 Logout                          │
└─────────────────────────────────────┘
```

## Analytics Pages Overview

### 1. System Analytics (`/analytics`)
**Existing Page - No Changes**

Cards:
- Total Users
- Total Dumps
- Avg Processing Time
- Storage Used

Charts:
- Daily Activity (30 days)
- Storage breakdown

---

### 2. Search Metrics (`/analytics/search`)
**Existing Page - Already Compatible**

Cards:
- Total Searches
- Avg Latency
- Success Rate

Charts:
- Top Queries (bar chart)
- Query Distribution by Type (pie chart)
- Latency by Type (p95/p99 percentiles)

---

### 3. AI Metrics (`/analytics/ai`)
**Updated Page** ✅

Cards:
- Total Processed
- Success Rate (NEW)
- Avg Confidence
- Needs Review (NEW)

Charts:
- Confidence Distribution (bar chart)
- Category Performance (top 8 categories with badges) (NEW)

Summary:
- Successfully Processed count & percentage
- Low Confidence count & percentage
- Total Categories

---

### 4. User Stats (`/analytics/users`) ✨ NEW PAGE
**Brand New Page**

Cards:
- Active Last Week
- Active Last Month
- Active Last Quarter
- Avg Dumps/User

Charts:
- Monthly Registration Trends (area chart with gradient)
- Activity Overview (bar chart - 7/30/90 day comparison)

Retention Insights:
- Weekly Retention Rate (week/month ratio)
- Monthly Retention Rate (month/quarter ratio)
- User Engagement Score (based on avg dumps)

---

### 5. Feature Usage (`/analytics/features`) ✨ NEW PAGE
**Brand New Page**

Cards:
- Total Feature Usage
- Most Popular Feature
- Active Features

Charts:
- Feature Usage Distribution (multi-color bar chart)
- Percentage Breakdown (pie chart with legend)

Detailed Breakdown:
- Grid of feature cards with:
  - Feature icon & name
  - Total uses
  - Progress bar
  - Percentage badge
  - "Top Feature" badge for most popular

Tracked Features:
- 🤖 Bot Commands
- 📧 Email Processing
- 📄 Dumps Created
- 🔍 Searches
- 📋 Tracking Created
- 📅 Calendar Synced
- 🔔 Reminders Sent

---

## Design System

### Color Scheme
```
Primary Gradient:   #B929EB → #E91E8C (purple to pink)
Secondary Gradient: #2DD9F6 → #3B82F6 (cyan to blue)
Success:            #10b981 (emerald)
Warning:            #f59e0b (amber)
Error:              #ef4444 (red)
Info:               #3b82f6 (blue)
```

### Component Patterns

#### Stat Cards
```tsx
<Card hover className="bg-gradient-to-br from-{color}-50 to-{color}-100 border-{color}-200">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardDescription>{label}</CardDescription>
      <Icon className="w-8 h-8 text-{color}-600" />
    </div>
    <CardTitle className="text-5xl font-display text-{color}-900">
      {value}
    </CardTitle>
    <p className="text-sm text-{color}-600 mt-2">{description}</p>
  </CardHeader>
</Card>
```

#### Charts
- All charts use `ResponsiveContainer` with 100% width
- Height typically 300-400px
- CartesianGrid with `strokeDasharray="3 3"` and `#e2e8f0` color
- Rounded bars with `radius={[8, 8, 0, 0]}`
- Custom tooltips with rounded corners and shadows

#### Badges
- success: Green background (high values, good performance)
- warning: Amber background (medium values, needs attention)
- error: Red background (low values, critical issues)
- info: Blue background (informational)

---

## Backend Integration

All pages fetch real data from backend endpoints:

| Page            | Endpoint                     | Method | Auth Required |
|-----------------|------------------------------|--------|---------------|
| System          | /admin/analytics/system      | GET    | JWT           |
| Search Metrics  | /admin/analytics/search      | GET    | JWT           |
| AI Metrics      | /admin/analytics/ai          | GET    | JWT           |
| User Stats      | /admin/analytics/users       | GET    | JWT           |
| Feature Usage   | /admin/analytics/features    | GET    | JWT           |

All endpoints return:
```typescript
{
  success: boolean;
  data: {
    // endpoint-specific data
  };
}
```

---

## User Experience Flow

1. **Login** → User authenticates
2. **Dashboard** → Lands on system overview (`/analytics`)
3. **Sidebar Navigation** → Click any analytics item:
   - 📊 Analytics → System metrics
   - 🔍 Search Metrics → Search performance
   - 💡 AI Metrics → AI processing stats
   - 📈 User Stats → User engagement (NEW)
   - ⚡ Feature Usage → Feature breakdown (NEW)
4. **Refresh** → Each page has a refresh button in header
5. **Interactive Charts** → Hover for tooltips, click legend items

---

## Mobile Responsiveness

All pages are responsive with Tailwind breakpoints:

- **sm**: 640px (mobile)
- **md**: 768px (tablet) - 2 columns for stat cards
- **lg**: 1024px (desktop) - 3-4 columns for stat cards
- **xl**: 1280px (large desktop)

Grid patterns:
```tsx
grid gap-6 md:grid-cols-2 lg:grid-cols-4  // Stat cards
grid gap-6 lg:grid-cols-2                 // Charts section
```

---

## Testing the Implementation

### Visual Test
1. Start backend: `cd backend && npm run start:dev`
2. Start frontend: `cd admin-dashboard && npm start`
3. Navigate to http://localhost:3001
4. Login with admin credentials
5. Click through all 5 analytics pages
6. Verify:
   - ✅ All pages load without errors
   - ✅ Data displays correctly
   - ✅ Charts render properly
   - ✅ Responsive layout works
   - ✅ Refresh buttons work
   - ✅ Icons and colors match design system

### Functional Test
1. Perform a search: `POST /api/search`
2. Check `feature_usage` table for SEARCH_PERFORMED entry
3. Navigate to Feature Usage page
4. Verify search count increased
5. Test bot commands via Telegram/WhatsApp
6. Verify BOT_COMMAND entries appear
7. Create a dump
8. Verify DUMP_CREATED entry appears

### Data Verification
```sql
-- Check search metrics
SELECT * FROM search_metrics ORDER BY timestamp DESC LIMIT 10;

-- Check AI metrics
SELECT * FROM ai_metrics ORDER BY timestamp DESC LIMIT 10;

-- Check feature usage
SELECT feature_type, COUNT(*) as count 
FROM feature_usage 
GROUP BY feature_type 
ORDER BY count DESC;

-- Check active users (last 7 days)
SELECT COUNT(DISTINCT user_id) as active_users
FROM feature_usage
WHERE timestamp > NOW() - INTERVAL '7 days';
```

---

## Troubleshooting

### Page Shows No Data
- **Check**: Backend is running
- **Check**: User is authenticated (JWT token valid)
- **Check**: Database has data in metric tables
- **Solution**: Run test scripts to generate sample data

### Charts Don't Render
- **Check**: Recharts is installed (`npm list recharts`)
- **Check**: Browser console for errors
- **Check**: Data format matches expected interface

### Navigation Items Missing
- **Check**: DashboardLayout.tsx has updated analyticsNavigation array
- **Check**: Icons imported from lucide-react
- **Solution**: Clear browser cache and rebuild

### TypeScript Errors
- **Check**: All interfaces match backend response structures
- **Check**: Optional chaining used for potentially undefined values
- **Solution**: Run `npm run build` and check errors

---

**Status**: ✅ All 5 analytics pages fully implemented with consistent design and real backend integration
