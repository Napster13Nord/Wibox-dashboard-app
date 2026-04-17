import { Ingredient, Recipe, Dish } from './types';

export const calculateRecipeCost = (recipe: Recipe, ingredients: Ingredient[]) => {
  let totalCost = 0;
  for (const ri of recipe.ingredients) {
    const ingredient = ingredients.find(i => i.id === ri.ingredientId);
    if (ingredient) {
      if (ingredient.priceType === 'perUnit') {
        // price per unit: treat quantityInGrams as number of units
        totalCost += ingredient.pricePerKg * ri.quantityInGrams;
      } else {
        // pricePerKg / 1000 = price per gram
        totalCost += (ingredient.pricePerKg / 1000) * ri.quantityInGrams;
      }
    }
  }
  return totalCost;
};

export const calculateRecipeWeight = (recipe: Recipe) => {
  let totalWeight = 0;
  for (const ri of recipe.ingredients) {
    totalWeight += ri.quantityInGrams;
  }
  if (recipe.yieldPercentage && recipe.yieldPercentage > 0) {
    totalWeight = totalWeight * (recipe.yieldPercentage / 100);
  }
  return totalWeight;
};

export const calculateDishCost = (dish: Dish, recipes: Recipe[], ingredients: Ingredient[]) => {
  let totalCost = 0;

  // Cost from recipe components
  for (const dr of dish.recipes) {
    const recipe = recipes.find(r => r.id === dr.recipeId);
    if (recipe) {
      const recipeTotalCost = calculateRecipeCost(recipe, ingredients);
      const recipeTotalWeight = calculateRecipeWeight(recipe);
      if (recipeTotalWeight > 0) {
        const costPerGram = recipeTotalCost / recipeTotalWeight;
        totalCost += costPerGram * dr.quantityInGrams;
      }
    }
  }

  // Cost from direct ingredients
  for (const di of (dish.directIngredients || [])) {
    const ingredient = ingredients.find(i => i.id === di.ingredientId);
    if (ingredient) {
      if (ingredient.priceType === 'perUnit') {
        totalCost += ingredient.pricePerKg * di.quantity;
      } else {
        totalCost += (ingredient.pricePerKg / 1000) * di.quantity;
      }
    }
  }

  return totalCost;
};

export const calculateDishMetrics = (dish: Dish, recipes: Recipe[], ingredients: Ingredient[]) => {
  const totalCost = calculateDishCost(dish, recipes, ingredients);
  const costPerPortion = dish.portions > 0 ? totalCost / dish.portions : 0;
  const foodCostPercentage = dish.sellingPrice > 0 ? (costPerPortion / dish.sellingPrice) * 100 : 0;
  const profitMargin = dish.sellingPrice > 0 ? ((dish.sellingPrice - costPerPortion) / dish.sellingPrice) * 100 : 0;
  
  return {
    totalCost,
    costPerPortion,
    foodCostPercentage,
    profitMargin
  };
};
