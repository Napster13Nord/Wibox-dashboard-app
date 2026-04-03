import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { calculateDishMetrics, calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';

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
      sellingPrice: newDish.sellingPrice,
      portions: newDish.portions,
    });
    setNewDish({ name: '', sellingPrice: 0, portions: 1 });
    setIsAdding(false);
  };

  const addRecipeToDish = (dishId: string, recipeId: string, quantityInGrams: number) => {
    const dish = state.dishes.find(d => d.id === dishId);
    if (dish) {
      updateDish(dishId, {
        recipes: [...dish.recipes, { id: Date.now().toString(), recipeId, quantityInGrams }]
      });
    }
  };

  const removeRecipeFromDish = (dishId: string, dishRecipeId: string) => {
    const dish = state.dishes.find(d => d.id === dishId);
    if (dish) {
      updateDish(dishId, {
        recipes: dish.recipes.filter(dr => dr.id !== dishRecipeId)
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dish Building & Margins</h2>
          <p className="text-gray-500">Combine recipes into final dishes and track your profit margins.</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price ($)</label>
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
          const metrics = calculateDishMetrics(dish, state.recipes, state.ingredients);
          
          const isProfitable = metrics.foodCostPercentage <= 30; // Assuming 30% is a good target

          return (
            <div key={dish.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : dish.id)}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{dish.name}</h3>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    <span>Selling Price: ${dish.sellingPrice.toFixed(2)}</span>
                    <span>Portions: {dish.portions}</span>
                    <span>Cost/Portion: ${metrics.costPerPortion.toFixed(2)}</span>
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
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Update Selling Price ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
                        value={dish.sellingPrice}
                        onChange={(e) => updateDish(dish.id, { sellingPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Update Portions</label>
                      <input 
                        type="number" 
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm"
                        value={dish.portions}
                        onChange={(e) => updateDish(dish.id, { portions: parseFloat(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <DishRecipesEditor 
                    dish={dish} 
                    recipes={state.recipes} 
                    ingredients={state.ingredients}
                    onAdd={(recId, qty) => addRecipeToDish(dish.id, recId, qty)}
                    onRemove={(drId) => removeRecipeFromDish(dish.id, drId)}
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

const DishRecipesEditor = ({ dish, recipes, ingredients, onAdd, onRemove }: { dish: any, recipes: any[], ingredients: any[], onAdd: (recId: string, qty: number) => void, onRemove: (drId: string) => void }) => {
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
                <td className="p-3 text-sm">${cost.toFixed(2)}</td>
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
              <td colSpan={4} className="p-4 text-sm text-center text-gray-400">No recipes added yet.</td>
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
                <option key={r.id} value={r.id}>{r.name} (${costPerKg.toFixed(2)}/kg)</option>
              )
            })}
          </select>
        </div>
        <div className="w-32">
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
