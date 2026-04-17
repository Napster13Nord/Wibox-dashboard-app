"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Ingredient, Recipe, Dish } from './types';

type AppState = {
  ingredients: Ingredient[];
  recipes: Recipe[];
  dishes: Dish[];
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
};

// Minimal fallback used only when the server file AND localStorage are both empty
const defaultState: AppState = {
  ingredients: [],
  recipes: [],
  dishes: [],
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
    ...r,
  })),
  dishes: (raw.dishes || []).map((d: any) => ({
    directIngredients: [],
    portions: 1,
    priceIncludesVat: false,
    ...d,
  })),
});

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

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
    };

    load();
  }, []);

  // ── Save: write to SERVER (all devices share this) + localStorage cache ──
  useEffect(() => {
    if (!isLoaded) return;

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
  }, [state, isLoaded]);

  const addIngredient = (ingredient: Ingredient) => {
    setState(s => ({ ...s, ingredients: [...s.ingredients, ingredient] }));
  };

  const updateIngredient = (id: string, ingredient: Partial<Ingredient>) => {
    setState(s => ({
      ...s,
      ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...ingredient } : i),
    }));
  };

  const deleteIngredient = (id: string) => {
    setState(s => ({
      ...s,
      ingredients: s.ingredients.filter(i => i.id !== id),
    }));
  };

  const addRecipe = (recipe: Recipe) => {
    setState(s => ({ ...s, recipes: [...s.recipes, recipe] }));
  };

  const updateRecipe = (id: string, recipe: Partial<Recipe>) => {
    setState(s => ({
      ...s,
      recipes: s.recipes.map(r => r.id === id ? { ...r, ...recipe } : r),
    }));
  };

  const deleteRecipe = (id: string) => {
    setState(s => ({
      ...s,
      recipes: s.recipes.filter(r => r.id !== id),
    }));
  };

  const addDish = (dish: Dish) => {
    setState(s => ({ ...s, dishes: [...s.dishes, dish] }));
  };

  const updateDish = (id: string, dish: Partial<Dish>) => {
    setState(s => ({
      ...s,
      dishes: s.dishes.map(d => d.id === id ? { ...d, ...dish } : d),
    }));
  };

  const deleteDish = (id: string) => {
    setState(s => ({
      ...s,
      dishes: s.dishes.filter(d => d.id !== id),
    }));
  };

  if (!isLoaded) return null;

  return (
    <AppContext.Provider value={{
      state,
      addIngredient, updateIngredient, deleteIngredient,
      addRecipe, updateRecipe, deleteRecipe,
      addDish, updateDish, deleteDish,
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
