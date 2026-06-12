import { Ingredient, Recipe, Dish, Folder, TrashedItem } from './types';
import { DEFAULT_VAT_RATE } from './constants';

/** The whole client-side app state, as held by AppProvider. */
export type AppState = {
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
  recipeFolders: Folder[];
  dishFolders: Folder[];
  trash: TrashedItem[];
};

export const defaultState: AppState = {
  ingredients: [],
  recipes: [],
  dishes: [],
  recipeFolders: [],
  dishFolders: [],
  trash: [],
};

/**
 * Shape of state read from older caches / the legacy blob. Fields that
 * `migrateState` backfills with defaults are optional on the raw input.
 * `hiddenCosts` is a legacy column the current Recipe type no longer carries
 * (see app/api/db/migrate/route.ts) — kept defaulted for the sync routes.
 */
type RawEntity<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type RawState = {
  ingredients?: RawEntity<Ingredient, 'priceType' | 'supplier' | 'lastUpdate'>[];
  recipes?: (RawEntity<Recipe, 'presets' | 'folder'> & { hiddenCosts?: number })[];
  dishes?: RawEntity<Dish, 'directIngredients' | 'portions' | 'priceIncludesVat' | 'folder' | 'vatRate'>[];
  recipeFolders?: Folder[];
  dishFolders?: Folder[];
  trash?: TrashedItem[];
};

export const migrateState = (raw: RawState): AppState => ({
  ingredients: (raw.ingredients || []).map(i => ({
    priceType: 'perKg' as const,
    supplier: '',
    lastUpdate: '',
    ...i,
  })),
  recipes: (raw.recipes || []).map(r => ({
    presets: [],
    folder: '',
    hiddenCosts: 0,
    ...r,
  })),
  dishes: (raw.dishes || []).map(d => ({
    directIngredients: [],
    portions: 1,
    priceIncludesVat: false,
    folder: '',
    vatRate: DEFAULT_VAT_RATE,
    ...d,
  })),
  recipeFolders: raw.recipeFolders || [],
  dishFolders: raw.dishFolders || [],
  trash: raw.trash || [],
});

// ── API helpers — async, throw on failure so callers can surface it ──

export async function apiPost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed (${res.status})`);
}

export async function apiPatch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${url} failed (${res.status})`);
}

export async function apiDelete(url: string) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${url} failed (${res.status})`);
}

export async function apiPatchTranslation(entityType: string, entityId: string, translations: Record<string, string>) {
  const res = await fetch('/api/translate', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType, entityId, translations }),
  });
  if (!res.ok) throw new Error(`PATCH /api/translate failed (${res.status})`);
}

export async function syncFullState(data: AppState) {
  const res = await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Full state sync failed (${res.status})`);
}

/** Immutably patch the item with the given id inside a typed array. */
export function patchById<T extends { id: string }>(items: T[], id: string, patch: Partial<T>): T[] {
  return items.map(item => (item.id === id ? { ...item, ...patch } : item));
}

/** Read the current dashboard locale from localStorage. */
export function getLocale(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('wibox-locale') || 'en';
  }
  return 'en';
}

export function saveToLocalStorage(data: AppState) {
  try {
    localStorage.setItem('wibox-data', JSON.stringify(data));
  } catch (err) {
    console.error('[Wibox] localStorage save failed:', err);
  }
}

/**
 * Synchronously read a previously-cached state from localStorage (client only).
 * Used to seed the app on boot so a returning user sees their data instantly —
 * the skeleton then only appears on the very first login, when no cache exists.
 * Returns null on the server, when there's no cache, or when it's corrupt.
 */
export function readCachedState(): AppState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('wibox-data');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object') return migrateState(parsed);
  } catch { /* ignore corrupt cache */ }
  return null;
}
