import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { calculateRecipeWeight } from '@/lib/calculations';
import { ChefHat, Scale, Printer } from 'lucide-react';

export const KitchenView = () => {
  const { state } = useAppContext();

  // ── Step 1 state ──
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // ── Step 2 state ──
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetQtys, setPresetQtys] = useState<Record<string, number>>({});
  const [customWeight, setCustomWeight] = useState('');

  // ── Master scale factor (null = not yet set) ──
  const [scaleFactor, setScaleFactor] = useState<number | null>(null);

  // ── Per-ingredient live edit tracking (while user is typing) ──
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const selectedRecipe = state.recipes.find(r => r.id === selectedRecipeId);
  const presets = selectedRecipe?.presets || [];
  const baseWeight = selectedRecipe ? calculateRecipeWeight(selectedRecipe) : 0;

  // Effective scale factor for display (default 1 = base recipe quantities)
  const effectiveSF = scaleFactor ?? 1;
  const totalTargetWeight = baseWeight * effectiveSF;

  // ── Helpers ──
  const applyPreset = (presetId: string, qty: number) => {
    if (!selectedRecipe || baseWeight === 0) return;
    const preset = (selectedRecipe.presets || []).find(p => p.id === presetId);
    if (!preset) return;
    setScaleFactor((preset.targetWeightGrams * qty) / baseWeight);
    setSelectedPresetId(presetId);
    setCustomWeight('');
    setEditingValues({});
  };

  const handlePresetClick = (presetId: string) => {
    const qty = presetQtys[presetId] ?? 1;
    applyPreset(presetId, qty);
  };

  const handlePresetQtyChange = (presetId: string, newQty: number) => {
    const validQty = Math.max(1, newQty || 1);
    setPresetQtys(prev => ({ ...prev, [presetId]: validQty }));
    if (selectedPresetId === presetId) {
      applyPreset(presetId, validQty);
    }
  };

  const handleCustomWeight = (value: string) => {
    setCustomWeight(value);
    setSelectedPresetId(null);
    setEditingValues({});
    const w = parseFloat(value);
    if (w > 0 && baseWeight > 0) {
      setScaleFactor(w / baseWeight);
    } else {
      setScaleFactor(null);
    }
  };

  // While typing in an ingredient row — just track the text locally
  const handleIngredientChange = (riId: string, value: string) => {
    setEditingValues(prev => ({ ...prev, [riId]: value }));
  };

  // On blur — apply new scale factor derived from the edited ingredient
  const handleIngredientBlur = (riId: string, baseQty: number) => {
    const rawValue = editingValues[riId];
    if (rawValue !== undefined) {
      const newQty = parseFloat(rawValue);
      if (newQty > 0 && baseQty > 0) {
        setScaleFactor(newQty / baseQty);
        setSelectedPresetId(null);
        setCustomWeight('');
      }
      // Clear the editing override so display re-syncs from scaleFactor
      setEditingValues(prev => {
        const next = { ...prev };
        delete next[riId];
        return next;
      });
    }
  };

  // Also apply on Enter key
  const handleIngredientKeyDown = (e: React.KeyboardEvent, riId: string, baseQty: number) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const getDisplayQty = (riId: string, baseQty: number): string => {
    if (editingValues[riId] !== undefined) return editingValues[riId];
    return (baseQty * effectiveSF).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const handleBack = () => {
    setSelectedRecipeId(null);
    setSelectedPresetId(null);
    setPresetQtys({});
    setCustomWeight('');
    setScaleFactor(null);
    setEditingValues({});
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kitchen Scale</h2>
          <p className="text-gray-500">Select a recipe and a size — ingredients scale automatically.</p>
        </div>
      </div>

      {/* ── Step 1: Recipe Selection ── */}
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
        /* ── Step 2: Scale ── */
        <div className="space-y-6">
          <div className="flex items-center gap-4 print:hidden">
            <button
              onClick={handleBack}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Back to Recipes
            </button>
            <h2 className="text-xl font-bold text-gray-900">/ {selectedRecipe.name}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Left: Size Selection ── */}
            <div className="lg:col-span-1 print:hidden">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-orange-500" />
                  Select Size
                </h3>

                <div className="space-y-3">
                  {/* Preset buttons with qty input */}
                  {presets.map(preset => {
                    const isSelected = selectedPresetId === preset.id;
                    const qty = presetQtys[preset.id] ?? 1;
                    const totalForPreset = preset.targetWeightGrams * qty;

                    return (
                      <div
                        key={preset.id}
                        className={`rounded-lg border transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                            : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                        }`}
                      >
                        {/* Top row: clickable label */}
                        <button
                          className="w-full p-3 text-left flex justify-between items-center"
                          onClick={() => handlePresetClick(preset.id)}
                        >
                          <span className="font-medium text-gray-900">{preset.name}</span>
                          <span className="text-gray-400 text-sm">{preset.targetWeightGrams}g each</span>
                        </button>

                        {/* Bottom row: qty input */}
                        <div
                          className="px-3 pb-3 flex items-center gap-2"
                          onClick={e => e.stopPropagation()}
                        >
                          <label className="text-xs text-gray-500 shrink-0">Quantity:</label>
                          <input
                            type="number"
                            min="1"
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                            value={qty}
                            onChange={e => handlePresetQtyChange(preset.id, parseInt(e.target.value) || 1)}
                          />
                          <span className="text-xs text-gray-500">
                            = <strong className={isSelected ? 'text-orange-700' : 'text-gray-700'}>{totalForPreset.toLocaleString()}g</strong> total
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {presets.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      No presets defined. Add some in the Recipes tab.
                    </p>
                  )}

                  {/* Custom weight */}
                  <div className={`p-4 rounded-lg border transition-all ${
                    scaleFactor !== null && selectedPresetId === null
                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                      : 'border-gray-200'
                  }`}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Custom total weight (g)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1200"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      value={customWeight}
                      onChange={e => handleCustomWeight(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Ingredient List ── */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm print:shadow-none print:border-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1 print:text-2xl">
                      {selectedRecipe.name}
                    </h1>
                    {scaleFactor !== null ? (
                      <p className="text-orange-600 font-medium">
                        Total: {totalTargetWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })}g
                        {selectedPresetId && (() => {
                          const p = presets.find(pr => pr.id === selectedPresetId);
                          const qty = presetQtys[selectedPresetId] ?? 1;
                          return p ? ` — ${qty}× ${p.name}` : '';
                        })()}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        Base quantities shown — select a size or edit any ingredient to scale
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => window.print()}
                    disabled={selectedRecipe.ingredients.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors print:hidden"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>

                {/* Ingredient table */}
                {selectedRecipe.ingredients.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-900">
                        <th className="py-3 text-base font-bold text-gray-700">Ingredient</th>
                        <th className="py-3 text-base font-bold text-gray-700 text-right w-44">
                          Quantity
                          <span className="block text-xs font-normal text-gray-400">click to edit</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRecipe.ingredients.map(ri => {
                        const ingredient = state.ingredients.find(i => i.id === ri.ingredientId);
                        const isUnit = ingredient?.priceType === 'perUnit';
                        const displayVal = getDisplayQty(ri.id, ri.quantityInGrams);
                        const isEditing = editingValues[ri.id] !== undefined;

                        return (
                          <tr key={ri.id} className="group hover:bg-orange-50 transition-colors">
                            <td className="py-4 text-lg text-gray-900 font-medium">
                              {ingredient?.name || 'Unknown'}
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  className={`w-28 px-2 py-1 rounded-lg text-right text-xl font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                                    isEditing
                                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                                      : scaleFactor !== null
                                        ? 'border-transparent bg-transparent text-orange-600 hover:border-gray-300 hover:bg-white cursor-pointer'
                                        : 'border-transparent bg-transparent text-gray-400 hover:border-gray-300 hover:bg-white cursor-pointer'
                                  }`}
                                  value={displayVal}
                                  onChange={e => handleIngredientChange(ri.id, e.target.value)}
                                  onBlur={() => handleIngredientBlur(ri.id, ri.quantityInGrams)}
                                  onKeyDown={e => handleIngredientKeyDown(e, ri.id, ri.quantityInGrams)}
                                />
                                <span className="text-sm text-gray-400 w-10 text-left">
                                  {isUnit ? 'unit' : 'g'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>This recipe has no ingredients yet.</p>
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
