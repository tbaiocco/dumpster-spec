# Translation Service

AI-powered translation service for multi-language support across the application.

## Overview

The `TranslationService` uses Claude AI to provide natural, context-aware translations for user-facing content. It includes caching to optimize performance and reduce API calls.

## Features

- ✅ **Natural translations** using Claude AI
- ✅ **Caching system** to avoid redundant API calls
- ✅ **Batch translation** for efficiency
- ✅ **Context-aware** translations for better accuracy
- ✅ **Automatic fallback** to original text if translation fails
- ✅ **Preserves formatting** (emojis, special characters)

## Usage

### Basic Translation

```typescript
const result = await translationService.translate({
  text: 'Hello, how are you?',
  targetLanguage: 'pt', // Portuguese
  sourceLanguage: 'en', // Optional, defaults to 'en'
  context: 'Greeting message', // Optional context for better translation
});

console.log(result.translatedText); // "Olá, como você está?"
```

### Batch Translation

More efficient for translating multiple texts:

```typescript
const texts = [
  'Daily Digest',
  'Summary',
  'Total items',
  'Pending reminders',
];

const translations = await translationService.translateBatch(
  texts,
  'pt', // Target language
  'en'  // Source language (optional)
);

// Returns: ['Resumo Diário', 'Resumo', 'Total de itens', 'Lembretes pendentes']
```

### Integration Example (DigestService)

```typescript
async formatDigestAsText(digest: DigestContent): Promise<string> {
  const user = await this.userRepository.findOne({
    where: { id: digest.userId },
  });

  const language = user?.language || 'en';

  // Translate labels
  const labels = await this.translateLabels(language);

  // Translate dynamic content
  const translatedTitle = await this.translationService.translate({
    text: item.title,
    targetLanguage: language,
    context: 'Digest item title',
  });

  return formattedText;
}
```

## Supported Languages

The service supports any language code recognized by Claude AI. Common examples:

| Code | Language |
|------|----------|
| `en` | English |
| `pt` | Portuguese |
| `pt-BR` | Portuguese (Brazil) |
| `pt-PT` | Portuguese (Portugal) |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `it` | Italian |
| `ja` | Japanese |
| `zh` | Chinese |
| `ko` | Korean |
| `ar` | Arabic |
| `ru` | Russian |
| `hi` | Hindi |

## Caching

The service includes an intelligent caching system:

- Caches up to 1,000 translations
- Uses LRU (Least Recently Used) eviction
- Cache key: `{language}:{first100chars}`
- Automatic cache when translating to English (no API call)

### Cache Management

```typescript
// Get cache statistics
const stats = translationService.getCacheStats();
console.log(`Cache size: ${stats.size}/${stats.maxSize}`);

// Clear cache manually
translationService.clearCache();
```

## Translation Quality

The service is optimized for:

1. **Natural language** - Uses native-speaker level translations
2. **Technical accuracy** - Preserves technical terms
3. **Tone preservation** - Maintains original style and formality
4. **Formatting** - Keeps emojis, bullet points, etc.

## Performance Optimization

### When to use batch translation:

```typescript
// ❌ Slow: Multiple individual calls
for (const text of texts) {
  await translationService.translate({ text, targetLanguage: 'pt' });
}

// ✅ Fast: Single batch call
const translations = await translationService.translateBatch(texts, 'pt');
```

### Cache hits avoid API calls:

```typescript
// First call: API request (slow)
await translationService.translate({ text: 'Hello', targetLanguage: 'pt' });

// Second call: Cached (instant)
await translationService.translate({ text: 'Hello', targetLanguage: 'pt' });
```

## Error Handling

The service gracefully handles errors:

```typescript
try {
  const result = await translationService.translate({
    text: 'Hello',
    targetLanguage: 'invalid-lang',
  });
  
  // If translation fails, returns original text
  console.log(result.translatedText); // "Hello"
} catch (error) {
  // Service logs errors but doesn't throw
}
```

## Current Integrations

### DigestService

- Translates all digest content:
  - Static labels (Daily Digest, Summary, etc.)
  - Section titles
  - Item titles and summaries
  - Recommendations
- Respects user's `language` field in database
- Uses batch translation for efficiency

### Future Integrations

Planned integrations:
- Email notifications
- WhatsApp messages
- Telegram messages
- Push notifications
- Admin dashboard UI

## Testing

### Update user language:

```bash
curl -X PATCH http://localhost:3000/users/YOUR_USER_ID \
  -H "Content-Type: application/json" \
  -d '{"language": "pt"}'
```

### Test translation in digest:

```bash
# Trigger digest with Portuguese translation
curl -X POST http://localhost:3000/test/notifications/digest/morning/YOUR_USER_ID
```

### Example output (Portuguese):

```
═══════════════════════════════════
📬 Resumo Diário - segunda-feira, 25 de novembro de 2025
═══════════════════════════════════

📊 Resumo:
   • Total de itens: 5
   • Lembretes pendentes: 3

📅 Lembretes de Hoje
───────────────────────────────────
🔴 Reunião com a equipe
   Agendado para 15:30

💡 Recomendações:
   • Bom dia! Aqui está o que você tem para hoje.
   • Você tem muitos lembretes hoje. Priorize o que é mais importante.

═══════════════════════════════════
```

## Configuration

The service uses Claude AI through the existing `ClaudeService`:

```typescript
// Located in: src/modules/ai/translation.service.ts
constructor(private readonly claudeService: ClaudeService) {}

// Uses queryWithCustomPrompt method
const result = await this.claudeService.queryWithCustomPrompt(prompt);
```

No additional configuration needed - uses the same Claude API key configured for the application.

## API Reference

### `translate(request: TranslationRequest): Promise<TranslationResult>`

Translate a single text to target language.

**Parameters:**
- `text`: Text to translate
- `targetLanguage`: Target language code
- `sourceLanguage`: Source language code (optional, default: 'en')
- `context`: Additional context for better translation (optional)

**Returns:**
- `translatedText`: Translated text
- `detectedSourceLanguage`: Detected or provided source language

### `translateBatch(texts: string[], targetLanguage: string, sourceLanguage?: string): Promise<string[]>`

Translate multiple texts efficiently.

**Parameters:**
- `texts`: Array of texts to translate
- `targetLanguage`: Target language code
- `sourceLanguage`: Source language code (optional, default: 'en')

**Returns:**
- Array of translated texts (same order as input)

### `clearCache(): void`

Clear the translation cache.

### `getCacheStats(): { size: number; maxSize: number }`

Get cache statistics.

### `getLanguageName(languageCode: string): string`

Get human-readable language name from code.

```typescript
const name = translationService.getLanguageName('pt');
console.log(name); // "Portuguese"
```

## Best Practices

1. **Use batch translation** when translating multiple texts
2. **Provide context** for better translation accuracy
3. **Cache is automatic** - no need to manage it manually
4. **Translations are asynchronous** - always await
5. **Errors are handled gracefully** - original text returned on failure
6. **English is free** - no API calls for English translations

## Troubleshooting

### Translations are slow

- Use `translateBatch()` instead of multiple `translate()` calls
- Check if caching is working (cache stats should grow)
- Verify Claude API is responding (check logs)

### Translations are incorrect

- Add more context in the `context` parameter
- Verify the language code is correct
- Check Claude service configuration

### Cache not working

- Verify translations use exact same text
- Check cache size hasn't exceeded 1,000 items
- Clear and rebuild cache if needed

## Logs

The service provides detailed logging:

```
[TranslationService] Translating text to pt
[TranslationService] Using cached translation for language: pt
[TranslationService] Batch translating 6 texts to pt
[TranslationService] Translation failed for language invalid-lang: ...
```

Debug level logs for cache hits, standard logs for API calls, errors for failures.
