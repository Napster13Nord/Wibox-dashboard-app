import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { calculateDishMetrics, calculateDishCost, calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { IngredientCombobox } from './IngredientCombobox';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Plus, Trash2, ChevronDown, ChevronUp, X, Calculator, Edit2,
  Search, FolderPlus, EyeOff,
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
    <div className="flex items-center gap-4 text-sm py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500">Excl. VAT:</span>
        <span className="font-semibold text-gray-800">€{priceWithoutVat.toFixed(2)}</span>
      </div>
      <span className="text-gray-300">|</span>
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
      <span className="text-gray-300">|</span>
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
      <h4 className="font-medium text-gray-900 mb-2 text-sm">Direct Ingredients</h4>
      {directIngredients.length > 0 && (
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
                  <td className="p-2.5 text-sm">{ing?.name || 'Unknown'}</td>
                  <td className="p-2.5 text-sm">{di.quantity} {unit}</td>
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
      )}
      {directIngredients.length === 0 && (
        <p className="text-xs text-gray-400 mb-3 italic">No direct ingredients added.</p>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1 max-w-xs">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search Ingredient</label>
          <IngredientCombobox
            ingredients={ingredients}
            value={selectedIngredient}
            onChange={setSelectedIngredient}
          />
        </div>
        <div className="w-28">
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
      <h4 className="font-medium text-gray-900 mb-2 text-sm">Recipe Components</h4>
      {dish.recipes.length > 0 && (
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
                  <td className="p-2.5 text-sm">{recipe?.name || 'Unknown'}</td>
                  <td className="p-2.5 text-sm">{dr.quantityInGrams}g</td>
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
      )}
      {dish.recipes.length === 0 && (
        <p className="text-xs text-gray-400 mb-3 italic">No recipe components added.</p>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1 max-w-xs">
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
        <div className="w-28">
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
  const { state, addDish, updateDish, deleteDish, addFolder, deleteFolder } = useAppContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDish, setNewDish] = useState({ name: '', sellingPrice: 0, portions: 1 });
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [showAddFolder, setShowAddFolder] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);

  const folders = state.dishFolders || [];

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
      folder: activeFolder !== 'all' && activeFolder !== 'uncategorized' ? activeFolder : '',
      vatRate: 13.5,
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

  /* Filtered dishes */
  const filteredDishes = useMemo(() => {
    return state.dishes.filter(d => {
      const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
      const matchesFolder = activeFolder === 'all' || (activeFolder === 'uncategorized' ? !d.folder : d.folder === activeFolder);
      return matchesSearch && matchesFolder;
    });
  }, [state.dishes, search, activeFolder]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
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

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search dishes…"
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
          All ({state.dishes.length})
        </button>
        <button
          onClick={() => setActiveFolder('uncategorized')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeFolder === 'uncategorized' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Uncategorized ({state.dishes.filter(d => !d.folder).length})
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
          New Folder
        </button>
      </div>

      {/* ── New dish form ── */}
      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-medium mb-4">New Dish</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dish Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newDish.name}
                onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price excl. VAT (€)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newDish.sellingPrice || ''}
                onChange={(e) => setNewDish({ ...newDish, sellingPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portions</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* ── Dish cards ── */}
      <div className="space-y-3">
        {filteredDishes.length === 0 && !isAdding && (
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 text-gray-500">
            {search ? `No dishes match "${search}".` : 'No dishes found. Create one to get started.'}
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
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : dish.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{dish.name}</h3>
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
                <div className="flex items-center gap-4 ml-4">
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
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: dish.id, name: dish.name }); }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
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
        title="Delete Dish"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? It will be moved to the trash.`}
        confirmLabel="Move to Trash"
        onConfirm={() => { if (deleteTarget) deleteDish(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteFolderTarget}
        title="Delete Folder"
        message={`Delete folder "${deleteFolderTarget?.name}"? Dishes in this folder will become uncategorized.`}
        confirmLabel="Delete Folder"
        variant="warning"
        onConfirm={() => { if (deleteFolderTarget) deleteFolder('dish', deleteFolderTarget.id); setDeleteFolderTarget(null); }}
        onCancel={() => setDeleteFolderTarget(null)}
      />
    </div>
  );
};
