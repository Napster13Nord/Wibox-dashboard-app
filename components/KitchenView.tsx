import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { calculateRecipeWeight } from '@/lib/calculations';
import { ChefHat, Scale, Printer } from 'lucide-react';

export const KitchenView = () => {
  const { state } = useAppContext();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [customWeight, setCustomWeight] = useState<string>('');

  const selectedRecipe = state.recipes.find(r => r.id === selectedRecipeId);
  const presets = selectedRecipe?.presets || [];

  const baseWeight = selectedRecipe ? calculateRecipeWeight(selectedRecipe) : 0;
  const scaleFactor = (selectedRecipe && targetWeight && baseWeight > 0) ? targetWeight / baseWeight : 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kitchen Scale</h2>
          <p className="text-gray-500">Select a recipe and a size to get the scaled ingredients list.</p>
        </div>
      </div>

      {!selectedRecipe ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          {state.recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => setSelectedRecipeId(recipe.id)}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 text-left transition-all group"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-500 transition-colors">
                <ChefHat className="w-6 h-6 text-orange-600 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{recipe.name}</h3>
              <p className="text-sm text-gray-500">
                {(recipe.presets || []).length} preset sizes available
              </p>
            </button>
          ))}
          {state.recipes.length === 0 && (
            <div className="col-span-3 text-center p-12 bg-white rounded-xl border border-gray-200 text-gray-500">
              No recipes found. Go to the Recipes tab to create some.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4 print:hidden">
            <button
              onClick={() => {
                setSelectedRecipeId(null);
                setTargetWeight(null);
                setCustomWeight('');
              }}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              ← Back to Recipes
            </button>
            <h2 className="text-xl font-bold text-gray-900">/ {selectedRecipe.name}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Size Selection */}
            <div className="lg:col-span-1 space-y-6 print:hidden">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-orange-500" />
                  Select Size
                </h3>
                
                <div className="space-y-3">
                  {presets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setTargetWeight(preset.targetWeightGrams);
                        setCustomWeight('');
                      }}
                      className={`w-full p-4 rounded-lg border text-left flex justify-between items-center transition-all ${
                        targetWeight === preset.targetWeightGrams
                          ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium text-gray-900">{preset.name}</span>
                      <span className="text-gray-500 text-sm">{preset.targetWeightGrams}g</span>
                    </button>
                  ))}
                  
                  {presets.length === 0 && (
                    <p className="text-sm text-gray-500 italic mb-4">No presets defined for this recipe.</p>
                  )}

                  <div className={`p-4 rounded-lg border ${
                    targetWeight !== null && !presets.find(p => p.targetWeightGrams === targetWeight)
                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                      : 'border-gray-200'
                  }`}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Custom Amount (g)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Total custom weight"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        value={customWeight}
                        onChange={(e) => {
                          setCustomWeight(e.target.value);
                          const val = parseFloat(e.target.value);
                          if (val > 0) {
                            setTargetWeight(val);
                          } else {
                            setTargetWeight(null);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Scaled Recipe */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm print:shadow-none print:border-none print:p-0">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedRecipe.name}</h1>
                    {targetWeight ? (
                      <p className="text-lg text-orange-600 font-medium">Target Weight: {targetWeight}g</p>
                    ) : (
                      <p className="text-lg text-gray-500">Select a size to view ingredients</p>
                    )}
                  </div>
                  <button
                    onClick={handlePrint}
                    disabled={!targetWeight}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 print:hidden"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>

                {targetWeight ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-900 text-gray-900 font-bold">
                        <th className="py-3 text-lg">Ingredient</th>
                        <th className="py-3 text-lg text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedRecipe.ingredients.map(ri => {
                        const ingredient = state.ingredients.find(i => i.id === ri.ingredientId);
                        const scaledQty = ri.quantityInGrams * scaleFactor;
                        
                        // If it's a perUnit ingredient, we might want to round or format differently,
                        // but scaling it directly is often fine, or at least showing the exact fraction.
                        const isUnit = ingredient?.priceType === 'perUnit';
                        
                        return (
                          <tr key={ri.id}>
                            <td className="py-4 text-lg text-gray-900">{ingredient?.name || 'Unknown'}</td>
                            <td className="py-4 text-xl font-bold text-right text-orange-600">
                              {scaledQty.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                              <span className="text-sm font-normal text-gray-500 ml-1">
                                {isUnit ? 'unit(s)' : 'g'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {selectedRecipe.ingredients.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-gray-500 italic">
                            This recipe has no ingredients.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl print:hidden">
                    <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Waiting for size selection...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
