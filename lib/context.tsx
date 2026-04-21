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

  undo: () => void;
  canUndo: boolean;
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

// ── Save function — called OUTSIDE of setState, never inside ──
function saveToServer(data: AppState) {
  fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(err => console.error('[Wibox] Server save failed:', err));
}

function saveToLocalStorage(data: AppState) {
  try {
    localStorage.setItem('wibox-data', JSON.stringify(data));
  } catch (err) {
    console.error('[Wibox] localStorage save failed:', err);
  }
}

function persist(data: AppState) {
  saveToServer(data);
  saveToLocalStorage(data);
}

const MAX_UNDO = 20;

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [history, setHistory] = useState<AppState[]>([]);

  // A ref that always holds the latest state — used so doUpdate can
  // read the current state synchronously without stale closures.
  const stateRef = useRef<AppState>(defaultState);

  // Keep ref in sync with state after every render
  stateRef.current = state;

  // ── Load on mount: server → localStorage fallback ──
  useEffect(() => {
    const load = async () => {
      let loaded = false;

      try {
        // cache: 'no-store' prevents Next.js and the browser from caching
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
      } catch {
        // server not reachable — fall through to localStorage
      }

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
  const doUpdate = (updater: (prev: AppState) => AppState) => {
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

    // Persist OUTSIDE of setState — guaranteed to execute
    persist(next);
  };

  // ── Undo ──
  const undo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next.pop()!;
      stateRef.current = last;
      setState(last);
      persist(last);
      return next;
    });
  };

  const canUndo = history.length > 0;

  // ── Ingredients ──
  const addIngredient = (ingredient: Ingredient) => {
    doUpdate(s => ({ ...s, ingredients: [...s.ingredients, ingredient] }));
  };

  const updateIngredient = (id: string, ingredient: Partial<Ingredient>) => {
    doUpdate(s => ({
      ...s,
      ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...ingredient } : i),
    }));
  };

  const deleteIngredient = (id: string) => {
    doUpdate(s => {
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
    });
  };

  // ── Recipes ──
  const addRecipe = (recipe: Recipe) => {
    doUpdate(s => ({ ...s, recipes: [...s.recipes, recipe] }));
  };

  const updateRecipe = (id: string, recipe: Partial<Recipe>) => {
    doUpdate(s => ({
      ...s,
      recipes: s.recipes.map(r => r.id === id ? { ...r, ...recipe } : r),
    }));
  };

  const deleteRecipe = (id: string) => {
    doUpdate(s => {
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
    });
  };

  // ── Dishes ──
  const addDish = (dish: Dish) => {
    doUpdate(s => ({ ...s, dishes: [...s.dishes, dish] }));
  };

  const updateDish = (id: string, dish: Partial<Dish>) => {
    doUpdate(s => ({
      ...s,
      dishes: s.dishes.map(d => d.id === id ? { ...d, ...dish } : d),
    }));
  };

  const deleteDish = (id: string) => {
    doUpdate(s => {
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
    });
  };

  // ── Folders ──
  const addFolder = (type: 'recipe' | 'dish', folder: Folder) => {
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    doUpdate(s => ({ ...s, [key]: [...(s[key] || []), folder] }));
  };

  const updateFolder = (type: 'recipe' | 'dish', id: string, folder: Partial<Folder>) => {
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    doUpdate(s => ({
      ...s,
      [key]: (s[key] || []).map((f: Folder) => f.id === id ? { ...f, ...folder } : f),
    }));
  };

  const deleteFolder = (type: 'recipe' | 'dish', id: string) => {
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    const itemsKey = type === 'recipe' ? 'recipes' : 'dishes';
    doUpdate(s => ({
      ...s,
      [key]: (s[key] || []).filter((f: Folder) => f.id !== id),
      [itemsKey]: (s[itemsKey] as any[]).map((item: any) =>
        item.folder === id ? { ...item, folder: '' } : item
      ),
    }));
  };

  // ── Trash ──
  const restoreFromTrash = (id: string) => {
    doUpdate(s => {
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
    });
  };

  const permanentlyDelete = (id: string) => {
    doUpdate(s => ({ ...s, trash: s.trash.filter(t => t.id !== id) }));
  };

  const emptyTrash = () => {
    doUpdate(s => ({ ...s, trash: [] }));
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
      undo, canUndo,
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
