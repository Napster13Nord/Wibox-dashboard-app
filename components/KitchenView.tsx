import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { calculateRecipeWeight } from '@/lib/calculations';
import { ChefHat, Scale, Printer, Calculator } from 'lucide-react';

export const KitchenView = () => {
  const { state } = useAppContext();

  // Step 1
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Step 2 – qty per preset (multiple can be non-zero at the same time)
  const [presetQtys, setPresetQtys] = useState<Record<string, string>>({});
  const [customWeight, setCustomWeight] = useState('');

  // Master scale factor (null = not yet calculated)
  const [scaleFactor, setScaleFactor] = useState<number | null>(null);
  // Summary string shown in the right panel header
  const [calcSummary, setCalcSummary] = useState('');

  // Per-ingredient live-edit tracking
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const selectedRecipe = state.recipes.find(r => r.id === selectedRecipeId);
  const presets = selectedRecipe?.presets || [];
  const baseWeight = selectedRecipe ? calculateRecipeWeight(selectedRecipe) : 0;
  const effectiveSF = scaleFactor ?? 1;
  const totalTargetWeight = baseWeight * effectiveSF;

  // ── Safe quantity display (guards against NaN / undefined) ──
  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return isFinite(n) ? n : 0;
  };

  const getDisplayQty = (riId: string, baseQty: unknown): string => {
    if (editingValues[riId] !== undefined) return editingValues[riId];
    const q = safeNum(baseQty) * effectiveSF;
    return q.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  // ── Calculate ──
  const handleCalculate = () => {
    if (!selectedRecipe || baseWeight === 0) return;

    let totalTarget = 0;
    const parts: string[] = [];

    presets.forEach(preset => {
      const qty = parseFloat(presetQtys[preset.id] || '0') || 0;
      if (qty > 0) {
        totalTarget += preset.targetWeightGrams * qty;
        parts.push(`${qty}× ${preset.name}`);
      }
    });

    const custom = parseFloat(customWeight) || 0;
    if (custom > 0 && parts.length === 0) {
      totalTarget = custom;
      parts.push(`Custom ${custom}g`);
    }

    if (totalTarget > 0) {
      setScaleFactor(totalTarget / baseWeight);
      setCalcSummary(parts.join(' + '));
      setEditingValues({});
    }
  };

  // ── Ingredient editing ──
  const handleIngredientChange = (riId: string, value: string) => {
    setEditingValues(prev => ({ ...prev, [riId]: value }));
  };

  const handleIngredientBlur = (riId: string, baseQty: unknown) => {
    const rawValue = editingValues[riId];
    if (rawValue !== undefined) {
      const newQty = parseFloat(rawValue);
      const base = safeNum(baseQty);
      if (newQty > 0 && base > 0) {
        setScaleFactor(newQty / base);
        setCalcSummary(`Edited from "${rawValue}g"`);
        setCustomWeight('');
      }
      setEditingValues(prev => {
        const next = { ...prev };
        delete next[riId];
        return next;
      });
    }
  };

  const handleIngredientKeyDown = (e: React.KeyboardEvent, riId: string, baseQty: unknown) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };

  const handleBack = () => {
    setSelectedRecipeId(null);
    setPresetQtys({});
    setCustomWeight('');
    setScaleFactor(null);
    setCalcSummary('');
    setEditingValues({});
  };

  // ── Has anything in the form? ──
  const hasInput = presets.some(p => parseFloat(presetQtys[p.id] || '0') > 0)
    || parseFloat(customWeight) > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kitchen Scale</h2>
          <p className="text-gray-500">Select a recipe, enter quantities, click Calculate.</p>
        </div>
      </div>

      {/* ── Step 1: Pick a recipe ── */}
      {!selectedRecipe ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          {state.recipes.map(recipe => (
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
        /* ── Step 2: Scale builder ── */
        <div className="space-y-6">
          <div className="flex items-center gap-4 print:hidden">
            <button onClick={handleBack} className="text-sm font-medium text-gray-500 hover:text-gray-900">
              ← Back to Recipes
            </button>
            <h2 className="text-xl font-bold text-gray-900">/ {selectedRecipe.name}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ─── Left Panel: Size Builder ─── */}
            <div className="lg:col-span-1 print:hidden">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-orange-500" />
                  Select Sizes &amp; Quantities
                </h3>
                <p className="text-xs text-gray-400 mb-5">Enter quantity for one or more sizes, then click Calculate.</p>

                <div className="space-y-3 mb-5">
                  {/* Each preset row */}
                  {presets.map(preset => {
                    const qty = parseFloat(presetQtys[preset.id] || '0') || 0;
                    const subtotal = qty * preset.targetWeightGrams;
                    return (
                      <div
                        key={preset.id}
                        className={`rounded-lg border p-3 transition-all ${
                          qty > 0
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-orange-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 text-sm">{preset.name}</span>
                          <span className="text-gray-400 text-xs">{preset.targetWeightGrams}g each</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 shrink-0">Qty:</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                            value={presetQtys[preset.id] ?? ''}
                            onChange={e => setPresetQtys(prev => ({ ...prev, [preset.id]: e.target.value }))}
                          />
                          {qty > 0 && (
                            <span className="text-xs font-medium text-orange-700">
                              = {subtotal.toLocaleString()}g
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {presets.length === 0 && (
                    <p className="text-sm text-gray-400 italic">
                      No presets defined. Add some in the Recipes tab, or use custom weight below.
                    </p>
                  )}

                  {/* Custom weight */}
                  <div className={`rounded-lg border p-3 transition-all ${
                    parseFloat(customWeight) > 0 && !presets.some(p => parseFloat(presetQtys[p.id] || '0') > 0)
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-200'
                  }`}>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Custom total weight (g)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1200"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      value={customWeight}
                      onChange={e => setCustomWeight(e.target.value)}
                    />
                  </div>
                </div>

                {/* ─ Summary of inputs ─ */}
                {hasInput && (
                  <div className="mb-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    {presets
                      .filter(p => parseFloat(presetQtys[p.id] || '0') > 0)
                      .map(p => {
                        const qty = parseFloat(presetQtys[p.id] || '0');
                        return (
                          <div key={p.id} className="flex justify-between">
                            <span>{qty}× {p.name}</span>
                            <span className="font-medium">{(qty * p.targetWeightGrams).toLocaleString()}g</span>
                          </div>
                        );
                      })}
                    {parseFloat(customWeight) > 0 && !presets.some(p => parseFloat(presetQtys[p.id] || '0') > 0) && (
                      <div className="flex justify-between">
                        <span>Custom</span>
                        <span className="font-medium">{parseFloat(customWeight).toLocaleString()}g</span>
                      </div>
                    )}
                    <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold text-gray-800">
                      <span>Total</span>
                      <span>
                        {(
                          presets.reduce((acc, p) => acc + (parseFloat(presetQtys[p.id] || '0') || 0) * p.targetWeightGrams, 0)
                          + (presets.some(p => parseFloat(presetQtys[p.id] || '0') > 0) ? 0 : parseFloat(customWeight) || 0)
                        ).toLocaleString()}g
                      </span>
                    </div>
                  </div>
                )}

                {/* Calculate button */}
                <button
                  onClick={handleCalculate}
                  disabled={!hasInput}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Calculator className="w-5 h-5" />
                  Calculate
                </button>
              </div>
            </div>

            {/* ─── Right Panel: Scaled Ingredients ─── */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm print:shadow-none print:border-none print:p-0">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1 print:text-2xl">
                      {selectedRecipe.name}
                    </h1>
                    {scaleFactor !== null ? (
                      <p className="text-orange-600 font-medium">
                        {totalTargetWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })}g total
                        {calcSummary ? ` — ${calcSummary}` : ''}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        Enter quantities and click Calculate →
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => window.print()}
                    disabled={scaleFactor === null || selectedRecipe.ingredients.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors print:hidden"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>

                {selectedRecipe.ingredients.length > 0 ? (
                  <>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-900">
                          <th className="py-3 text-base font-bold text-gray-700">Ingredient</th>
                          <th className="py-3 text-base font-bold text-gray-700 text-right w-44">
                            Quantity
                            {scaleFactor !== null && (
                              <span className="block text-xs font-normal text-gray-400">click to edit</span>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedRecipe.ingredients.map(ri => {
                          const ingredient = state.ingredients.find(i => i.id === ri.ingredientId);
                          const isUnit = ingredient?.priceType === 'perUnit';
                          const displayVal = getDisplayQty(ri.id, ri.quantityInGrams);
                          const isEditing = editingValues[ri.id] !== undefined;
                          const ready = scaleFactor !== null;

                          return (
                            <tr key={ri.id} className="hover:bg-orange-50 transition-colors">
                              <td className="py-4 text-lg text-gray-900 font-medium">
                                {ingredient?.name || 'Unknown'}
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    disabled={!ready}
                                    className={`w-28 px-2 py-1 rounded-lg text-right text-xl font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                                      !ready
                                        ? 'border-transparent bg-transparent text-gray-300 cursor-default'
                                        : isEditing
                                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                                          : 'border-transparent bg-transparent text-orange-600 hover:border-gray-300 hover:bg-white cursor-pointer'
                                    }`}
                                    value={ready ? displayVal : '—'}
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
                    {scaleFactor === null && (
                      <div className="mt-6 text-center text-gray-400 text-sm py-4 border-2 border-dashed border-gray-200 rounded-xl">
                        <Calculator className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                        Enter sizes on the left and click <strong>Calculate</strong>
                      </div>
                    )}
                  </>
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
