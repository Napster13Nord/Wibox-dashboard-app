export type TranslationMap = {
  en?: string;
  sv?: string;
  fi?: string;
};

export type Ingredient = {
  id: string;
  name: string;
  pricePerKg: number;
  priceType: 'perKg' | 'perUnit';
  supplier?: string;
  lastUpdate?: string; // ISO date string
  lemonsoftId?: string; // Lemonsoft ERP article ID (for API sync)
  translations?: TranslationMap;
};

export type RecipeIngredient = {
  id: string;
  ingredientId: string;
  quantityInGrams: number;
};

export type RecipePreset = {
  id: string;
  name: string;            // e.g. "18cm Cake", "Individual Portion (55g)"
  targetWeightGrams: number;
};

export type Recipe = {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  yieldPercentage: number;
  workTimeMinutes: number;
  presets: RecipePreset[];
  folder?: string;         // folder id for organising recipes
  notes?: string;          // notes / instructions
  translations?: TranslationMap;
};

export type DishRecipe = {
  id: string;
  recipeId: string;
  quantityInGrams: number;
};

export type DishIngredient = {
  id: string;
  ingredientId: string;
  quantity: number;
};

export type Dish = {
  id: string;
  name: string;
  recipes: DishRecipe[];
  directIngredients: DishIngredient[];
  sellingPrice: number;
  portions: number;
  priceIncludesVat: boolean;
  folder?: string;         // folder id for organising dishes
  vatRate?: number;        // custom VAT rate, defaults to 13.5 if unset
  translations?: TranslationMap;
};

// ── Folder type (shared by Recipes & Dishes) ──
export type Folder = {
  id: string;
  name: string;
  color: string;   // hex or tailwind-compatible color
  icon: string;    // emoji or icon name
};

// ── Trash system ──
export type TrashedItem = {
  id: string;
  originalType: 'ingredient' | 'recipe' | 'dish';
  data: Ingredient | Recipe | Dish;
  deletedAt: string; // ISO date string
};
