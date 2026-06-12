import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { Dish, Recipe, Ingredient, DishRecipe, DishIngredient, Folder as FolderType } from '@/lib/types';
import { newId } from '@/lib/utils';
import { DEFAULT_VAT_RATE } from '@/lib/constants';
import { calculateDishMetrics, calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { IngredientCombobox } from '../IngredientCombobox';
import { RecipeCombobox } from '../RecipeCombobox';
import { TranslationEditor } from '../TranslationEditor';
import { X, Save } from 'lucide-react';
import { MarginCalculator } from './MarginCalculator';

/** Payload emitted by DishModal.onSave — a Dish without server-managed fields
 *  (id present only when editing an existing dish). */
export type DishFormData = {
  id?: string;
  name: string;
  sellingPrice: number;
  portions: number;
  folder: string;
  vatRate: number;
  priceIncludesVat: boolean;
  recipes: DishRecipe[];
  directIngredients: DishIngredient[];
};

/* ── Dish Modal (Create / Edit) ── */
export const DishModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  recipes,
  ingredients,
  folders,
  isEditing,
  defaultFolder,
  onUpdateTranslations,
  onViewRecipe,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dish: DishFormData) => void;
  initialData?: Dish;
  recipes: Recipe[];
  ingredients: Ingredient[];
  folders: FolderType[];
  isEditing: boolean;
  defaultFolder?: string;
  onUpdateTranslations?: (translations: Record<string, string>) => void;
  onViewRecipe?: (recipeId: string) => void;
}) => {
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();

  const [name, setName] = useState(initialData?.name || '');
  const [sellingPrice, setSellingPrice] = useState(initialData?.sellingPrice ?? 0);
  const [portions, setPortions] = useState(initialData?.portions ?? 1);
  const [folder, setFolder] = useState(initialData?.folder || defaultFolder || '');
  const [vatRate, setVatRate] = useState(initialData?.vatRate ?? DEFAULT_VAT_RATE);

  // Recipe components
  const [dishRecipes, setDishRecipes] = useState<DishRecipe[]>(initialData?.recipes || []);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [recipeQty, setRecipeQty] = useState<number | ''>('');

  // Direct ingredients
  const [dishDirectIngredients, setDishDirectIngredients] = useState<DishIngredient[]>(initialData?.directIngredients || []);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientQty, setIngredientQty] = useState<number | ''>('');

  // Editing quantities inline
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingRecipeQty, setEditingRecipeQty] = useState<number>(0);
  const [editingIngId, setEditingIngId] = useState<string | null>(null);
  const [editingIngQty, setEditingIngQty] = useState<number>(0);

  if (!isOpen) return null;

  // Add recipe component
  const addRecipe = () => {
    if (selectedRecipe && recipeQty) {
      setDishRecipes(prev => [
        ...prev,
        { id: newId(), recipeId: selectedRecipe, quantityInGrams: Number(recipeQty) },
      ]);
      setSelectedRecipe('');
      setRecipeQty('');
    }
  };

  const removeRecipe = (drId: string) => {
    setDishRecipes(prev => prev.filter(r => r.id !== drId));
  };

  // Add direct ingredient
  const addIngredient = () => {
    if (selectedIngredient && ingredientQty) {
      setDishDirectIngredients(prev => [
        ...prev,
        { id: newId(), ingredientId: selectedIngredient, quantity: Number(ingredientQty) },
      ]);
      setSelectedIngredient('');
      setIngredientQty('');
    }
  };

  const removeIngredient = (diId: string) => {
    setDishDirectIngredients(prev => prev.filter(i => i.id !== diId));
  };

  const handleSave = () => {
    if (!name) return;
    onSave({
      ...(isEditing && initialData ? { id: initialData.id } : {}),
      name,
      sellingPrice,
      portions,
      folder,
      vatRate,
      priceIncludesVat: false,
      recipes: dishRecipes,
      directIngredients: dishDirectIngredients,
    });
    onClose();
  };

  // Live cost calculation — reuse the shared metric formula (single source of truth)
  const tempDish: Dish = { id: '', name: '', recipes: dishRecipes, directIngredients: dishDirectIngredients, sellingPrice, portions, vatRate, priceIncludesVat: false };
  const { costPerPortion, foodCostPercentage: foodCostPct, profitMargin: marginPct } =
    calculateDishMetrics(tempDish, recipes, ingredients);

  // VAT calc
  const vatAmount = sellingPrice * (vatRate / 100);
  const priceWithVat = sellingPrice + vatAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? t.dishes.editDish : t.dishes.createDish}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* ── Basic info ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.dishes.dishName}</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.dishes.dishNamePlaceholder || 'e.g., Chocolate Cake 250g'}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.dishes.sellingPrice}</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sellingPrice || ''}
                onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.dishes.portions}</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={portions || ''}
                onChange={e => setPortions(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.dishes.folder || 'Folder'}</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={folder}
                onChange={e => setFolder(e.target.value)}
              >
                <option value="">{t.dishes.noFolder || 'No folder (uncategorized)'}</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.icon} {getTranslatedName(f)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Translations (edit mode only) ── */}
          {isEditing && initialData && onUpdateTranslations && (
            <TranslationEditor
              translations={initialData.translations}
              originalName={initialData.name}
              onSave={onUpdateTranslations}
            />
          )}

          {/* ── Live metrics bar ── */}
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex flex-wrap gap-4 items-center text-sm">
            <div>
              <span className="text-blue-600 font-semibold">{t.dishes.sellPriceShort}: </span>
              <span className="font-bold text-blue-800">€{sellingPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-blue-600 font-semibold">{t.dishes.costPrice}: </span>
              <span className="font-bold text-blue-800">€{costPerPortion.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-blue-600 font-semibold">{t.dishes.foodCostPercent}: </span>
              <span className={`font-bold ${foodCostPct <= 30 ? 'text-green-600' : 'text-red-500'}`}>
                {foodCostPct.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-blue-600 font-semibold">{t.dishes.marginPercent}: </span>
              <span className={`font-bold ${marginPct >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                {marginPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* ── VAT Row ── */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Excl. VAT:</span>
              <span className="font-semibold text-gray-800">€{sellingPrice.toFixed(2)}</span>
            </div>
            <span className="hidden sm:inline text-gray-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">VAT ({vatRate}%):</span>
              <span className="font-semibold text-gray-700">€{vatAmount.toFixed(2)}</span>
            </div>
            <span className="hidden sm:inline text-gray-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Incl. VAT:</span>
              <span className="font-semibold text-gray-800">€{priceWithVat.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Recipe Components ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t.dishes.recipeComponents || 'Recipe Components'}</h3>
            {dishRecipes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left mb-3 bg-white rounded-lg overflow-hidden border border-gray-200">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                      <th className="p-2.5 font-medium">Recipe</th>
                      <th className="p-2.5 font-medium">Qty (g)</th>
                      <th className="p-2.5 font-medium">Cost</th>
                      <th className="p-2.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dishRecipes.map((dr) => {
                      const recipe = recipes.find((r) => r.id === dr.recipeId);
                      const recipeTotalCost = recipe ? calculateRecipeCost(recipe, ingredients) : 0;
                      const recipeTotalWeight = recipe ? calculateRecipeWeight(recipe) : 0;
                      const costPerGram = recipeTotalWeight > 0 ? recipeTotalCost / recipeTotalWeight : 0;
                      const cost = costPerGram * dr.quantityInGrams;
                      return (
                        <tr key={dr.id}>
                          <td className="p-2.5 text-sm">
                            {recipe ? (
                              <button
                                onClick={() => onViewRecipe?.(recipe.id)}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                              >
                                {getTranslatedName(recipe)}
                              </button>
                            ) : 'Unknown'}
                          </td>
                          <td className="p-2.5 text-sm">
                            {editingRecipeId === dr.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={editingRecipeQty}
                                  onChange={e => setEditingRecipeQty(parseFloat(e.target.value) || 0)}
                                  autoFocus
                                  onKeyDown={e => { if (e.key === 'Enter') { setDishRecipes(prev => prev.map(r => r.id === dr.id ? { ...r, quantityInGrams: editingRecipeQty } : r)); setEditingRecipeId(null); } }}
                                  onBlur={() => { setDishRecipes(prev => prev.map(r => r.id === dr.id ? { ...r, quantityInGrams: editingRecipeQty } : r)); setEditingRecipeId(null); }}
                                />
                              </div>
                            ) : (
                              <span className="cursor-pointer hover:text-blue-600 hover:underline" onClick={() => { setEditingRecipeId(dr.id); setEditingRecipeQty(dr.quantityInGrams); }}>
                                {dr.quantityInGrams}g
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-sm">€{cost.toFixed(2)}</td>
                          <td className="p-2.5 text-right">
                            <button onClick={() => removeRecipe(dr.id)} className="text-red-500 hover:text-red-700">
                              <X className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {dishRecipes.length === 0 && (
              <p className="text-xs text-gray-400 mb-3 italic">{t.dishes.noRecipeComponents || 'No recipe components added.'}</p>
            )}
            <form onSubmit={e => { e.preventDefault(); addRecipe(); }} className="flex flex-col gap-3">
              <div className="w-full">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.dishes.addRecipeComponent || 'Add Recipe Component'}</label>
                <RecipeCombobox
                  recipes={recipes.map((r) => {
                    const tc = calculateRecipeCost(r, ingredients);
                    const tw = calculateRecipeWeight(r);
                    return { ...r, costPerKg: tw > 0 ? (tc / tw) * 1000 : 0 };
                  })}
                  value={selectedRecipe}
                  onChange={setSelectedRecipe}
                  placeholder={t.dishes.selectRecipe || 'Search recipes…'}
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Qty (g)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={recipeQty}
                    onChange={e => setRecipeQty(parseFloat(e.target.value) || '')}
                    placeholder="e.g. 250"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!selectedRecipe || !recipeQty}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* ── Direct Ingredients ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{t.dishes.directIngredients || 'Direct Ingredients'}</h3>
            {dishDirectIngredients.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left mb-3 bg-white rounded-lg overflow-hidden border border-gray-200">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                      <th className="p-2.5 font-medium">Ingredient</th>
                      <th className="p-2.5 font-medium">Quantity</th>
                      <th className="p-2.5 font-medium">Cost</th>
                      <th className="p-2.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dishDirectIngredients.map((di) => {
                      const ing = ingredients.find((i) => i.id === di.ingredientId);
                      const cost = ing
                        ? ing.priceType === 'perUnit'
                          ? ing.pricePerKg * di.quantity
                          : (ing.pricePerKg / 1000) * di.quantity
                        : 0;
                      const unit = ing?.priceType === 'perUnit' ? 'unit(s)' : 'g';
                      return (
                        <tr key={di.id}>
                          <td className="p-2.5 text-sm">{ing ? getTranslatedName(ing) : 'Unknown'}</td>
                          <td className="p-2.5 text-sm">
                            {editingIngId === di.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={editingIngQty}
                                  onChange={e => setEditingIngQty(parseFloat(e.target.value) || 0)}
                                  autoFocus
                                  onKeyDown={e => { if (e.key === 'Enter') { setDishDirectIngredients(prev => prev.map(i => i.id === di.id ? { ...i, quantity: editingIngQty } : i)); setEditingIngId(null); } }}
                                  onBlur={() => { setDishDirectIngredients(prev => prev.map(i => i.id === di.id ? { ...i, quantity: editingIngQty } : i)); setEditingIngId(null); }}
                                />
                              </div>
                            ) : (
                              <span className="cursor-pointer hover:text-blue-600 hover:underline" onClick={() => { setEditingIngId(di.id); setEditingIngQty(di.quantity); }}>
                                {di.quantity} {unit}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-sm">€{cost.toFixed(2)}</td>
                          <td className="p-2.5 text-right">
                            <button onClick={() => removeIngredient(di.id)} className="text-red-500 hover:text-red-700">
                              <X className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {dishDirectIngredients.length === 0 && (
              <p className="text-xs text-gray-400 mb-3 italic">{t.dishes.noDirectIngredients || 'No direct ingredients added.'}</p>
            )}
            <form onSubmit={e => { e.preventDefault(); addIngredient(); }} className="flex flex-col gap-3">
              <div className="w-full">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.dishes.searchIngredient || 'Search Ingredient'}</label>
                <IngredientCombobox
                  ingredients={ingredients}
                  value={selectedIngredient}
                  onChange={setSelectedIngredient}
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {selectedIngredient && ingredients.find((i) => i.id === selectedIngredient)?.priceType === 'perUnit'
                      ? 'Qty (units)'
                      : 'Qty (g)'}
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={ingredientQty}
                    onChange={e => setIngredientQty(parseFloat(e.target.value) || '')}
                    placeholder="e.g. 100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!selectedIngredient || !ingredientQty}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* ── Margin Calculator ── */}
          <MarginCalculator costPerPortion={costPerPortion} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {t.dishes.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!name}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isEditing ? t.dishes.saveChanges || 'Save Changes' : t.dishes.saveDish}
          </button>
        </div>
      </div>
    </div>
  );
};
