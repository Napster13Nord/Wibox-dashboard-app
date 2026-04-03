export type Ingredient = {
  id: string;
  name: string;
  pricePerKg: number;
};

export type RecipeIngredient = {
  id: string;
  ingredientId: string;
  quantityInGrams: number;
};

export type Recipe = {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  yieldPercentage: number;
  workTimeMinutes: number;
};

export type DishRecipe = {
  id: string;
  recipeId: string;
  quantityInGrams: number;
};

export type Dish = {
  id: string;
  name: string;
  recipes: DishRecipe[];
  sellingPrice: number;
  portions: number;
};
