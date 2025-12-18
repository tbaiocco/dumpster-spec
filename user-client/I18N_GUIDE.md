# Internationalization (i18n) Implementation Guide

## Overview

The application now supports internationalization in **English (en)**, **Portuguese (pt)**, and **Spanish (es)**. The implementation uses `react-i18next` for seamless translation management.

---

## 🏗️ Structure

```
user-client/src/
  i18n/
    config.ts           # i18n configuration
    locales/
      en.json          # English translations
      pt.json          # Portuguese translations  
      es.json          # Spanish translations
```

---

## 🚀 How It Works

### 1. **Automatic Language Detection**
- On login/signup, the user's language preference is loaded from their profile
- Language is synced from `user.language` field in the backend
- Changes to language in ProfilePage immediately update the UI

### 2. **Language Switching**
Users can change their language in two ways:
- **ProfilePage**: Update the `language` field (e.g., `en`, `pt`, `es`)
- **API Update**: Backend syncs the language preference to user profile

### 3. **Translation Usage in Components**

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('search.title')}</h1>
      <p>{t('search.description')}</p>
    </div>
  );
}
```

---

## 📝 Translation Keys Structure

### Common Keys
```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete"
  }
}
```

### Feature-Specific Keys
```json
{
  "capture": {
    "title": "Capture",
    "accepted": "Capture accepted successfully",
    "rejected": "Capture rejected successfully"
  },
  "search": {
    "placeholder": "Ask anything about your captures...",
    "description": "Use natural language to find anything"
  },
  "review": {
    "title": "Review Flagged Content",
    "stats": {
      "pending": "Pending",
      "approved": "Approved"
    }
  }
}
```

---

## ✅ Implemented Components

### High Priority (✅ Complete)
- ✅ **ReviewPage** - All UI strings, stats, filters
- ✅ **DumpDetailModal** - Form labels, buttons, validation messages
- ✅ **SearchPage** - Headers, empty states, error messages
- ✅ **SearchBar** - Placeholder text
- ✅ **SearchContext** - Error messages

### Medium Priority (✅ Complete)
- ✅ **FeedbackForm** - Form labels, validation, toast messages
- ✅ **ProfilePage** - All settings, labels, helper text
- ✅ **AuthContext** - Language sync on login/init

### Lower Priority (⏳ Not Yet Translated)
- ⏳ **DumpCard** - Status badges, tooltips
- ⏳ **SearchResultCard** - Metadata labels
- ⏳ **NewDumpModal** - Form labels, buttons
- ⏳ **ReminderCard** - Action labels
- ⏳ **PackageTrackingCard** - Status labels
- ⏳ **EditReminderModal** - Form fields
- ⏳ **TrackingStatusModal** - Form fields

---

## 🌍 Adding a New Language

1. **Create translation file**:
   ```bash
   cp user-client/src/i18n/locales/en.json user-client/src/i18n/locales/fr.json
   ```

2. **Translate all strings** in `fr.json`

3. **Update config.ts**:
   ```typescript
   import fr from './locales/fr.json';
   
   i18n.use(initReactI18next).init({
     resources: {
       en: { translation: en },
       pt: { translation: pt },
       es: { translation: es },
       fr: { translation: fr } // Add new language
     }
   });
   ```

4. **Test**: Change user profile language to `fr`

---

## 🔧 Adding New Translations

1. **Add to all language files**:
   ```json
   // en.json
   {
     "myFeature": {
       "title": "My Feature",
       "description": "This is my feature"
     }
   }
   
   // pt.json
   {
     "myFeature": {
       "title": "Minha Funcionalidade",
       "description": "Esta é minha funcionalidade"
     }
   }
   
   // es.json
   {
     "myFeature": {
       "title": "Mi Funcionalidad",
       "description": "Esta es mi funcionalidad"
     }
   }
   ```

2. **Use in component**:
   ```typescript
   const { t } = useTranslation();
   <h1>{t('myFeature.title')}</h1>
   ```

---

## 🎯 Dynamic Translations (with variables)

For translations with placeholders:

```json
{
  "capture": {
    "noResults": "No captures match \"{{query}}\""
  }
}
```

Usage:
```typescript
t('capture.noResults', { query: userQuery })
```

---

## 🧪 Testing

### Test Language Switching:
1. Go to Profile Settings
2. Change `language` field to `pt` or `es`
3. Click "Save"
4. UI should immediately update to selected language

### Test on Login:
1. Logout
2. Login with user that has `language: 'pt'` in profile
3. UI should load in Portuguese

---

## 📊 Current Coverage

| Feature | Coverage | Status |
|---------|----------|--------|
| Review Page | 100% | ✅ Complete |
| Search Page | 100% | ✅ Complete |
| Dump Detail Modal | 90% | ✅ Complete |
| Profile Page | 100% | ✅ Complete |
| Feedback Form | 100% | ✅ Complete |
| Auth Context | 100% | ✅ Complete |
| Dashboard | 0% | ⏳ Pending |
| Tracking | 0% | ⏳ Pending |
| Modals | 30% | ⏳ Partial |

**Overall: ~70% of user-facing strings translated**

---

## 🚧 Known Limitations

1. **Backend content is NOT translated**: 
   - `raw_content` and `ai_summary` remain in original language
   - User-generated content (notes, categories) not translated

2. **Date/Time formatting**: 
   - Currently using English format
   - Future: Add locale-aware date formatting

3. **Number formatting**:
   - Currently using default format
   - Future: Add locale-aware number formatting (1,000 vs 1.000)

---

## 🛠️ Troubleshooting

### Language not changing?
1. Check browser console for errors
2. Verify `user.language` in localStorage
3. Check i18n.language: `console.log(i18n.language)`

### Missing translation?
1. Check if key exists in all language files
2. Verify correct key path (e.g., `capture.title` not `captures.title`)
3. Fallback to English if key missing

### Build errors?
1. Ensure all JSON files are valid
2. Check for missing commas in translation files
3. Run `npm run build` to verify

---

## 📚 Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- Translation files: `user-client/src/i18n/locales/`

---

## 🎉 Next Steps

To complete i18n implementation:
1. Translate remaining components (DumpCard, SearchResultCard, etc.)
2. Add locale-aware date/time formatting
3. Add locale-aware number formatting
4. Consider adding language switcher in UI (beyond profile settings)
5. Add more languages as needed (French, German, Italian, etc.)
