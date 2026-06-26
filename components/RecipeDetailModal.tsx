import React from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { Recipe } from '@/lib/types';
import { X, Edit2, Printer, Clock, Scale, ChefHat } from 'lucide-react';

interface RecipeDetailModalProps {
  recipe: Recipe;
  onClose: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  /** When set (opened from Dish Building), the recipe is displayed scaled to
   *  this many grams as actually used in the dish — quantities and costs are
   *  shown for that portion only. The stored recipe is never modified. */
  scaleToGrams?: number;
}

/** Round to 1 decimal and drop a trailing ".0" so scaled quantities read
 *  cleanly (e.g. 24 instead of 24.0, 36.5 stays 36.5). */
const fmtQty = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  onClose,
  onEdit,
  onPrint,
  scaleToGrams,
}) => {
  const { state } = useAppContext();
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();

  // Full (stored) recipe figures
  const fullCost = calculateRecipeCost(recipe, state.ingredients);
  const fullWeight = calculateRecipeWeight(recipe);

  // Scale factor — yield-adjusted weight as denominator, matching how the dish
  // attributes recipe cost (cost/gram × grams used).
  const isScaled = typeof scaleToGrams === 'number' && scaleToGrams > 0 && fullWeight > 0;
  const scaleFactor = isScaled ? (scaleToGrams as number) / fullWeight : 1;

  const totalCost = fullCost * scaleFactor;
  const totalWeight = isScaled ? (scaleToGrams as number) : fullWeight;
  // Cost per kg is intensive — unchanged by scaling.
  const costPerKg = fullWeight > 0 ? (fullCost / fullWeight) * 1000 : 0;
  const folders = [...(state.recipeFolders || [])];
  const folderInfo = folders.find(f => f.id === recipe.folder);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <ChefHat className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {getTranslatedName(recipe)}
              </h2>
              {folderInfo && (
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
                  style={{
                    backgroundColor: `${folderInfo.color}20`,
                    color: folderInfo.color,
                  }}
                >
                  {folderInfo.icon} {getTranslatedName(folderInfo)}
                </span>
              )}
            </div>
            <div className="flex gap-x-4 gap-y-1 mt-2 text-sm text-gray-500 flex-wrap ml-11">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {recipe.workTimeMinutes} mins
              </span>
              <span className="flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> Yield: {recipe.yieldPercentage}%
              </span>
              {(recipe.presets || []).length > 0 && (
                <span className="text-orange-500">
                  🍳 {(recipe.presets || []).length} preset{(recipe.presets || []).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-4 shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                title="Edit recipe"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onPrint && (
              <button
                onClick={onPrint}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Print recipe"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Scaled-view banner (opened from Dish Building) */}
          {isScaled && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <Scale className="w-4 h-4 shrink-0" />
              <span>
                Scaled to <span className="font-semibold">{fmtQty(scaleToGrams as number)}g</span> used in this dish
                {' · '}full recipe makes {fmtQty(fullWeight)}g
              </span>
            </div>
          )}

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-200">
              <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide mb-1">{t.recipes.costPerKg} (€/kg)</p>
              <p className="text-3xl font-bold text-indigo-700">
                {totalWeight > 0 ? `€${costPerKg.toFixed(2)}` : '—'}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">{t.recipes.liveCost}</p>
              <p className="text-lg font-bold text-blue-700">€{totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{t.recipes.weight}</p>
              <p className="text-lg font-bold text-gray-700">{fmtQty(totalWeight)}g</p>
            </div>
          </div>

          {/* Ingredients table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Ingredients
            </h3>
            {recipe.ingredients.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                      <th className="px-4 py-2.5">Ingredient</th>
                      <th className="px-4 py-2.5">Quantity</th>
                      <th className="px-4 py-2.5">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recipe.ingredients.map(ri => {
                      const ing = state.ingredients.find(i => i.id === ri.ingredientId);
                      const isUnit = ing?.priceType === 'perUnit';
                      const qty = ri.quantityInGrams * scaleFactor;
                      const cost = ing
                        ? isUnit
                          ? ing.pricePerKg * qty
                          : (ing.pricePerKg / 1000) * qty
                        : 0;
                      return (
                        <tr key={ri.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                            {ing ? getTranslatedName(ing) : <span className="text-red-400">Unknown ingredient</span>}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-600">
                            {fmtQty(qty)}{isUnit ? ' unit(s)' : 'g'}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-600">€{cost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                      <td className="px-4 py-2.5 text-sm text-gray-900">Total</td>
                      <td className="px-4 py-2.5 text-sm text-gray-900">{fmtQty(totalWeight)}g</td>
                      <td className="px-4 py-2.5 text-sm text-blue-700">€{totalCost.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic py-4 text-center border border-dashed border-gray-200 rounded-xl">
                {t.recipes.noIngredientsEdit}
              </p>
            )}
          </div>

          {/* Kitchen Presets — hidden in scaled view (they describe the full batch) */}
          {!isScaled && (recipe.presets || []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                🍳 Kitchen Presets
              </h3>
              <div className="flex flex-wrap gap-2">
                {(recipe.presets || []).map(p => {
                  const costPerUnit = totalWeight > 0 ? (totalCost / totalWeight) * p.targetWeightGrams : 0;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-orange-900">{p.name}</p>
                        <p className="text-xs text-orange-600">{p.targetWeightGrams}g · €{costPerUnit.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {recipe.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Notes</h3>
              <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-xl p-4 whitespace-pre-wrap leading-relaxed">
                {recipe.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
