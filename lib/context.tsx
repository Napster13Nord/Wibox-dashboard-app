"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Ingredient, Recipe, Dish, Folder, TrashedItem } from './types';

type AppState = {
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
  recipeFolders: Folder[];
  dishFolders: Folder[];
  trash: TrashedItem[];
};

type AppContextType = {
  state: AppState;
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;

  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;

  addDish: (dish: Dish) => void;
  updateDish: (id: string, dish: Partial<Dish>) => void;
  deleteDish: (id: string) => void;

  addFolder: (type: 'recipe' | 'dish', folder: Folder) => void;
  updateFolder: (type: 'recipe' | 'dish', id: string, folder: Partial<Folder>) => void;
  deleteFolder: (type: 'recipe' | 'dish', id: string) => void;

  restoreFromTrash: (id: string) => void;
  permanentlyDelete: (id: string) => void;
  emptyTrash: () => void;

  updateTranslations: (entityType: 'ingredient' | 'recipe' | 'dish' | 'folder', entityId: string, translations: Record<string, string>) => void;

  undo: () => void;
  canUndo: boolean;

  // ── Server sync status ──
  syncError: boolean;       // true when a write to the server failed
  isSyncing: boolean;       // true while a manual re-sync is in flight
  retrySync: () => void;    // push the full local state to the server again
};

const defaultState: AppState = {
  ingredients: [],
  recipes: [],
  dishes: [],
  recipeFolders: [],
  dishFolders: [],
  trash: [],
};

const migrateState = (raw: any): AppState => ({
  ingredients: (raw.ingredients || []).map((i: any) => ({
    priceType: 'perKg',
    supplier: '',
    lastUpdate: '',
    ...i,
  })),
  recipes: (raw.recipes || []).map((r: any) => ({
    presets: [],
    folder: '',
    hiddenCosts: 0,
    ...r,
  })),
  dishes: (raw.dishes || []).map((d: any) => ({
    directIngredients: [],
    portions: 1,
    priceIncludesVat: false,
    folder: '',
    vatRate: 13.5,
    ...d,
  })),
  recipeFolders: raw.recipeFolders || [],
  dishFolders: raw.dishFolders || [],
  trash: raw.trash || [],
});

// ── API helpers — async, throw on failure so callers can surface it ──

async function apiPost(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed (${res.status})`);
}

async function apiPatch(url: string, body: any) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${url} failed (${res.status})`);
}

async function apiDelete(url: string) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${url} failed (${res.status})`);
}

async function apiPatchTranslation(entityType: string, entityId: string, translations: Record<string, string>) {
  const res = await fetch('/api/translate', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType, entityId, translations }),
  });
  if (!res.ok) throw new Error(`PATCH /api/translate failed (${res.status})`);
}

/** Read the current dashboard locale from localStorage */
function getLocale(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('wibox-locale') || 'en';
  }
  return 'en';
}

/**
 * Auto-translate an entity name and return the translations.
 * Uses the PUT /api/translate endpoint which translates synchronously.
 */
async function autoTranslateEntity(
  entityType: string,
  entityId: string,
  name: string,
  sourceLang: string
): Promise<Record<string, string> | null> {
  try {
    const res = await fetch('/api/translate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, name, sourceLang }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.translations) {
        return data.translations;
      }
    }
  } catch (err) {
    console.error(`[Wibox] Auto-translate failed for ${entityType}/${entityId}:`, err);
  }
  return null;
}

async function syncFullState(data: AppState) {
  const res = await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Full state sync failed (${res.status})`);
}

function saveToLocalStorage(data: AppState) {
  try {
    localStorage.setItem('wibox-data', JSON.stringify(data));
  } catch (err) {
    console.error('[Wibox] localStorage save failed:', err);
  }
}

const MAX_UNDO = 20;

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [history, setHistory] = useState<AppState[]>([]);
  const [syncError, setSyncError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Watch a critical save promise; flag a visible sync error if it rejects.
  const track = (p: Promise<unknown> | void) => {
    if (!p || typeof (p as Promise<unknown>).then !== 'function') return;
    (p as Promise<unknown>).catch((err: unknown) => {
      console.error('[Wibox] save to server failed:', err);
      setSyncError(true);
    });
  };

  // A ref that always holds the latest state — used so doUpdate can
  // read the current state synchronously without stale closures.
  const stateRef = useRef<AppState>(defaultState);

  // Keep ref in sync with state after every render
  stateRef.current = state;

  // ── Load on mount: normalized tables → localStorage fallback ──
  useEffect(() => {
    const load = async () => {
      let loaded = false;

      try {
        // Try the new normalized endpoint first
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && (data.ingredients || data.recipes || data.dishes)) {
            const migrated = migrateState(data);
            setState(migrated);
            stateRef.current = migrated;
            loaded = true;
          }
        }
      } catch {
        // normalized endpoint not available — try legacy
      }

      // Fallback: try legacy blob endpoint
      if (!loaded) {
        try {
          const res = await fetch('/api/data', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object' && (data.ingredients || data.recipes || data.dishes)) {
              const migrated = migrateState(data);
              setState(migrated);
              stateRef.current = migrated;
              loaded = true;
            }
          }
        } catch { /* ignore */ }
      }

      // Last fallback: localStorage
      if (!loaded) {
        try {
          const saved = localStorage.getItem('wibox-data');
          if (saved) {
            const parsed = JSON.parse(saved);
            const migrated = migrateState(parsed);
            setState(migrated);
            stateRef.current = migrated;
          }
        } catch { /* ignore */ }
      }

      setIsLoaded(true);
    };

    load();
  }, []);

  // ── Core update helper — computes new state, persists it, then sets it ──
  // apiAction: optional callback for the granular API call. If it returns a
  // promise, we track it so a failed server write surfaces a visible error.
  const doUpdate = (updater: (prev: AppState) => AppState, apiAction?: () => Promise<unknown> | void) => {
    // Read current state from ref (always fresh, no stale closures)
    const prev = stateRef.current;

    // Push to undo history
    setHistory(h => {
      const next = [...h, prev];
      if (next.length > MAX_UNDO) next.shift();
      return next;
    });

    // Compute new state
    const next = updater(prev);

    // Update ref immediately so rapid successive calls see each other's results
    stateRef.current = next;

    // Update React state (triggers re-render)
    setState(next);

    // Save to localStorage immediately (for undo/offline resilience)
    saveToLocalStorage(next);

    // Fire the granular API call (non-blocking) and track its outcome
    if (apiAction) {
      track(apiAction());
    }
  };

  // ── Undo ──
  const undo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next.pop()!;
      stateRef.current = last;
      setState(last);
      saveToLocalStorage(last);
      // Full state sync for undo — ensures DB matches
      track(syncFullState(last));
      return next;
    });
  };

  const canUndo = history.length > 0;

  // ── Manual re-sync: push the whole local state to the server again ──
  // Used to recover after a failed write — local state is the source of truth.
  const retrySync = () => {
    setIsSyncing(true);
    syncFullState(stateRef.current)
      .then(() => setSyncError(false))
      .catch((err: unknown) => console.error('[Wibox] manual re-sync failed:', err))
      .finally(() => setIsSyncing(false));
  };

  // ── Ingredients ──
  const addIngredient = (ingredient: Ingredient) => {
    const sourceLang = getLocale();
    doUpdate(
      s => ({ ...s, ingredients: [...s.ingredients, ingredient] }),
      () => {
        // Auto-translate is best-effort and feeds results back to state (not tracked)
        autoTranslateEntity('ingredient', ingredient.id, ingredient.name, sourceLang)
          .then(translations => {
            if (translations) {
              // Update local state with translations (no undo entry needed)
              const current = stateRef.current;
              const updated = {
                ...current,
                ingredients: current.ingredients.map(i =>
                  i.id === ingredient.id ? { ...i, translations } : i
                ),
              };
              stateRef.current = updated;
              setState(updated);
              saveToLocalStorage(updated);
            }
          });
        return apiPost('/api/ingredients', { ...ingredient, sourceLang });
      },
    );
  };

  const updateIngredient = (id: string, ingredient: Partial<Ingredient>) => {
    doUpdate(
      s => ({
        ...s,
        ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...ingredient } : i),
      }),
      () => apiPatch('/api/ingredients', { id, ...ingredient }),
    );
  };

  const deleteIngredient = (id: string) => {
    doUpdate(
      s => {
        const item = s.ingredients.find(i => i.id === id);
        return {
          ...s,
          ingredients: s.ingredients.filter(i => i.id !== id),
          trash: item ? [...s.trash, {
            id: Date.now().toString(),
            originalType: 'ingredient' as const,
            data: item,
            deletedAt: new Date().toISOString(),
          }] : s.trash,
        };
      },
      () => apiDelete(`/api/ingredients?id=${id}`),
    );
  };

  // ── Recipes ──
  const addRecipe = (recipe: Recipe) => {
    const sourceLang = getLocale();
    doUpdate(
      s => ({ ...s, recipes: [...s.recipes, recipe] }),
      () => {
        // Auto-translate is best-effort and feeds results back to state (not tracked)
        autoTranslateEntity('recipe', recipe.id, recipe.name, sourceLang)
          .then(translations => {
            if (translations) {
              const current = stateRef.current;
              const updated = {
                ...current,
                recipes: current.recipes.map(r =>
                  r.id === recipe.id ? { ...r, translations } : r
                ),
              };
              stateRef.current = updated;
              setState(updated);
              saveToLocalStorage(updated);
            }
          });
        return apiPost('/api/recipes', { ...recipe, sourceLang });
      },
    );
  };

  const updateRecipe = (id: string, recipe: Partial<Recipe>) => {
    doUpdate(
      s => ({
        ...s,
        recipes: s.recipes.map(r => r.id === id ? { ...r, ...recipe } : r),
      }),
      () => apiPatch('/api/recipes', { id, ...recipe }),
    );
  };

  const deleteRecipe = (id: string) => {
    doUpdate(
      s => {
        const item = s.recipes.find(r => r.id === id);
        return {
          ...s,
          recipes: s.recipes.filter(r => r.id !== id),
          trash: item ? [...s.trash, {
            id: Date.now().toString(),
            originalType: 'recipe' as const,
            data: item,
            deletedAt: new Date().toISOString(),
          }] : s.trash,
        };
      },
      () => apiDelete(`/api/recipes?id=${id}`),
    );
  };

  // ── Dishes ──
  const addDish = (dish: Dish) => {
    const sourceLang = getLocale();
    doUpdate(
      s => ({ ...s, dishes: [...s.dishes, dish] }),
      () => {
        // Auto-translate is best-effort and feeds results back to state (not tracked)
        autoTranslateEntity('dish', dish.id, dish.name, sourceLang)
          .then(translations => {
            if (translations) {
              const current = stateRef.current;
              const updated = {
                ...current,
                dishes: current.dishes.map(d =>
                  d.id === dish.id ? { ...d, translations } : d
                ),
              };
              stateRef.current = updated;
              setState(updated);
              saveToLocalStorage(updated);
            }
          });
        return apiPost('/api/dishes', { ...dish, sourceLang });
      },
    );
  };

  const updateDish = (id: string, dish: Partial<Dish>) => {
    doUpdate(
      s => ({
        ...s,
        dishes: s.dishes.map(d => d.id === id ? { ...d, ...dish } : d),
      }),
      () => apiPatch('/api/dishes', { id, ...dish }),
    );
  };

  const deleteDish = (id: string) => {
    doUpdate(
      s => {
        const item = s.dishes.find(d => d.id === id);
        return {
          ...s,
          dishes: s.dishes.filter(d => d.id !== id),
          trash: item ? [...s.trash, {
            id: Date.now().toString(),
            originalType: 'dish' as const,
            data: item,
            deletedAt: new Date().toISOString(),
          }] : s.trash,
        };
      },
      () => apiDelete(`/api/dishes?id=${id}`),
    );
  };

  // ── Folders ──
  const addFolder = (type: 'recipe' | 'dish', folder: Folder) => {
    const sourceLang = getLocale();
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    doUpdate(
      s => ({ ...s, [key]: [...(s[key] || []), folder] }),
      () => {
        // Auto-translate folder name (best-effort, not tracked)
        autoTranslateEntity('folder', folder.id, folder.name, sourceLang)
          .then(translations => {
            if (translations) {
              const current = stateRef.current;
              const updated = {
                ...current,
                [key]: (current[key] || []).map((f: Folder) =>
                  f.id === folder.id ? { ...f, translations } : f
                ),
              };
              stateRef.current = updated;
              setState(updated);
              saveToLocalStorage(updated);
            }
          });
        return apiPost('/api/folders', { type, sourceLang, ...folder });
      },
    );
  };

  const updateFolder = (type: 'recipe' | 'dish', id: string, folder: Partial<Folder>) => {
    const sourceLang = getLocale();
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    // Snapshot the existing folder's raw name BEFORE any state mutations
    const existing = stateRef.current[key]?.find((f: Folder) => f.id === id);
    const existingName = existing?.name;
    const nameChanged = folder.name !== undefined && !!existingName && existingName !== folder.name;
    doUpdate(
      s => ({
        ...s,
        [key]: (s[key] || []).map((f: Folder) => f.id === id ? { ...f, ...folder } : f),
      }),
      () => {
        // Re-translate if name changed (best-effort, not tracked)
        if (nameChanged && folder.name) {
          autoTranslateEntity('folder', id, folder.name, sourceLang)
            .then(translations => {
              if (translations) {
                const current = stateRef.current;
                const updated = {
                  ...current,
                  [key]: (current[key] || []).map((f: Folder) =>
                    f.id === id ? { ...f, translations } : f
                  ),
                };
                stateRef.current = updated;
                setState(updated);
                saveToLocalStorage(updated);
              }
            });
        }
        return apiPatch('/api/folders', { id, sourceLang, ...folder });
      },
    );
  };

  const deleteFolder = (type: 'recipe' | 'dish', id: string) => {
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    const itemsKey = type === 'recipe' ? 'recipes' : 'dishes';
    doUpdate(
      s => ({
        ...s,
        [key]: (s[key] || []).filter((f: Folder) => f.id !== id),
        [itemsKey]: (s[itemsKey] as any[]).map((item: any) =>
          item.folder === id ? { ...item, folder: '' } : item
        ),
      }),
      () => apiDelete(`/api/folders?id=${id}&type=${type}`),
    );
  };

  // ── Trash ──
  const restoreFromTrash = (id: string) => {
    doUpdate(
      s => {
        const trashItem = s.trash.find(t => t.id === id);
        if (!trashItem) return s;
        const newState = { ...s, trash: s.trash.filter(t => t.id !== id) };
        switch (trashItem.originalType) {
          case 'ingredient':
            newState.ingredients = [...newState.ingredients, trashItem.data as Ingredient];
            break;
          case 'recipe':
            newState.recipes = [...newState.recipes, trashItem.data as Recipe];
            break;
          case 'dish':
            newState.dishes = [...newState.dishes, trashItem.data as Dish];
            break;
        }
        return newState;
      },
      () => {
        // Find the trash item to get the entity details
        const trashItem = stateRef.current.trash.find(t => t.id === id) ||
          // Item was just restored, check previous state
          history[history.length - 1]?.trash.find(t => t.id === id);
        if (trashItem) {
          return apiPost('/api/trash', {
            entityType: trashItem.originalType,
            entityId: trashItem.data.id,
          });
        }
      },
    );
  };

  const permanentlyDelete = (id: string) => {
    const trashItem = stateRef.current.trash.find(t => t.id === id);
    doUpdate(
      s => ({ ...s, trash: s.trash.filter(t => t.id !== id) }),
      () => {
        if (trashItem) {
          return apiDelete(`/api/trash?entityType=${trashItem.originalType}&entityId=${trashItem.data.id}`);
        }
      },
    );
  };

  const emptyTrash = () => {
    doUpdate(
      s => ({ ...s, trash: [] }),
      () => apiDelete('/api/trash?all=true'),
    );
  };

  // ── Translation editing ──
  const updateTranslations = (
    entityType: 'ingredient' | 'recipe' | 'dish' | 'folder',
    entityId: string,
    translations: Record<string, string>
  ) => {
    let key: keyof AppState;
    if (entityType === 'folder') {
      // Folders: search both recipeFolders and dishFolders
      const inRecipe = stateRef.current.recipeFolders.some((f: Folder) => f.id === entityId);
      key = inRecipe ? 'recipeFolders' : 'dishFolders';
    } else {
      key = entityType === 'ingredient' ? 'ingredients'
            : entityType === 'recipe' ? 'recipes'
            : 'dishes';
    }
    doUpdate(
      s => ({
        ...s,
        [key]: (s[key] as any[]).map((item: any) =>
          item.id === entityId ? { ...item, translations } : item
        ),
      }),
      () => apiPatchTranslation(entityType, entityId, translations),
    );
  };

  if (!isLoaded) return null;

  return (
    <AppContext.Provider value={{
      state,
      addIngredient, updateIngredient, deleteIngredient,
      addRecipe, updateRecipe, deleteRecipe,
      addDish, updateDish, deleteDish,
      addFolder, updateFolder, deleteFolder,
      restoreFromTrash, permanentlyDelete, emptyTrash,
      updateTranslations,
      undo, canUndo,
      syncError, isSyncing, retrySync,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
