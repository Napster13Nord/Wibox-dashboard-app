import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { calculateDishMetrics, calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { Plus, Trash2, ChevronDown, ChevronUp, X, Calculator, Receipt } from 'lucide-react';

const VAT_RATE = 0.135; // 13.5%

/* ── VAT helpers ── */
const getVatBreakdown = (sellingPrice: number, priceIncludesVat: boolean) => {
  if (priceIncludesVat) {
    // stored price is WITH VAT
    const priceWithVat = sellingPrice;
    const priceWithoutVat = sellingPrice / (1 + VAT_RATE);
    const vatAmount = priceWithVat - priceWithoutVat;
    return { priceWithoutVat, vatAmount, priceWithVat };
  } else {
    // stored price is WITHOUT VAT
    const priceWithoutVat = sellingPrice;
    const vatAmount = sellingPrice * VAT_RATE;
    const priceWithVat = sellingPrice + vatAmount;
    return { priceWithoutVat, vatAmount, priceWithVat };
  }
};

/* ─── VAT Breakdown Panel ─── */
const VatBreakdown = ({ sellingPrice, priceIncludesVat }: { sellingPrice: number; priceIncludesVat: boolean }) => {
  const { priceWithoutVat, vatAmount, priceWithVat } = getVatBreakdown(sellingPrice, priceIncludesVat);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">VAT Breakdown (13.5%)</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-md p-3 border border-amber-100 text-center">
          <p className="text-xs text-amber-600 font-medium mb-1">Price excl. VAT</p>
          <p className="text-lg font-bold text-gray-900">€{priceWithoutVat.toFixed(2)}</p>
        </div>
        <div className="bg-amber-100 rounded-md p-3 border border-amber-200 text-center">
          <p className="text-xs text-amber-700 font-medium mb-1">VAT Amount</p>
          <p className="text-lg font-bold text-amber-800">€{vatAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-md p-3 border border-amber-100 text-center">
          <p className="text-xs text-amber-600 font-medium mb-1">Price incl. VAT</p>
          <p className="text-lg font-bold text-gray-900">€{priceWithVat.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

/* ─── Margin calculator ─── */
const MarginCalculator = ({ costPerPortion }: { costPerPortion: number }) => {
  const [targetMargin, setTargetMargin] = useState<number | ''>('');

  const suggestedPrice =
    typeof targetMargin === 'number' && targetMargin > 0 && targetMargin < 100
      ? costPerPortion / (1 - targetMargin / 100)
      : null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-blue-800">Margin Calculator</span>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">Target Margin (%)</label>
          <input
            type="number"
            min="1"
            max="99"
            step="0.5"
            placeholder="e.g. 70"
            className="w-32 px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            value={targetMargin}
            onChange={(e) => setTargetMargin(parseFloat(e.target.value) || '')}
          />
        </div>
        <span className="text-blue-500 text-sm pb-1">→</span>
        <div>
          <label className="block text-xs font-medium text-blue-700 mb-1">Suggested Price (excl. VAT)</label>
          <div
            className={`w-44 px-3 py-2 rounded-md text-sm font-semibold border ${
              suggestedPrice !== null
                ? 'bg-white border-blue-300 text-blue-900'
                : 'bg-blue-100 border-blue-200 text-blue-400'
            }`}
          >
            {suggestedPrice !== null ? `€${suggestedPrice.toFixed(2)}` : '—'}
          </div>
        </div>
        {suggestedPrice !== null && (
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Suggested Price (incl. VAT)</label>
            <div className="w-44 px-3 py-2 rounded-md text-sm font-semibold border bg-white border-blue-300 text-blue-900">
              €{(suggestedPrice * (1 + VAT_RATE)).toFixed(2)}
            </div>
          </div>
        )}
        {suggestedPrice !== null && (
          <p className="text-xs text-blue-600 pb-1">
            Food cost: {((costPerPortion / suggestedPrice) * 100).toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
};

/* ─── Direct ingredients editor ─── */
const DishIngredientsEditor = ({
  dish,
  ingredients,
  onAdd,
  onRemove,
}: {
  dish: any;
  ingredients: any[];
  onAdd: (ingredientId: string, qty: number) => void;
  onRemove: (id: string) => void;
}) => {
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');

  const handleAdd = () => {
    if (selectedIngredient && quantity) {
      onAdd(selectedIngredient, Number(quantity));
      setSelectedIngredient('');
      setQuantity('');
    }
  };

  const directIngredients = dish.directIngredients || [];

  return (
    <div className="mt-4">
      <h4 className="font-medium text-gray-900 mb-2">Direct Ingredients</h4>
      <table className="w-full text-left mb-4 bg-white rounded-lg overflow-hidden border border-gray-200">
        <thead>
          <tr className="text-sm text-gray-500 border-b border-gray-200 bg-gray-50">
            <th className="p-3 font-medium">Ingredient</th>
            <th className="p-3 font-medium">Quantity</th>
            <th className="p-3 font-medium">Cost</th>
            <th className="p-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {directIngredients.map((di: any) => {
            const ing = ingredients.find((i: any) => i.id === di.ingredientId);
            const cost = ing
              ? ing.priceType === 'perUnit'
                ? ing.pricePerKg * di.quantity
                : (ing.pricePerKg / 1000) * di.quantity
              : 0;
            const unit = ing?.priceType === 'perUnit' ? 'unit(s)' : 'g';
            return (
              <tr key={di.id}>
                <td className="p-3 text-sm">{ing?.name || 'Unknown'}</td>
                <td className="p-3 text-sm">{di.quantity} {unit}</td>
                <td className="p-3 text-sm">€{cost.toFixed(2)}</td>
                <td className="p-3 text-right">
                  <button onClick={() => onRemove(di.id)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            );
          })}
          {directIngredients.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-sm text-center text-gray-400">
                No direct ingredients added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Add Ingredient</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={selectedIngredient}
            onChange={(e) => setSelectedIngredient(e.target.value)}
          >
            <option value="">Select an ingredient...</option>
            {ingredients.map((i: any) => (
              <option key={i.id} value={i.id}>
                {i.name} (€{i.pricePerKg}/{i.priceType === 'perUnit' ? 'unit' : 'kg'})
              </option>
            ))}
          </select>
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {selectedIngredient && ingredients.find((i: any) => i.id === selectedIngredient)?.priceType === 'perUnit'
              ? 'Quantity (units)'
              : 'Quantity (g)'}
          </label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || '')}
            placeholder="e.g. 100"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!selectedIngredient || !quantity}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
};

/* ─── Recipe components editor ─── */
const DishRecipesEditor = ({
  dish,
  recipes,
  ingredients,
  onAdd,
  onRemove,
}: {
  dish: any;
  recipes: any[];
  ingredients: any[];
  onAdd: (recId: string, qty: number) => void;
  onRemove: (drId: string) => void;
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');

  const handleAdd = () => {
    if (selectedRecipe && quantity) {
      onAdd(selectedRecipe, Number(quantity));
      setSelectedRecipe('');
      setQuantity('');
    }
  };

  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">Recipe Components</h4>
      <table className="w-full text-left mb-4 bg-white rounded-lg overflow-hidden border border-gray-200">
        <thead>
          <tr className="text-sm text-gray-500 border-b border-gray-200 bg-gray-50">
            <th className="p-3 font-medium">Recipe</th>
            <th className="p-3 font-medium">Quantity (g)</th>
            <th className="p-3 font-medium">Cost</th>
            <th className="p-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {dish.recipes.map((dr: any) => {
            const recipe = recipes.find((r: any) => r.id === dr.recipeId);
            let cost = 0;
            if (recipe) {
              const recipeTotalCost = calculateRecipeCost(recipe, ingredients);
              const recipeTotalWeight = calculateRecipeWeight(recipe);
              if (recipeTotalWeight > 0) {
                cost = (recipeTotalCost / recipeTotalWeight) * dr.quantityInGrams;
              }
            }
            return (
              <tr key={dr.id}>
                <td className="p-3 text-sm">{recipe?.name || 'Unknown'}</td>
                <td className="p-3 text-sm">{dr.quantityInGrams}g</td>
                <td className="p-3 text-sm">€{cost.toFixed(2)}</td>
                <td className="p-3 text-right">
                  <button onClick={() => onRemove(dr.id)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            );
          })}
          {dish.recipes.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-sm text-center text-gray-400">
                No recipes added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Add Recipe Component</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={selectedRecipe}
            onChange={(e) => setSelectedRecipe(e.target.value)}
          >
            <option value="">Select a recipe...</option>
            {recipes.map((r: any) => {
              const totalCost = calculateRecipeCost(r, ingredients);
              const totalWeight = calculateRecipeWeight(r);
              const costPerKg = totalWeight > 0 ? (totalCost / totalWeight) * 1000 : 0;
              return (
                <option key={r.id} value={r.id}>
                  {r.name} (€{costPerKg.toFixed(2)}/kg)
                </option>
              );
            })}
          </select>
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Quantity (g)</label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || '')}
            placeholder="e.g. 250"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!selectedRecipe || !quantity}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
};

/* ─── Main view ─── */
export const DishesView = () => {
  const { state, addDish, updateDish, deleteDish } = useAppContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDish, setNewDish] = useState({ name: '', sellingPrice: 0, portions: 1 });

  const handleAddDish = () => {
    if (!newDish.name) return;
    addDish({
      id: Date.now().toString(),
      name: newDish.name,
      recipes: [],
      directIngredients: [],
      sellingPrice: newDish.sellingPrice,
      portions: newDish.portions,
      priceIncludesVat: false,
    });
    setNewDish({ name: '', sellingPrice: 0, portions: 1 });
    setIsAdding(false);
  };

  /* Recipe helpers */
  const addRecipeToDish = (dishId: string, recipeId: string, quantityInGrams: number) => {
    const dish = state.dishes.find(d => d.id === dishId);
    if (dish) {
      updateDish(dishId, {
        recipes: [...dish.recipes, { id: Date.now().toString(), recipeId, quantityInGrams }],
      });
    }
  };

  const removeRecipeFromDish = (dishId: string, dishRecipeId: string) => {
    const dish = state.dishes.find(d => d.id === dishId);
    if (dish) {
      updateDish(dishId, { recipes: dish.recipes.filter(dr => dr.id !== dishRecipeId) });
    }
  };

  /* Direct ingredient helpers */
  const addIngredientToDish = (dishId: string, ingredientId: string, quantity: number) => {
    const dish = state.dishes.find(d => d.id === dishId);
    if (dish) {
      updateDish(dishId, {
        directIngredients: [
          ...(dish.directIngredients || []),
          { id: Date.now().toString(), ingredientId, quantity },
        ],
      });
    }
  };

  const removeIngredientFromDish = (dishId: string, diId: string) => {
    const dish = state.dishes.find(d => d.id === dishId);
    if (dish) {
      updateDish(dishId, {
        directIngredients: (dish.directIngredients || []).filter(di => di.id !== diId),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dish Building &amp; Margins</h2>
          <p className="text-gray-500">
            Combine recipes and ingredients into dishes, track margins and VAT.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Dish
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-medium mb-4">New Dish</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dish Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newDish.name}
                onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price excl. VAT (€)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newDish.sellingPrice || ''}
                onChange={(e) => setNewDish({ ...newDish, sellingPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portions</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newDish.portions || ''}
                onChange={(e) => setNewDish({ ...newDish, portions: parseFloat(e.target.value) || 1 })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
            <button onClick={handleAddDish} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Save Dish
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {state.dishes.length === 0 && !isAdding && (
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 text-gray-500">
            No dishes found. Create one to get started.
          </div>
        )}

        {state.dishes.map((dish) => {
          const isExpanded = expandedId === dish.id;
          const vat = getVatBreakdown(dish.sellingPrice, false);

          // Margins use price excl. VAT (net price)
          const dishForMetrics = { ...dish, sellingPrice: vat.priceWithoutVat };
          const metrics = calculateDishMetrics(dishForMetrics as any, state.recipes, state.ingredients);
          const isProfitable = metrics.foodCostPercentage <= 30;

          return (
            <div key={dish.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header row */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : dish.id)}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{dish.name}</h3>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                    <span>
                      Price excl. VAT: <strong className="text-gray-800">€{vat.priceWithoutVat.toFixed(2)}</strong>
                    </span>
                    <span>
                      VAT (13.5%): <strong className="text-amber-700">€{vat.vatAmount.toFixed(2)}</strong>
                    </span>
                    <span>
                      Price incl. VAT: <strong className="text-gray-800">€{vat.priceWithVat.toFixed(2)}</strong>
                    </span>
                    <span>· Portions: {dish.portions}</span>
                    <span>· Cost/Portion: €{metrics.costPerPortion.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right flex gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Food Cost</p>
                      <p className={`text-lg font-bold ${isProfitable ? 'text-green-600' : 'text-orange-500'}`}>
                        {metrics.foodCostPercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Margin</p>
                      <p className={`text-lg font-bold ${isProfitable ? 'text-green-600' : 'text-orange-500'}`}>
                        {metrics.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteDish(dish.id); }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-6">

                  {/* ── Settings row ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Update Selling Price excl. VAT (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        value={dish.sellingPrice}
                        onChange={(e) => updateDish(dish.id, { sellingPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Update Portions</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        value={dish.portions}
                        onChange={(e) => updateDish(dish.id, { portions: parseFloat(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  {/* ── VAT breakdown ── */}
                  <VatBreakdown sellingPrice={dish.sellingPrice} priceIncludesVat={false} />

                  {/* ── Margin calculator ── */}
                  <MarginCalculator costPerPortion={metrics.costPerPortion} />

                  {/* ── Recipe components ── */}
                  <DishRecipesEditor
                    dish={dish}
                    recipes={state.recipes}
                    ingredients={state.ingredients}
                    onAdd={(recId, qty) => addRecipeToDish(dish.id, recId, qty)}
                    onRemove={(drId) => removeRecipeFromDish(dish.id, drId)}
                  />

                  {/* ── Direct ingredients ── */}
                  <DishIngredientsEditor
                    dish={dish}
                    ingredients={state.ingredients}
                    onAdd={(ingId, qty) => addIngredientToDish(dish.id, ingId, qty)}
                    onRemove={(diId) => removeIngredientFromDish(dish.id, diId)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
