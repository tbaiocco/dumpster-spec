# Date Formatting in Digests

The digest service now formats dates according to each user's timezone and language preferences.

## Configuration

Users have two fields in the `users` table:
- `timezone`: User's timezone (default: 'UTC')
- `language`: User's language code (default: 'en')

## Examples

### Date Formatting (Header)

Uses `Intl.DateTimeFormat` with `dateStyle: 'full'`:

```typescript
// User: timezone='Europe/Lisbon', language='en'
"Monday, November 25, 2025"

// User: timezone='America/New_York', language='en'
"Monday, November 25, 2025"

// User: timezone='Europe/Lisbon', language='pt'
"segunda-feira, 25 de novembro de 2025"

// User: timezone='Asia/Tokyo', language='ja'
"2025年11月25日月曜日"

// User: timezone='Europe/Paris', language='fr'
"lundi 25 novembre 2025"
```

### DateTime Formatting (Due Dates)

Uses `Intl.DateTimeFormat` with `dateStyle: 'medium', timeStyle: 'short'`:

```typescript
// User: timezone='Europe/Lisbon', language='en'
"Nov 25, 2025, 3:30 PM"

// User: timezone='America/New_York', language='en'
// (Same moment, different timezone)
"Nov 25, 2025, 10:30 AM"

// User: timezone='Europe/Lisbon', language='pt'
"25/11/2025, 15:30"

// User: timezone='Asia/Tokyo', language='ja'
"2025/11/25 23:30"

// User: timezone='Europe/Paris', language='fr'
"25 nov. 2025, 16:30"
```

## Supported Language Codes

Common BCP 47 language codes:
- `en` - English
- `pt` - Portuguese
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `ja` - Japanese
- `zh` - Chinese
- `ko` - Korean
- `ar` - Arabic
- `ru` - Russian
- `hi` - Hindi

## Supported Timezones

Common timezone identifiers (IANA timezone database):
- `UTC` - Coordinated Universal Time
- `America/New_York` - Eastern Time (US)
- `America/Los_Angeles` - Pacific Time (US)
- `Europe/Lisbon` - Lisbon
- `Europe/London` - London
- `Europe/Paris` - Paris, Berlin, Rome
- `Asia/Tokyo` - Tokyo
- `Asia/Shanghai` - China
- `Asia/Dubai` - Dubai
- `Australia/Sydney` - Sydney

## Implementation

The `formatDigestAsText` method:
1. Fetches the user from the database
2. Extracts `timezone` and `language` (defaults to 'UTC' and 'en')
3. Uses `Intl.DateTimeFormat` to format all dates consistently

## Testing

To test date formatting with different settings:

```bash
# Update user timezone and language
curl -X PATCH http://localhost:3000/users/YOUR_USER_ID \
  -H "Content-Type: application/json" \
  -d '{"timezone": "Europe/Lisbon", "language": "pt"}'

# Trigger a test digest
curl -X POST http://localhost:3000/test/notifications/digest/morning/YOUR_USER_ID
```

## Notes

- All dates are stored in UTC in the database
- Conversion to user's timezone happens only during formatting for display
- The `Intl.DateTimeFormat` API is built into Node.js and handles all locale rules automatically
- Invalid timezone/language codes will fall back to defaults
