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

const defaultState: AppState = {
  ingredients: [
    { id: '1', name: 'Flour', pricePerKg: 1.20, priceType: 'perKg' },
    { id: '2', name: 'Sugar', pricePerKg: 0.90, priceType: 'perKg' },
    { id: '3', name: 'Butter', pricePerKg: 6.50, priceType: 'perKg' },
    { id: '4', name: 'Eggs', pricePerKg: 3.00, priceType: 'perUnit' },
  ],
  recipes: [
    {
      id: '1',
      name: 'Basic Dough',
      ingredients: [
        { id: '1', ingredientId: '1', quantityInGrams: 1000 },
        { id: '2', ingredientId: '2', quantityInGrams: 100 },
        { id: '3', ingredientId: '3', quantityInGrams: 200 },
      ],
      yieldPercentage: 95,
      workTimeMinutes: 15,
    }
  ],
  dishes: [
    {
      id: '1',
      name: 'Croissant',
      recipes: [
        { id: '1', recipeId: '1', quantityInGrams: 80 }
      ],
      directIngredients: [],
      sellingPrice: 3.50,
      portions: 1,
      priceIncludesVat: false,
    }
  ],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wibox-data');
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('wibox-data', JSON.stringify(state));
    }
  }, [state, isLoaded]);

  const addIngredient = (ingredient: Ingredient) => {
    setState(s => ({ ...s, ingredients: [...s.ingredients, ingredient] }));
  };

  const updateIngredient = (id: string, ingredient: Partial<Ingredient>) => {
    setState(s => ({
      ...s,
      ingredients: s.ingredients.map(i => i.id === id ? { ...i, ...ingredient } : i)
    }));
  };

  const deleteIngredient = (id: string) => {
    setState(s => ({
      ...s,
      ingredients: s.ingredients.filter(i => i.id !== id)
    }));
  };

  const addRecipe = (recipe: Recipe) => {
    setState(s => ({ ...s, recipes: [...s.recipes, recipe] }));
  };

  const updateRecipe = (id: string, recipe: Partial<Recipe>) => {
    setState(s => ({
      ...s,
      recipes: s.recipes.map(r => r.id === id ? { ...r, ...recipe } : r)
    }));
  };

  const deleteRecipe = (id: string) => {
    setState(s => ({
      ...s,
      recipes: s.recipes.filter(r => r.id !== id)
    }));
  };

  const addDish = (dish: Dish) => {
    setState(s => ({ ...s, dishes: [...s.dishes, dish] }));
  };

  const updateDish = (id: string, dish: Partial<Dish>) => {
    setState(s => ({
      ...s,
      dishes: s.dishes.map(d => d.id === id ? { ...d, ...dish } : d)
    }));
  };

  const deleteDish = (id: string) => {
    setState(s => ({
      ...s,
      dishes: s.dishes.filter(d => d.id !== id)
    }));
  };

  if (!isLoaded) return null;

  return (
    <AppContext.Provider value={{
      state,
      addIngredient, updateIngredient, deleteIngredient,
      addRecipe, updateRecipe, deleteRecipe,
      addDish, updateDish, deleteDish
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
