import { describe, it, expect } from 'vitest';
import {
  calculateRecipeCost,
  calculateRecipeWeight,
  calculateDishCost,
  calculateDishMetrics,
} from './calculations';
import { Ingredient, Recipe, Dish } from './types';

// ── Fixtures ────────────────────────────────────────────────────────────────

const flour: Ingredient = {
  id: 'ing-flour',
  name: 'Flour',
  pricePerKg: 2, // €2 / kg → €0.002 / g
  priceType: 'perKg',
};

const egg: Ingredient = {
  id: 'ing-egg',
  name: 'Egg',
  pricePerKg: 0.3, // €0.30 per unit
  priceType: 'perUnit',
};

const ingredients: Ingredient[] = [flour, egg];

// 1000 g flour + 2 eggs
const doughRecipe: Recipe = {
  id: 'rec-dough',
  name: 'Dough',
  ingredients: [
    { id: 'ri-1', ingredientId: 'ing-flour', quantityInGrams: 1000 },
    { id: 'ri-2', ingredientId: 'ing-egg', quantityInGrams: 2 },
  ],
  yieldPercentage: 100,
  workTimeMinutes: 10,
  presets: [],
};

// ── calculateRecipeCost ───────────────────────────────────────────────────────

describe('calculateRecipeCost', () => {
  it('sums perKg (price/1000 * grams) and perUnit (price * count) lines', () => {
    // flour: 2/1000 * 1000 = 2.00 ; egg: 0.30 * 2 = 0.60
    expect(calculateRecipeCost(doughRecipe, ingredients)).toBeCloseTo(2.6, 10);
  });

  it('ignores ingredient lines whose id is missing from the ingredient list', () => {
    const recipe: Recipe = {
      ...doughRecipe,
      ingredients: [
        { id: 'ri-1', ingredientId: 'ing-flour', quantityInGrams: 1000 },
        { id: 'ri-x', ingredientId: 'does-not-exist', quantityInGrams: 9999 },
      ],
    };
    expect(calculateRecipeCost(recipe, ingredients)).toBeCloseTo(2, 10);
  });

  it('returns 0 for a recipe with no ingredients', () => {
    expect(calculateRecipeCost({ ...doughRecipe, ingredients: [] }, ingredients)).toBe(0);
  });
});

// ── calculateRecipeWeight ─────────────────────────────────────────────────────

describe('calculateRecipeWeight', () => {
  it('sums ingredient grams at 100% yield', () => {
    expect(calculateRecipeWeight(doughRecipe)).toBe(1002);
  });

  it('applies yield percentage (e.g. 90% → 10% loss)', () => {
    expect(calculateRecipeWeight({ ...doughRecipe, yieldPercentage: 90 })).toBeCloseTo(901.8, 10);
  });

  it('treats a 0 / falsy yield as no adjustment (raw weight)', () => {
    expect(calculateRecipeWeight({ ...doughRecipe, yieldPercentage: 0 })).toBe(1002);
  });

  it('returns 0 for an empty recipe', () => {
    expect(calculateRecipeWeight({ ...doughRecipe, ingredients: [] })).toBe(0);
  });
});

// ── calculateDishCost ─────────────────────────────────────────────────────────

describe('calculateDishCost', () => {
  it('costs recipe components by cost-per-gram * grams used', () => {
    // dough: cost 2.60 over 1002 g → 0.0025948.. €/g ; use 501 g → 1.30
    const dish: Dish = {
      id: 'dish-1',
      name: 'Half Dough',
      recipes: [{ id: 'dr-1', recipeId: 'rec-dough', quantityInGrams: 501 }],
      directIngredients: [],
      sellingPrice: 10,
      portions: 1,
      priceIncludesVat: false,
    };
    expect(calculateDishCost(dish, [doughRecipe], ingredients)).toBeCloseTo(1.3, 10);
  });

  it('adds direct ingredients (perKg and perUnit)', () => {
    const dish: Dish = {
      id: 'dish-2',
      name: 'Direct only',
      recipes: [],
      directIngredients: [
        { id: 'di-1', ingredientId: 'ing-flour', quantity: 500 }, // 2/1000*500 = 1.00
        { id: 'di-2', ingredientId: 'ing-egg', quantity: 3 }, // 0.30*3 = 0.90
      ],
      sellingPrice: 10,
      portions: 1,
      priceIncludesVat: false,
    };
    expect(calculateDishCost(dish, [], ingredients)).toBeCloseTo(1.9, 10);
  });

  it('skips recipe components with zero weight (no division by zero)', () => {
    const emptyRecipe: Recipe = { ...doughRecipe, id: 'rec-empty', ingredients: [] };
    const dish: Dish = {
      id: 'dish-3',
      name: 'Uses empty recipe',
      recipes: [{ id: 'dr-1', recipeId: 'rec-empty', quantityInGrams: 100 }],
      directIngredients: [],
      sellingPrice: 10,
      portions: 1,
      priceIncludesVat: false,
    };
    expect(calculateDishCost(dish, [emptyRecipe], ingredients)).toBe(0);
  });

  it('ignores unknown recipe/ingredient ids and tolerates missing directIngredients', () => {
    const dish = {
      id: 'dish-4',
      name: 'Bad refs',
      recipes: [{ id: 'dr-1', recipeId: 'nope', quantityInGrams: 100 }],
      sellingPrice: 10,
      portions: 1,
      priceIncludesVat: false,
    } as unknown as Dish; // directIngredients intentionally absent
    expect(calculateDishCost(dish, [doughRecipe], ingredients)).toBe(0);
  });
});

// ── calculateDishMetrics ──────────────────────────────────────────────────────

describe('calculateDishMetrics', () => {
  it('computes cost/portion, food-cost % and margin from selling price', () => {
    const dish: Dish = {
      id: 'dish-5',
      name: 'Two portions',
      recipes: [],
      directIngredients: [{ id: 'di-1', ingredientId: 'ing-flour', quantity: 1000 }], // €2 total
      sellingPrice: 5,
      portions: 2,
      priceIncludesVat: false,
    };
    const m = calculateDishMetrics(dish, [], ingredients);
    expect(m.totalCost).toBeCloseTo(2, 10);
    expect(m.costPerPortion).toBeCloseTo(1, 10); // 2 / 2 portions
    expect(m.foodCostPercentage).toBeCloseTo(20, 10); // 1 / 5 * 100
    expect(m.profitMargin).toBeCloseTo(80, 10); // (5 - 1) / 5 * 100
  });

  it('guards portions = 0 by treating it as 1 portion', () => {
    const dish: Dish = {
      id: 'dish-6',
      name: 'Zero portions',
      recipes: [],
      directIngredients: [{ id: 'di-1', ingredientId: 'ing-flour', quantity: 1000 }],
      sellingPrice: 4,
      portions: 0,
      priceIncludesVat: false,
    };
    const m = calculateDishMetrics(dish, [], ingredients);
    expect(m.costPerPortion).toBeCloseTo(2, 10);
  });

  it('returns 0% food-cost and margin when selling price is 0', () => {
    const dish: Dish = {
      id: 'dish-7',
      name: 'No price',
      recipes: [],
      directIngredients: [{ id: 'di-1', ingredientId: 'ing-flour', quantity: 1000 }],
      sellingPrice: 0,
      portions: 1,
      priceIncludesVat: false,
    };
    const m = calculateDishMetrics(dish, [], ingredients);
    expect(m.foodCostPercentage).toBe(0);
    expect(m.profitMargin).toBe(0);
  });
});
