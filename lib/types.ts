export type Ingredient = {
  id: string;
  name: string;
  pricePerKg: number;
  priceType: 'perKg' | 'perUnit';
  supplier?: string;
  lastUpdate?: string; // ISO date string
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
};
