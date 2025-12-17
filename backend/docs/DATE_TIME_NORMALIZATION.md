# Date and Time Normalization

## Overview

The Entity Extraction Service automatically normalizes relative dates and times to absolute values when extracting entities from user content. This ensures that all temporal information is stored in a consistent, machine-readable format suitable for reminder creation, scheduling, and other time-based features.

## Implementation

The normalization is implemented in `EntityExtractionService` using the `chrono-node` library, which provides robust natural language date parsing capabilities.

### Location

- **File**: `backend/src/modules/ai/extraction.service.ts`
- **Methods**: 
  - `normalizeDate()` - Converts relative dates to ISO 8601 format (YYYY-MM-DD)
  - `normalizeTime()` - Converts relative times to 24-hour format (HH:MM)
  - `normalizeEntities()` - Applies normalization to all extracted entities

### Reference Date

The normalization uses the `timestamp` provided in the extraction context as the reference point for calculating relative dates/times. This timestamp is passed through the entire processing pipeline:

1. **dump.service.ts** (line 237): Provides timestamp in Claude analysis context
2. **dump.service.ts** (line 256): Passes same timestamp to entity extraction
3. **extraction.service.ts**: Uses timestamp as reference for normalization

## Supported Formats

### Dates

#### Relative Dates
- **tomorrow** → Next day (e.g., "2025-12-04")
- **next week** → 7 days in future (e.g., "2025-12-10")
- **next Monday** → Next occurrence of weekday (e.g., "2025-12-08")
- **in 3 days** → Specific day offset (e.g., "2025-12-06")
- **today** → Current date (e.g., "2025-12-03")
- **yesterday** → Previous day (e.g., "2025-12-02")

#### Absolute Dates
- **December 15** → Current year assumed (e.g., "2025-12-15")
- **Dec 25, 2025** → Full date (e.g., "2025-12-25")
- **2025-12-25** → ISO format (unchanged)
- **12/25/2025** → Various formats supported

### Times

#### Relative Times
- **midnight** → "00:00"
- **early morning** → "08:00"
- **morning** → "09:00"
- **late morning** → "11:00"
- **noon** / **midday** → "12:00"
- **afternoon** → "14:00"
- **late afternoon** → "16:00"
- **evening** → "18:00"
- **night** → "20:00"
- **late night** → "22:00"

#### Absolute Times
- **2:30pm** → "14:30"
- **14:30** → "14:30" (unchanged)
- **2:30 PM** → "14:30"
- **3pm** → "15:00"

#### Contextual Times
- **in the evening** → "18:00" (matches "evening")
- **at noon** → "12:00" (matches "noon")

## Examples

### Example 1: Simple Reminder
```
User Input: "Remind me tomorrow early morning"
Extracted Entities:
  - date: "2025-12-04" (normalized from "tomorrow")
  - time: "08:00" (normalized from "early morning")
```

### Example 2: Meeting Scheduling
```
User Input: "Meeting next Monday at noon with John"
Extracted Entities:
  - date: "2025-12-08" (normalized from "next Monday")
  - time: "12:00" (normalized from "noon")
  - person: "John"
```

### Example 3: Package Tracking
```
User Input: "Package arriving December 15 in the afternoon"
Extracted Entities:
  - date: "2025-12-15" (normalized from "December 15")
  - time: "14:00" (normalized from "afternoon")
```

## Data Storage

### Simplified Approach

Only **normalized values** are stored in the database. The original relative expressions remain available in:
- `raw_content`: The original user input
- `ai_summary`: Claude's processed summary

This approach provides:
1. **Consistency**: All temporal data in standard format
2. **Simplicity**: Single source of truth for dates/times
3. **Reliability**: No confusion about which value to use
4. **Efficiency**: Normalized once during extraction

### Entity Structure

```typescript
{
  entities: [
    {
      type: 'date',
      value: '2025-12-04',  // Normalized ISO format
      confidence: 0.7,
      context: 'Remind me tomorrow early'
    },
    {
      type: 'time',
      value: '08:00',  // Normalized 24-hour format
      confidence: 0.8,
      context: 'tomorrow early morning to call'
    }
  ]
}
```

## Fallback Behavior

If normalization fails for any reason:
1. A warning is logged
2. The original value is preserved
3. Processing continues normally

This ensures robustness and prevents data loss even when dealing with unusual date/time expressions.

## Testing

### Manual Testing

Run the test script to see normalization in action:

```bash
cd backend
node test-scripts/test-date-normalization.js
```

### Integration Testing

The normalization is automatically applied during the full dump processing pipeline:

```bash
# Create test data with relative dates/times
./test-scripts/test-search-data.js

# Check the extracted entities in the database
# Dates and times should be normalized to absolute values
```

## Benefits

1. **Reminder Creation**: Exact dates/times for scheduling reminders
2. **Proactive Opportunities**: Reliable temporal data for detecting opportunities
3. **Search and Filtering**: Consistent format for date-based queries
4. **Cross-timezone Support**: ISO format works well with timezone conversion
5. **Future-proof**: Normalized data remains valid indefinitely

## Dependencies

- **chrono-node** (v2.7.9): Natural language date parsing library
  - Handles relative dates ("tomorrow", "next week")
  - Parses various date formats
  - Supports multiple languages
  - Well-maintained and widely used

## Migration Notes

### Existing Data

Existing dumps are not affected by this change. The normalization only applies to:
- New dumps created after deployment
- Re-extraction of entities (if implemented)

### Backward Compatibility

The entity structure remains unchanged:
- Same field names
- Same data types (strings)
- No database schema changes required

The only difference is that `value` fields now contain normalized data instead of relative expressions.
