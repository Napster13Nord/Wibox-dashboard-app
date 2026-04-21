"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  // Folder management
  addFolder: (type: 'recipe' | 'dish', folder: Folder) => void;
  updateFolder: (type: 'recipe' | 'dish', id: string, folder: Partial<Folder>) => void;
  deleteFolder: (type: 'recipe' | 'dish', id: string) => void;

  // Trash management
  restoreFromTrash: (id: string) => void;
  permanentlyDelete: (id: string) => void;
  emptyTrash: () => void;

  // Undo
  undo: () => void;
  canUndo: boolean;
};

// Minimal fallback used only when the server file AND localStorage are both empty
const defaultState: AppState = {
  ingredients: [],
  recipes: [],
  dishes: [],
  recipeFolders: [],
  dishFolders: [],
  trash: [],
};

// Ensures every object has all required fields regardless of when it was saved
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

const MAX_UNDO = 20;

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [history, setHistory] = useState<AppState[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // ── Load: server file → localStorage fallback → defaultState ──
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/data');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setState(migrateState(data));
            setIsLoaded(true);
            // Mark that initial load is done after a tick
            setTimeout(() => { isInitialLoadRef.current = false; }, 100);
            return;
          }
        }
      } catch {
        // server not reachable — fall through to localStorage
      }

      // localStorage fallback
      try {
        const saved = localStorage.getItem('wibox-data');
        if (saved) {
          setState(migrateState(JSON.parse(saved)));
        }
      } catch { /* ignore parse errors */ }

      setIsLoaded(true);
      setTimeout(() => { isInitialLoadRef.current = false; }, 100);
    };

    load();
  }, []);

  // ── Save: debounced write to SERVER + localStorage ──
  useEffect(() => {
    if (!isLoaded) return;
    // Skip the very first render after loading to avoid overwriting server data with stale state
    if (isInitialLoadRef.current) return;

    // Debounce saves to avoid rapid-fire writes
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Server-side save (shared across all devices)
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      }).catch(() => { /* silent fail — server unavailable */ });

      // Local cache (fast reload on same device)
      try {
        localStorage.setItem('wibox-data', JSON.stringify(state));
      } catch { /* ignore storage errors */ }
    }, 300);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, isLoaded]);

  // ── Push to undo history before any mutation ──
  const pushHistory = useCallback(() => {
    setHistory(prev => {
      const next = [...prev, state];
      if (next.length > MAX_UNDO) next.shift();
      return next;
    });
  }, [state]);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next.pop()!;
      setState(last);
      return next;
    });
  }, []);

  const canUndo = history.length > 0;

  // ── Ingredients ──
  const addIngredient = (ingredient: Ingredient) => {
    pushHistory();
    setState(s => ({ ...s, ingredients: [...s.ingredients, ingredient] }));
  };

  const updateIngredient = (id: string, ingredient: Partial<Ingredient>) => {
    pushHistory();
    setState(s => ({
      ...s,
      ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...ingredient } : i),
    }));
  };

  const deleteIngredient = (id: string) => {
    pushHistory();
    setState(s => {
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
    pushHistory();
    setState(s => ({ ...s, recipes: [...s.recipes, recipe] }));
  };

  const updateRecipe = (id: string, recipe: Partial<Recipe>) => {
    pushHistory();
    setState(s => ({
      ...s,
      recipes: s.recipes.map(r => r.id === id ? { ...r, ...recipe } : r),
    }));
  };

  const deleteRecipe = (id: string) => {
    pushHistory();
    setState(s => {
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
    pushHistory();
    setState(s => ({ ...s, dishes: [...s.dishes, dish] }));
  };

  const updateDish = (id: string, dish: Partial<Dish>) => {
    pushHistory();
    setState(s => ({
      ...s,
      dishes: s.dishes.map(d => d.id === id ? { ...d, ...dish } : d),
    }));
  };

  const deleteDish = (id: string) => {
    pushHistory();
    setState(s => {
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
    pushHistory();
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    setState(s => ({ ...s, [key]: [...(s[key] || []), folder] }));
  };

  const updateFolder = (type: 'recipe' | 'dish', id: string, folder: Partial<Folder>) => {
    pushHistory();
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    setState(s => ({
      ...s,
      [key]: (s[key] || []).map((f: Folder) => f.id === id ? { ...f, ...folder } : f),
    }));
  };

  const deleteFolder = (type: 'recipe' | 'dish', id: string) => {
    pushHistory();
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    const itemsKey = type === 'recipe' ? 'recipes' : 'dishes';
    setState(s => ({
      ...s,
      [key]: (s[key] || []).filter((f: Folder) => f.id !== id),
      // Unassign items from deleted folder
      [itemsKey]: (s[itemsKey] as any[]).map((item: any) =>
        item.folder === id ? { ...item, folder: '' } : item
      ),
    }));
  };

  // ── Trash ──
  const restoreFromTrash = (id: string) => {
    pushHistory();
    setState(s => {
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
    pushHistory();
    setState(s => ({ ...s, trash: s.trash.filter(t => t.id !== id) }));
  };

  const emptyTrash = () => {
    pushHistory();
    setState(s => ({ ...s, trash: [] }));
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
