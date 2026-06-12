import { describe, it, expect } from 'vitest';
import { fuzzyScore, fuzzyMatch, fuzzyFilter, Searchable } from './fuzzySearch';

const chocolateCake: Searchable = {
  name: 'Chocolate Cake',
  translations: { en: 'Chocolate Cake', sv: 'Chokladtårta', fi: 'Suklaakakku' },
};

const glogg: Searchable = {
  name: 'Glögg',
  translations: { en: 'Mulled Wine', sv: 'Glögg', fi: 'Glögi' },
};

const chicken: Searchable = {
  name: 'Chicken',
  translations: { en: 'Chicken', sv: 'Kyckling', fi: 'Kana' },
};

describe('fuzzyScore', () => {
  it('folds diacritics so "glogg" matches "Glögg"', () => {
    expect(fuzzyScore('glogg', glogg)).toBeGreaterThan(0);
  });

  it('matches across languages — EN query finds an entity by its SV/FI name', () => {
    // Search in Finnish for the chicken whose primary name is English.
    expect(fuzzyMatch('kana', chicken)).toBe(true);
    expect(fuzzyMatch('kyckling', chicken)).toBe(true);
  });

  it('requires every word of a multi-word query to match (AND semantics)', () => {
    expect(fuzzyMatch('choc cake', chocolateCake)).toBe(true);
    // "choc" matches but "zzz" matches nothing → whole query rejected
    expect(fuzzyMatch('choc zzz', chocolateCake)).toBe(false);
  });

  it('tolerates subsequence typos like "choclt" → "chocolate"', () => {
    expect(fuzzyMatch('choclt', chocolateCake)).toBe(true);
  });

  it('rejects a query whose characters are not a subsequence of any name', () => {
    expect(fuzzyScore('xyz', chocolateCake)).toBe(-1);
    expect(fuzzyMatch('xyz', chocolateCake)).toBe(false);
  });

  it('scores an exact substring higher than a scattered fuzzy match', () => {
    const exact = fuzzyScore('choc', chocolateCake); // substring at index 0
    const fuzzy = fuzzyScore('ccke', chocolateCake); // subsequence only
    expect(exact).toBeGreaterThan(fuzzy);
  });

  it('returns 1 for an empty query', () => {
    expect(fuzzyScore('', chocolateCake)).toBe(1);
    expect(fuzzyScore('   ', chocolateCake)).toBe(1);
  });
});

describe('fuzzyFilter', () => {
  const items = [chocolateCake, glogg, chicken];

  it('returns the original list (same order) for an empty query', () => {
    expect(fuzzyFilter(items, '')).toEqual(items);
    expect(fuzzyFilter(items, '   ')).toEqual(items);
  });

  it('keeps only matching items', () => {
    const result = fuzzyFilter(items, 'kana');
    expect(result).toEqual([chicken]);
  });

  it('ranks a stronger (substring) match ahead of a weaker (fuzzy) one', () => {
    const cakeish: Searchable = { name: 'Carrot Cake' }; // contains "cake"
    const list = [chicken, cakeish, chocolateCake];
    const result = fuzzyFilter(list, 'cake');
    // chicken has no "cake" at all → excluded; both cakes ranked first.
    expect(result).not.toContain(chicken);
    expect(result.length).toBe(2);
    expect(result[0]).toBe(cakeish); // exact substring "cake" at a lower index ranks first
  });

  it('matches an entity with no translations by its name alone', () => {
    const plain: Searchable = { name: 'Sourdough' };
    expect(fuzzyFilter([plain], 'sour')).toEqual([plain]);
    expect(fuzzyFilter([plain], 'pizza')).toEqual([]);
  });
});
