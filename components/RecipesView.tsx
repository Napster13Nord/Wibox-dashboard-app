import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';

export const RecipesView = () => {
  const { state, addRecipe, updateRecipe, deleteRecipe } = useAppContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newRecipe, setNewRecipe] = useState({ name: '', yieldPercentage: 100, workTimeMinutes: 0 });

  const handleAddRecipe = () => {
    if (!newRecipe.name) return;
    addRecipe({
      id: Date.now().toString(),
      name: newRecipe.name,
      ingredients: [],
      yieldPercentage: newRecipe.yieldPercentage,
      workTimeMinutes: newRecipe.workTimeMinutes,
    });
    setNewRecipe({ name: '', yieldPercentage: 100, workTimeMinutes: 0 });
    setIsAdding(false);
  };

  const addIngredientToRecipe = (recipeId: string, ingredientId: string, quantityInGrams: number) => {
    const recipe = state.recipes.find(r => r.id === recipeId);
    if (recipe) {
      updateRecipe(recipeId, {
        ingredients: [...recipe.ingredients, { id: Date.now().toString(), ingredientId, quantityInGrams }]
      });
    }
  };

  const removeIngredientFromRecipe = (recipeId: string, recipeIngredientId: string) => {
    const recipe = state.recipes.find(r => r.id === recipeId);
    if (recipe) {
      updateRecipe(recipeId, {
        ingredients: recipe.ingredients.filter(ri => ri.id !== recipeIngredientId)
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Standard Recipes</h2>
          <p className="text-gray-500">Build recipes with live costs based on the master price list.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Recipe
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-medium mb-4">New Recipe</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newRecipe.name}
                onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yield %</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newRecipe.yieldPercentage}
                onChange={(e) => setNewRecipe({ ...newRecipe, yieldPercentage: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Time (mins)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newRecipe.workTimeMinutes}
                onChange={(e) => setNewRecipe({ ...newRecipe, workTimeMinutes: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
            <button onClick={handleAddRecipe} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Save Recipe
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {state.recipes.length === 0 && !isAdding && (
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 text-gray-500">
            No recipes found. Create one to get started.
          </div>
        )}

        {state.recipes.map((recipe) => {
          const isExpanded = expandedId === recipe.id;
          const totalCost = calculateRecipeCost(recipe, state.ingredients);
          const totalWeight = calculateRecipeWeight(recipe);
          const costPerKg = totalWeight > 0 ? (totalCost / totalWeight) * 1000 : 0;

          return (
            <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{recipe.name}</h3>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    <span>Yield: {recipe.yieldPercentage}%</span>
                    <span>Work Time: {recipe.workTimeMinutes} mins</span>
                    <span>Total Weight: {totalWeight.toFixed(0)}g</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Live Cost</p>
                    <p className="text-lg font-bold text-blue-600">${totalCost.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">${costPerKg.toFixed(2)} / kg</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteRecipe(recipe.id); }}
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
                  <RecipeIngredientsEditor 
                    recipe={recipe} 
                    ingredients={state.ingredients} 
                    onAdd={(ingId, qty) => addIngredientToRecipe(recipe.id, ingId, qty)}
                    onRemove={(riId) => removeIngredientFromRecipe(recipe.id, riId)}
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

const RecipeIngredientsEditor = ({ recipe, ingredients, onAdd, onRemove }: { recipe: any, ingredients: any[], onAdd: (ingId: string, qty: number) => void, onRemove: (riId: string) => void }) => {
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');

  const handleAdd = () => {
    if (selectedIngredient && quantity) {
      onAdd(selectedIngredient, Number(quantity));
      setSelectedIngredient('');
      setQuantity('');
    }
  };

  return (
    <div>
      <table className="w-full text-left mb-4">
        <thead>
          <tr className="text-sm text-gray-500 border-b border-gray-200">
            <th className="pb-2 font-medium">Ingredient</th>
            <th className="pb-2 font-medium">Quantity (g)</th>
            <th className="pb-2 font-medium">Cost</th>
            <th className="pb-2 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {recipe.ingredients.map((ri: any) => {
            const ing = ingredients.find((i: any) => i.id === ri.ingredientId);
            const cost = ing ? (ing.pricePerKg / 1000) * ri.quantityInGrams : 0;
            return (
              <tr key={ri.id}>
                <td className="py-2 text-sm">{ing?.name || 'Unknown'}</td>
                <td className="py-2 text-sm">{ri.quantityInGrams}g</td>
                <td className="py-2 text-sm">${cost.toFixed(2)}</td>
                <td className="py-2 text-right">
                  <button onClick={() => onRemove(ri.id)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            );
          })}
          {recipe.ingredients.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-sm text-center text-gray-400">No ingredients added yet.</td>
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
              <option key={i.id} value={i.id}>{i.name} (${i.pricePerKg}/kg)</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Quantity (g)</label>
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
