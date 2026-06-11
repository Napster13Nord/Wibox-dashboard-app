import { TranslationMap } from '@/lib/types';

/**
 * Multilingual fuzzy search.
 *
 * Matches a query against an entity's original `name` AND every available
 * translation (en / sv / fi), regardless of the currently active locale.
 * So a user can type "kyckling", "kana" or "chicken" and find the same dish.
 *
 * Matching is fuzzy: it accepts exact substrings, typo-tolerant subsequences
 * (e.g. "choclt" → "chocolate") and is diacritic-insensitive (å/ä/ö, etc.).
 */

export type Searchable = {
  name: string;
  translations?: TranslationMap;
};

/** lowercase + strip accents so "Crème" matches "creme" and "Glögg" matches "glogg". */
const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/**
 * Score a single normalized query token against a single normalized target.
 * Returns a score in [0, 1], or -1 when the token cannot be found at all.
 */
const tokenScore = (query: string, target: string): number => {
  if (!query) return 1;
  if (!target) return -1;

  // Exact substring → strongest. Favor matches near the start.
  const idx = target.indexOf(query);
  if (idx !== -1) {
    return 1 - (idx / (target.length + 1)) * 0.3;
  }

  // Fuzzy subsequence: every query char must appear in order. Reward runs of
  // consecutive matches so "choc" scores higher than scattered letters.
  let qi = 0;
  let run = 0;
  let raw = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) {
      qi++;
      run++;
      raw += run;
    } else {
      run = 0;
    }
  }
  if (qi < query.length) return -1; // not all chars matched

  // Keep fuzzy scores strictly below substring matches (cap at 0.7).
  return Math.min(0.7, raw / (query.length * query.length));
};

/**
 * Best match score for `query` against all of an entity's names/translations.
 * Multi-word queries require every word to match somewhere (e.g.
 * "choc cake" matches "Chocolate Cake"). Returns -1 when there is no match.
 */
export const fuzzyScore = (query: string, entity: Searchable): number => {
  const q = normalize(query);
  if (!q) return 1;

  const candidates = [
    entity.name,
    entity.translations?.en,
    entity.translations?.sv,
    entity.translations?.fi,
  ]
    .filter((s): s is string => !!s)
    .map(normalize);

  const tokens = q.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const token of tokens) {
    let best = -1;
    for (const c of candidates) {
      const s = tokenScore(token, c);
      if (s > best) best = s;
    }
    if (best < 0) return -1; // this word matched nothing → reject
    total += best;
  }
  return total / tokens.length;
};

/** Convenience boolean matcher. */
export const fuzzyMatch = (query: string, entity: Searchable): boolean =>
  !query.trim() || fuzzyScore(query, entity) >= 0;

/**
 * Filter + rank a list by relevance to the query. With no query, the original
 * order is preserved. With a query, only matches are kept, best-scored first.
 */
export const fuzzyFilter = <T extends Searchable>(items: T[], query: string): T[] => {
  if (!query.trim()) return items;
  return items
    .map((item) => ({ item, score: fuzzyScore(query, item) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
};
