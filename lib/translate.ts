import * as deepl from 'deepl-node';

const SUPPORTED_LANGS = ['en', 'sv', 'fi'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

// Map our locale codes to DeepL target language codes
const DEEPL_TARGET_MAP: Record<SupportedLang, deepl.TargetLanguageCode> = {
  en: 'en-GB',
  sv: 'sv',
  fi: 'fi',
};

// Map DeepL detected source language codes back to our locale codes
const DEEPL_SOURCE_REVERSE: Record<string, SupportedLang> = {
  EN: 'en',
  SV: 'sv',
  FI: 'fi',
};

/**
 * Translates a name into all supported languages using DeepL.
 * Auto-detects the source language if not provided.
 * Returns a map of { lang: translatedName } for ALL languages (including source).
 * Non-blocking: returns partial results on error.
 */
export async function translateName(
  name: string,
  sourceLang?: SupportedLang
): Promise<Record<string, string>> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.warn('[Wibox Translate] DEEPL_API_KEY not set, skipping translation');
    return {};
  }

  if (!name || !name.trim()) return {};

  const translator = new deepl.Translator(apiKey);
  const results: Record<string, string> = {};

  // If source language is known, store the original
  if (sourceLang) {
    results[sourceLang] = name;
  }

  // Determine target languages (all except source, if known)
  const targets = sourceLang
    ? SUPPORTED_LANGS.filter((l) => l !== sourceLang)
    : [...SUPPORTED_LANGS]; // translate to all if source unknown

  for (const targetLang of targets) {
    try {
      const result = await translator.translateText(
        name,
        sourceLang
          ? (DEEPL_TARGET_MAP[sourceLang] as unknown as deepl.SourceLanguageCode)
          : null,
        DEEPL_TARGET_MAP[targetLang]
      );

      results[targetLang] = result.text;

      // If source was unknown, try to detect it from the first translation
      if (!sourceLang && result.detectedSourceLang) {
        const detected =
          DEEPL_SOURCE_REVERSE[result.detectedSourceLang.toUpperCase()];
        if (detected) {
          sourceLang = detected;
          results[detected] = name;
        }
      }
    } catch (err) {
      console.error(
        `[Wibox Translate] Failed to translate "${name}" → ${targetLang}:`,
        err
      );
      // Non-blocking: continue with other languages
    }
  }

  // Filter out translations where DeepL returned the same text as input
  // (this means DeepL auto-detected it's already in that language)
  // but keep all results — better to have duplicates than missing data
  return results;
}

/**
 * Saves translation results to the translations table.
 * Uses upsert to handle both insert and update.
 */
export async function saveTranslations(
  sql: ReturnType<typeof import('@/lib/db').getSQL>,
  entityType: string,
  entityId: string,
  translations: Record<string, string>
) {
  for (const [lang, name] of Object.entries(translations)) {
    if (!name) continue;
    await sql`
      INSERT INTO translations (entity_type, entity_id, lang, name, updated_at)
      VALUES (${entityType}, ${entityId}, ${lang}, ${name}, now())
      ON CONFLICT (entity_type, entity_id, lang)
      DO UPDATE SET name = ${name}, updated_at = now()
    `;
  }
}

/**
 * Loads all translations for a given entity type.
 * Returns a map: { entityId: { en: '...', sv: '...', fi: '...' } }
 */
export async function loadTranslations(
  sql: ReturnType<typeof import('@/lib/db').getSQL>,
  entityType: string
): Promise<Record<string, Record<string, string>>> {
  const rows = await sql`
    SELECT entity_id, lang, name
    FROM translations
    WHERE entity_type = ${entityType}
  `;

  const result: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    const id = row.entity_id as string;
    if (!result[id]) result[id] = {};
    result[id][row.lang as string] = row.name as string;
  }
  return result;
}

/**
 * Translates a name and saves the results to the DB.
 * Fire-and-forget wrapper for use in POST/PATCH handlers.
 */
export async function translateAndSave(
  sql: ReturnType<typeof import('@/lib/db').getSQL>,
  entityType: string,
  entityId: string,
  name: string
) {
  try {
    const translations = await translateName(name);
    await saveTranslations(sql, entityType, entityId, translations);
    console.log(
      `[Wibox Translate] Translated "${name}" → ${JSON.stringify(translations)}`
    );
  } catch (err) {
    console.error(
      `[Wibox Translate] translateAndSave failed for ${entityType}/${entityId}:`,
      err
    );
  }
}
