import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { calculateDishMetrics, calculateDishCost, calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { IngredientCombobox } from './IngredientCombobox';
import { ConfirmDialog } from './ConfirmDialog';
import { TranslationEditor } from './TranslationEditor';
import {
  Plus, Trash2, ChevronDown, ChevronUp, X, Calculator, Edit2, Save,
  Search, FolderPlus, EyeOff, Printer,
} from 'lucide-react';

/* ── Folder config ── */
const FOLDER_COLORS = [
  { color: '#6366f1', icon: '📁' },
  { color: '#f59e0b', icon: '🍽️' },
  { color: '#10b981', icon: '🥗' },
  { color: '#ef4444', icon: '🍖' },
  { color: '#8b5cf6', icon: '🧁' },
  { color: '#ec4899', icon: '🍓' },
  { color: '#06b6d4', icon: '🐟' },
  { color: '#84cc16', icon: '🥬' },
];

const FOLDER_ICONS = ['📁', '🍽️', '🥗', '🍖', '🧁', '🍓', '🐟', '🥬', '🍕', '🍞', '🥧', '🍫', '☕', '🧀'];

/* ── VAT helpers ── */
const getVatBreakdown = (sellingPrice: number, vatRate: number) => {
  const priceWithoutVat = sellingPrice;
  const vatAmount = sellingPrice * (vatRate / 100);
  const priceWithVat = sellingPrice + vatAmount;
  return { priceWithoutVat, vatAmount, priceWithVat };
};

/* ─── Compact VAT display ─── */
const VatRow = ({ sellingPrice, vatRate, onVatRateChange }: {
  sellingPrice: number;
  vatRate: number;
  onVatRateChange?: (rate: number) => void;
}) => {
  const { priceWithoutVat, vatAmount, priceWithVat } = getVatBreakdown(sellingPrice, vatRate);
  const [isEditingVat, setIsEditingVat] = useState(false);
  const [tempVat, setTempVat] = useState(vatRate);

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 text-sm py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">Excl. VAT:</span>
        <span className="font-semibold text-gray-800">€{priceWithoutVat.toFixed(2)}</span>
      </div>
      <span className="hidden sm:inline text-gray-300">|</span>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">VAT</span>
        {isEditingVat ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.1"
              className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={tempVat}
              onChange={e => setTempVat(parseFloat(e.target.value) || 0)}
              autoFocus
              onBlur={() => {
                if (onVatRateChange) onVatRateChange(tempVat);
                setIsEditingVat(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (onVatRateChange) onVatRateChange(tempVat);
                  setIsEditingVat(false);
                }
              }}
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
        ) : (
          <button
            onClick={() => { setTempVat(vatRate); setIsEditingVat(true); }}
            className="text-xs font-medium text-gray-600 hover:text-blue-600 underline decoration-dotted cursor-pointer"
          >
            ({vatRate}%)
          </button>
        )}
        <span className="text-gray-400">:</span>
        <span className="font-semibold text-gray-700">€{vatAmount.toFixed(2)}</span>
      </div>
      <span className="hidden sm:inline text-gray-300">|</span>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">Incl. VAT:</span>
        <span className="font-semibold text-gray-800">€{priceWithVat.toFixed(2)}</span>
      </div>
    </div>
  );
};

/* ─── Margin calculator (neutral styling) ─── */
const MarginCalculator = ({ costPerPortion }: { costPerPortion: number }) => {
  const [targetMargin, setTargetMargin] = useState<number | ''>('');

  const suggestedPrice =
    typeof targetMargin === 'number' && targetMargin > 0 && targetMargin < 100
      ? costPerPortion / (1 - targetMargin / 100)
      : null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Margin Calculator</span>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Target Margin (%)</label>
          <input
            type="number"
            min="1"
            max="99"
            step="0.5"
            placeholder="e.g. 70"
            className="w-28 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
            value={targetMargin}
            onChange={(e) => setTargetMargin(parseFloat(e.target.value) || '')}
          />
        </div>
        <span className="text-gray-400 text-sm pb-1">→</span>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Suggested Price</label>
          <div className={`w-32 px-3 py-1.5 rounded-md text-sm font-semibold border ${
            suggestedPrice !== null
              ? 'bg-white border-gray-300 text-gray-900'
              : 'bg-gray-100 border-gray-200 text-gray-400'
          }`}>
            {suggestedPrice !== null ? `€${suggestedPrice.toFixed(2)}` : '—'}
          </div>
        </div>
        {suggestedPrice !== null && (
          <p className="text-xs text-gray-500 pb-1">
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
  onUpdateQty,
}: {
  dish: any;
  ingredients: any[];
  onAdd: (ingredientId: string, qty: number) => void;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}) => {
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const getTranslatedName = useTranslatedName();
  const [quantity, setQuantity] = useState<number | ''>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number>(0);

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
      <h4 className="font-medium text-gray-900 mb-2 text-sm">Direct Ingredients</h4>
      {directIngredients.length > 0 && (
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
                  <td className="p-2.5 text-sm">{ing ? getTranslatedName(ing) : 'Unknown'}</td>
                  <td className="p-2.5 text-sm">
                    {editingId === di.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingQty}
                          onChange={e => setEditingQty(parseFloat(e.target.value) || 0)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              onUpdateQty(di.id, editingQty);
                              setEditingId(null);
                            }
                          }}
                          onBlur={() => {
                            onUpdateQty(di.id, editingQty);
                            setEditingId(null);
                          }}
                        />
                        <button onClick={() => { onUpdateQty(di.id, editingQty); setEditingId(null); }} className="text-green-600 hover:text-green-800">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="cursor-pointer hover:text-blue-600 hover:underline" onClick={() => { setEditingId(di.id); setEditingQty(di.quantity); }}>
                        {di.quantity} {unit}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-sm">€{cost.toFixed(2)}</td>
                  <td className="p-2.5 text-right">
                    <button onClick={() => onRemove(di.id)} className="text-red-500 hover:text-red-700">
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
      {directIngredients.length === 0 && (
        <p className="text-xs text-gray-400 mb-3 italic">No direct ingredients added.</p>
      )}

      <div className="flex flex-col gap-3">
        <div className="w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search Ingredient</label>
          <IngredientCombobox
            ingredients={ingredients}
            value={selectedIngredient}
            onChange={setSelectedIngredient}
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {selectedIngredient && ingredients.find((i: any) => i.id === selectedIngredient)?.priceType === 'perUnit'
                ? 'Qty (units)'
                : 'Qty (g)'}
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  onUpdateQty,
}: {
  dish: any;
  recipes: any[];
  ingredients: any[];
  onAdd: (recId: string, qty: number) => void;
  onRemove: (drId: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number>(0);
  const getTranslatedName = useTranslatedName();

  const handleAdd = () => {
    if (selectedRecipe && quantity) {
      onAdd(selectedRecipe, Number(quantity));
      setSelectedRecipe('');
      setQuantity('');
    }
  };

  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2 text-sm">Recipe Components</h4>
      {dish.recipes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left mb-3 bg-white rounded-lg overflow-hidden border border-gray-200">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="p-2.5 font-medium">Recipe</th>
              <th className="p-2.5 font-medium">Quantity (g)</th>
              <th className="p-2.5 font-medium">Cost</th>
              <th className="p-2.5 font-medium text-right">Action</th>
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
                  <td className="p-2.5 text-sm">{recipe ? getTranslatedName(recipe) : 'Unknown'}</td>
                  <td className="p-2.5 text-sm">
                    {editingId === dr.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingQty}
                          onChange={e => setEditingQty(parseFloat(e.target.value) || 0)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              onUpdateQty(dr.id, editingQty);
                              setEditingId(null);
                            }
                          }}
                          onBlur={() => {
                            onUpdateQty(dr.id, editingQty);
                            setEditingId(null);
                          }}
                        />
                        <button onClick={() => { onUpdateQty(dr.id, editingQty); setEditingId(null); }} className="text-green-600 hover:text-green-800">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="cursor-pointer hover:text-blue-600 hover:underline" onClick={() => { setEditingId(dr.id); setEditingQty(dr.quantityInGrams); }}>
                        {dr.quantityInGrams}g
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-sm">€{cost.toFixed(2)}</td>
                  <td className="p-2.5 text-right">
                    <button onClick={() => onRemove(dr.id)} className="text-red-500 hover:text-red-700">
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
      {dish.recipes.length === 0 && (
        <p className="text-xs text-gray-400 mb-3 italic">No recipe components added.</p>
      )}

      <div className="flex flex-col gap-3">
        <div className="w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">Add Recipe Component</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Qty (g)</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    </div>
  );
};

/* ── Dish Modal (Create / Edit) ── */
const DishModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  recipes,
  ingredients,
  folders,
  isEditing,
  onUpdateTranslations,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dish: any) => void;
  initialData?: any;
  recipes: any[];
  ingredients: any[];
  folders: any[];
  isEditing: boolean;
  onUpdateTranslations?: (translations: Record<string, string>) => void;
}) => {
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();

  const [name, setName] = useState(initialData?.name || '');
  const [sellingPrice, setSellingPrice] = useState(initialData?.sellingPrice ?? 0);
  const [portions, setPortions] = useState(initialData?.portions ?? 1);
  const [folder, setFolder] = useState(initialData?.folder || '');
  const [vatRate, setVatRate] = useState(initialData?.vatRate ?? 13.5);

  // Recipe components
  const [dishRecipes, setDishRecipes] = useState<any[]>(initialData?.recipes || []);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [recipeQty, setRecipeQty] = useState<number | ''>('');

  // Direct ingredients
  const [dishDirectIngredients, setDishDirectIngredients] = useState<any[]>(initialData?.directIngredients || []);
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
        { id: Date.now().toString(), recipeId: selectedRecipe, quantityInGrams: Number(recipeQty) },
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
        { id: Date.now().toString(), ingredientId: selectedIngredient, quantity: Number(ingredientQty) },
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

  // Live cost calculation
  const tempDish = { recipes: dishRecipes, directIngredients: dishDirectIngredients, sellingPrice, portions, vatRate, priceIncludesVat: false } as any;
  const totalCost = calculateDishCost(tempDish, recipes, ingredients);
  const portionCount = portions > 0 ? portions : 1;
  const costPerPortion = totalCost / portionCount;
  const foodCostPct = sellingPrice > 0 ? (costPerPortion / sellingPrice) * 100 : 0;
  const marginPct = sellingPrice > 0 ? ((sellingPrice - costPerPortion) / sellingPrice) * 100 : 0;

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
                  <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
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
              <span className="text-blue-600 font-semibold">Cost: </span>
              <span className="font-bold text-blue-800">€{totalCost.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-blue-600 font-semibold">Per Portion: </span>
              <span className="font-bold text-blue-800">€{costPerPortion.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-blue-600 font-semibold">Food Cost: </span>
              <span className={`font-bold ${foodCostPct <= 30 ? 'text-green-600' : 'text-red-500'}`}>
                {foodCostPct.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-blue-600 font-semibold">Margin: </span>
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
                    {dishRecipes.map((dr: any) => {
                      const recipe = recipes.find((r: any) => r.id === dr.recipeId);
                      const recipeTotalCost = recipe ? calculateRecipeCost(recipe, ingredients) : 0;
                      const recipeTotalWeight = recipe ? calculateRecipeWeight(recipe) : 0;
                      const costPerGram = recipeTotalWeight > 0 ? recipeTotalCost / recipeTotalWeight : 0;
                      const cost = costPerGram * dr.quantityInGrams;
                      return (
                        <tr key={dr.id}>
                          <td className="p-2.5 text-sm">{recipe ? getTranslatedName(recipe) : 'Unknown'}</td>
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
            <div className="flex flex-col gap-3">
              <div className="w-full">
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.dishes.addRecipeComponent || 'Add Recipe Component'}</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedRecipe}
                  onChange={e => setSelectedRecipe(e.target.value)}
                >
                  <option value="">{t.dishes.selectRecipe || 'Select a recipe...'}</option>
                  {recipes.map((r: any) => {
                    const tc = calculateRecipeCost(r, ingredients);
                    const tw = calculateRecipeWeight(r);
                    const cpk = tw > 0 ? (tc / tw) * 1000 : 0;
                    return (
                      <option key={r.id} value={r.id}>
                        {r.name} (€{cpk.toFixed(2)}/kg)
                      </option>
                    );
                  })}
                </select>
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
                  onClick={addRecipe}
                  disabled={!selectedRecipe || !recipeQty}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
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
                    {dishDirectIngredients.map((di: any) => {
                      const ing = ingredients.find((i: any) => i.id === di.ingredientId);
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
            <div className="flex flex-col gap-3">
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
                    {selectedIngredient && ingredients.find((i: any) => i.id === selectedIngredient)?.priceType === 'perUnit'
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
                  onClick={addIngredient}
                  disabled={!selectedIngredient || !ingredientQty}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
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

/* ── Add Folder Dialog ── */
const AddFolderDialog = ({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, icon: string) => void;
}) => {
  const [name, setName] = useState('');
  const [selColor, setSelColor] = useState(FOLDER_COLORS[0].color);
  const [selIcon, setSelIcon] = useState(FOLDER_COLORS[1].icon);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Folder</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Main Courses"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelIcon(icon)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-all ${
                    selIcon === icon ? 'border-blue-500 bg-blue-50 scale-110' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map(({ color }) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selColor === color ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => { if (name) { onSave(name, selColor, selIcon); onClose(); setName(''); } }}
            disabled={!name}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Create Folder
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main view ─── */
export const DishesView = () => {
  const { state, addDish, updateDish, deleteDish, addFolder, deleteFolder, updateTranslations } = useAppContext();
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [showAddFolder, setShowAddFolder] = useState(false);

  const [editingDishNameId, setEditingDishNameId] = useState<string | null>(null);
  const [tempDishName, setTempDishName] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);

  const folders = state.dishFolders || [];

  const handleAddDish = (data: any) => {
    addDish({
      id: data.id || Date.now().toString(),
      name: data.name,
      recipes: data.recipes || [],
      directIngredients: data.directIngredients || [],
      sellingPrice: data.sellingPrice || 0,
      portions: data.portions || 1,
      priceIncludesVat: data.priceIncludesVat || false,
      folder: data.folder || (activeFolder !== 'all' && activeFolder !== 'uncategorized' ? activeFolder : ''),
      vatRate: data.vatRate ?? 13.5,
    });
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

  /* Filtered dishes */
  const filteredDishes = useMemo(() => {
    return state.dishes.filter(d => {
      const matchesSearch = !search || getTranslatedName(d).toLowerCase().includes(search.toLowerCase()) || d.name.toLowerCase().includes(search.toLowerCase());
      const matchesFolder = activeFolder === 'all' || (activeFolder === 'uncategorized' ? !d.folder : d.folder === activeFolder);
      return matchesSearch && matchesFolder;
    });
  }, [state.dishes, search, activeFolder]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.dishes.title}</h2>
          <p className="text-gray-500">
            {t.dishes.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors print:hidden"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.dishes.createDish}
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={t.dishes.searchPlaceholder}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Folder tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveFolder('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeFolder === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t.dishes.all} ({state.dishes.length})
        </button>
        <button
          onClick={() => setActiveFolder('uncategorized')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeFolder === 'uncategorized' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t.dishes.uncategorized} ({state.dishes.filter(d => !d.folder).length})
        </button>
        {folders.map(f => {
          const count = state.dishes.filter(d => d.folder === f.id).length;
          return (
            <div key={f.id} className="group relative">
              <button
                onClick={() => setActiveFolder(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeFolder === f.id ? 'text-white' : 'text-gray-700 hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeFolder === f.id ? f.color : `${f.color}20`,
                }}
              >
                <span>{f.icon}</span>
                <span>{f.name}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
              <button
                onClick={() => setDeleteFolderTarget({ id: f.id, name: f.name })}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex"
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          onClick={() => setShowAddFolder(true)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 border border-dashed border-gray-300 hover:border-gray-400 hover:text-gray-500 transition-colors flex items-center gap-1"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          {t.dishes.newFolder}
        </button>
      </div>

      {/* ── New dish modal ── */}
      <DishModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        onSave={handleAddDish}
        recipes={state.recipes}
        ingredients={state.ingredients}
        folders={folders}
        isEditing={false}
      />

      {/* ── Dish cards ── */}
      <div className="space-y-3">
        {filteredDishes.length === 0 && !isAdding && (
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 text-gray-500">
            {search ? `${t.dishes.noMatch} "${search}".` : t.dishes.empty}
          </div>
        )}

        {filteredDishes.map((dish) => {
          const isExpanded = expandedId === dish.id;
          const vatRate = dish.vatRate ?? 13.5;
          const metrics = calculateDishMetrics(dish, state.recipes, state.ingredients);
          const isProfitable = metrics.foodCostPercentage <= 30;
          const folderInfo = folders.find(f => f.id === dish.folder);
          const vat = getVatBreakdown(dish.sellingPrice, vatRate);

          return (
            <div key={dish.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
              {/* Header row */}
              <div
                className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : dish.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingDishNameId === dish.id ? (
                      <input
                        type="text"
                        autoFocus
                        className="text-lg font-semibold text-gray-900 border-b border-blue-500 focus:outline-none bg-transparent px-1"
                        value={tempDishName}
                        onChange={e => setTempDishName(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onBlur={() => {
                          updateDish(dish.id, { name: tempDishName || dish.name });
                          setEditingDishNameId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            updateDish(dish.id, { name: tempDishName || dish.name });
                            setEditingDishNameId(null);
                          }
                        }}
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-900">{getTranslatedName(dish)}</h3>
                    )}
                    {folderInfo && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${folderInfo.color}20`, color: folderInfo.color }}
                      >
                        {folderInfo.icon} {folderInfo.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                    <span>€{vat.priceWithoutVat.toFixed(2)} excl.</span>
                    <span>€{vat.priceWithVat.toFixed(2)} incl.</span>
                    <span>· {dish.portions} portion{dish.portions !== 1 ? 's' : ''}</span>
                    <span>· Cost: €{metrics.costPerPortion.toFixed(2)}/portion</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-0">
                  <div className="text-right flex gap-4">
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Food Cost</p>
                      <p className={`text-base font-bold ${isProfitable ? 'text-green-600' : 'text-red-500'}`}>
                        {metrics.foodCostPercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Margin</p>
                      <p className={`text-base font-bold ${isProfitable ? 'text-green-600' : 'text-red-500'}`}>
                        {metrics.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingDishNameId(dish.id); 
                        setTempDishName(dish.name);
                      }}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md"
                      title="Edit Dish Name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: dish.id, name: dish.name }); }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                      title="Delete Dish"
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
                <div className="p-4 border-t border-gray-200 bg-gray-50/50 space-y-4">

                  {/* ── Settings row ── */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Selling Price excl. VAT (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={dish.sellingPrice}
                        onChange={(e) => updateDish(dish.id, { sellingPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Portions</label>
                      <input
                        type="number"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={dish.portions}
                        onChange={(e) => updateDish(dish.id, { portions: parseFloat(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Folder</label>
                      <select
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={dish.folder || ''}
                        onChange={e => updateDish(dish.id, { folder: e.target.value })}
                      >
                        <option value="">Uncategorized</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ── Translations ── */}
                  <TranslationEditor
                    translations={dish.translations}
                    originalName={dish.name}
                    onSave={(tr) => updateTranslations('dish', dish.id, tr)}
                  />

                  {/* ── Compact VAT ── */}
                  <VatRow
                    sellingPrice={dish.sellingPrice}
                    vatRate={vatRate}
                    onVatRateChange={(rate) => updateDish(dish.id, { vatRate: rate })}
                  />

                  {/* ── Margin calculator ── */}
                  <MarginCalculator costPerPortion={metrics.costPerPortion} />

                  {/* ── Recipe components ── */}
                  <DishRecipesEditor
                    dish={dish}
                    recipes={state.recipes}
                    ingredients={state.ingredients}
                    onAdd={(recId, qty) => addRecipeToDish(dish.id, recId, qty)}
                    onRemove={(drId) => removeRecipeFromDish(dish.id, drId)}
                    onUpdateQty={(drId, qty) => {
                       const updatedRecipes = dish.recipes.map((r: any) => r.id === drId ? { ...r, quantityInGrams: qty } : r);
                       updateDish(dish.id, { recipes: updatedRecipes });
                    }}
                  />

                  {/* ── Direct ingredients ── */}
                  <DishIngredientsEditor
                    dish={dish}
                    ingredients={state.ingredients}
                    onAdd={(ingId, qty) => addIngredientToDish(dish.id, ingId, qty)}
                    onRemove={(diId) => removeIngredientFromDish(dish.id, diId)}
                    onUpdateQty={(diId, qty) => {
                       const updatedIngs = (dish.directIngredients || []).map((i: any) => i.id === diId ? { ...i, quantity: qty } : i);
                       updateDish(dish.id, { directIngredients: updatedIngs });
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {showAddFolder && (
        <AddFolderDialog
          isOpen={true}
          onClose={() => setShowAddFolder(false)}
          onSave={(name, color, icon) => addFolder('dish', { id: Date.now().toString(), name, color, icon })}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t.dishes.deleteTitle}
        message={`${t.dishes.deleteMsg} "${deleteTarget?.name}"? ${t.dishes.trashNote}`}
        confirmLabel={t.dishes.deleteConfirm}
        cancelLabel={t.common.cancel}
        onConfirm={() => { if (deleteTarget) deleteDish(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteFolderTarget}
        title={t.dishes.deleteFolderTitle}
        message={`${t.dishes.deleteFolderMsg} "${deleteFolderTarget?.name}"? ${t.dishes.deleteFolderNote}`}
        confirmLabel={t.dishes.deleteFolderConfirm}
        cancelLabel={t.common.cancel}
        variant="warning"
        onConfirm={() => { if (deleteFolderTarget) deleteFolder('dish', deleteFolderTarget.id); setDeleteFolderTarget(null); }}
        onCancel={() => setDeleteFolderTarget(null)}
      />

      {/* ── Print-only view ── */}
      <div className="print-only">
        <h2 style={{ fontWeight: 'bold', fontSize: '18pt', marginBottom: '4pt' }}>
          {t.dishes.title}
        </h2>
        <p style={{ color: '#666', fontSize: '9pt', marginBottom: '12pt' }}>
          {activeFolder === 'all'
            ? `All dishes (${filteredDishes.length})`
            : activeFolder === 'uncategorized'
              ? `Uncategorized (${filteredDishes.length})`
              : `${folders.find(f => f.id === activeFolder)?.name || ''} (${filteredDishes.length})`
          }
          {' — '}Printed {new Date().toLocaleDateString()}
        </p>
        <table>
          <thead>
            <tr>
              <th>Dish</th>
              <th>Folder</th>
              <th>Excl. VAT</th>
              <th>Incl. VAT</th>
              <th>Portions</th>
              <th>Cost/Portion</th>
              <th>Food Cost %</th>
              <th>Margin %</th>
              <th>Components</th>
            </tr>
          </thead>
          <tbody>
            {filteredDishes.map(dish => {
              const vatRate = dish.vatRate ?? 13.5;
              const metrics = calculateDishMetrics(dish, state.recipes, state.ingredients);
              const vat = getVatBreakdown(dish.sellingPrice, vatRate);
              const folderInfo = folders.find(f => f.id === dish.folder);
              const isProfitable = metrics.foodCostPercentage <= 30;

              // Build components summary
              const recipeNames = dish.recipes.map((dr: any) => {
                const r = state.recipes.find((rec: any) => rec.id === dr.recipeId);
                return r ? `${r.name} (${dr.quantityInGrams}g)` : '?';
              });
              const ingredientNames = (dish.directIngredients || []).map((di: any) => {
                const ing = state.ingredients.find((i: any) => i.id === di.ingredientId);
                return ing ? `${ing.name} (${di.quantity}${ing.priceType === 'perUnit' ? 'u' : 'g'})` : '?';
              });
              const allComponents = [...recipeNames, ...ingredientNames].join(', ') || '—';

              return (
                <tr key={dish.id}>
                  <td style={{ fontWeight: 500 }}>{getTranslatedName(dish)}</td>
                  <td>{folderInfo ? `${folderInfo.icon} ${folderInfo.name}` : '—'}</td>
                  <td>€{vat.priceWithoutVat.toFixed(2)}</td>
                  <td>€{vat.priceWithVat.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{dish.portions}</td>
                  <td>€{metrics.costPerPortion.toFixed(2)}</td>
                  <td className={isProfitable ? 'text-green-600' : 'text-red-500'} style={{ fontWeight: 600 }}>
                    {metrics.foodCostPercentage.toFixed(1)}%
                  </td>
                  <td className={isProfitable ? 'text-green-600' : 'text-red-500'} style={{ fontWeight: 600 }}>
                    {metrics.profitMargin.toFixed(1)}%
                  </td>
                  <td style={{ fontSize: '8pt', maxWidth: '200px' }}>{allComponents}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
