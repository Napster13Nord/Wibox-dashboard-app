import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { Folder as FolderType, Dish, Recipe, Ingredient } from '@/lib/types';
import { fuzzyFilter } from '@/lib/fuzzySearch';
import { newId } from '@/lib/utils';
import { DEFAULT_VAT_RATE } from '@/lib/constants';
import { calculateDishMetrics, calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { ConfirmDialog } from './ConfirmDialog';
import { RecipeDetailModal } from './RecipeDetailModal';
import { FolderDialog } from './FolderDialog';
import { DishModal, DishFormData } from './dishes/DishModal';
import {
  Plus, Trash2, ChevronDown, ChevronUp, X, Edit2,
  Search, FolderPlus, Printer, Pencil, ArrowLeft,
} from 'lucide-react';


/* ── VAT helpers ── */
const getVatBreakdown = (sellingPrice: number, vatRate: number) => {
  const priceWithoutVat = sellingPrice;
  const vatAmount = sellingPrice * (vatRate / 100);
  const priceWithVat = sellingPrice + vatAmount;
  return { priceWithoutVat, vatAmount, priceWithVat };
};



/* ─── Main view ─── */
export const DishesView = () => {
  const { state, addDish, updateDish, deleteDish, addFolder, updateFolder, deleteFolder, updateTranslations } = useAppContext();
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [viewingRecipeId, setViewingRecipeId] = useState<string | null>(null);

  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editModalKey, setEditModalKey] = useState(0);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const [editFolderTarget, setEditFolderTarget] = useState<FolderType | null>(null);

  const folders = state.dishFolders || [];

  const handleAddDish = (data: DishFormData) => {
    addDish({
      id: data.id || newId(),
      name: data.name,
      recipes: data.recipes || [],
      directIngredients: data.directIngredients || [],
      sellingPrice: data.sellingPrice || 0,
      portions: data.portions || 1,
      priceIncludesVat: data.priceIncludesVat || false,
      folder: data.folder || (activeFolder !== null && activeFolder !== 'all' && activeFolder !== 'uncategorized' ? activeFolder : ''),
      vatRate: data.vatRate ?? DEFAULT_VAT_RATE,
    });
    setIsAdding(false);
  };

  const handleEditDish = (data: DishFormData) => {
    if (!editingDish) return;
    updateDish(editingDish.id, {
      name: data.name,
      recipes: data.recipes || [],
      directIngredients: data.directIngredients || [],
      sellingPrice: data.sellingPrice || 0,
      portions: data.portions || 1,
      folder: data.folder || '',
      vatRate: data.vatRate ?? DEFAULT_VAT_RATE,
    });
    setEditingDish(null);
  };

  /* Recipe helpers */
  const addRecipeToDish = (dishId: string, recipeId: string, quantityInGrams: number) => {
    const dish = state.dishes.find(d => d.id === dishId);
    if (dish) {
      updateDish(dishId, {
        recipes: [...dish.recipes, { id: newId(), recipeId, quantityInGrams }],
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
          { id: newId(), ingredientId, quantity },
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

  /* Filtered dishes — multilingual fuzzy search (EN/SV/FI), then folder filter */
  const filteredDishes = useMemo(() => {
    const byFolder = state.dishes.filter(d => {
      return activeFolder === null || activeFolder === 'all' || (activeFolder === 'uncategorized' ? !d.folder : d.folder === activeFolder);
    });
    return fuzzyFilter(byFolder, search);
  }, [state.dishes, search, activeFolder]);

  const uncategorizedCount = state.dishes.filter(d => !d.folder).length;

  /* ── Shared search box (works on folder grid + inside a folder) ── */
  const searchBox = (
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
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div className="flex items-center gap-4">
          {activeFolder !== null && (
            <button
              onClick={() => { setActiveFolder(null); setSearch(''); setExpandedId(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl border border-gray-300 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.dishes.backToFolders}
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t.dishes.title}</h2>
            <p className="text-gray-500">{t.dishes.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {activeFolder !== null && (
            <button
              onClick={() => setShowAddFolder(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
              {t.dishes.newFolder}
            </button>
          )}
          <button
            onClick={() => { setModalKey(k => k + 1); setIsAdding(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t.dishes.createDish}
          </button>
        </div>
      </div>

      {/* ── Search (always available, incl. on the folder grid) ── */}
      {searchBox}

      {/* ── Step 0: Folder grid (when no folder selected and not searching) ── */}
      {activeFolder === null && !search ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* All dishes */}
          <button
            onClick={() => setActiveFolder('all')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all gap-3 group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xl group-hover:bg-blue-200 transition-colors">
              🍽️
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">{t.dishes.all}</h3>
              <p className="text-sm text-gray-500">{state.dishes.length} {t.dishes.dishesCount}</p>
            </div>
          </button>

          {/* Named folders */}
          {folders.map(f => {
            const count = state.dishes.filter(d => d.folder === f.id).length;
            return (
              <div key={f.id} className="relative group">
                <button
                  onClick={() => setActiveFolder(f.id)}
                  className="w-full flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all gap-3 relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: f.color }}
                  />
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${f.color}20`, color: f.color }}
                  >
                    {f.icon}
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900">{getTranslatedName(f)}</h3>
                    <p className="text-sm text-gray-500">{count} {t.dishes.dishesCount}</p>
                  </div>
                </button>
                {/* Edit button */}
                <button
                  onClick={() => setEditFolderTarget(f)}
                  className="absolute top-2 right-8 w-6 h-6 bg-blue-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex hover:bg-blue-600 transition-colors"
                  title={t.dishes.editFolder}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                {/* Delete button */}
                <button
                  onClick={() => setDeleteFolderTarget({ id: f.id, name: getTranslatedName(f) })}
                  className="absolute top-2 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* Uncategorized */}
          {uncategorizedCount > 0 && (
            <button
              onClick={() => setActiveFolder('uncategorized')}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-400 transition-all gap-3 group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xl group-hover:bg-gray-200 transition-colors">
                📁
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">{t.dishes.uncategorized}</h3>
                <p className="text-sm text-gray-500">{uncategorizedCount} {t.dishes.dishesCount}</p>
              </div>
            </button>
          )}

          {/* Add new folder card */}
          <button
            onClick={() => setShowAddFolder(true)}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 transition-all gap-3 group"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-500 group-hover:text-blue-600 transition-colors">{t.dishes.newFolder}</h3>
            </div>
          </button>
        </div>
      ) : (
        <>
          {/* ── Step 1: Tabs + Dish List (search box is rendered above) ── */}
          {/* Folder tabs — only inside a folder; hidden during a global search from the grid */}
          {activeFolder !== null && (
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
              {t.dishes.uncategorized} ({uncategorizedCount})
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
                    style={{ backgroundColor: activeFolder === f.id ? f.color : `${f.color}20` }}
                  >
                    <span>{f.icon}</span>
                    <span>{getTranslatedName(f)}</span>
                    <span className="text-xs opacity-75">({count})</span>
                  </button>
                  <button
                    onClick={() => setDeleteFolderTarget({ id: f.id, name: getTranslatedName(f) })}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex"
                  >
                    ×
                  </button>
                  <button
                    onClick={() => setEditFolderTarget(f)}
                    className="absolute -top-1 right-4 w-4 h-4 bg-blue-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex"
                    title={t.dishes.editFolder}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </>
      )}

      {/* ── Edit dish modal ── */}
      {editingDish && (
        <DishModal
          key={`edit-${editModalKey}`}
          isOpen={true}
          onClose={() => setEditingDish(null)}
          onSave={handleEditDish}
          initialData={editingDish}
          recipes={state.recipes}
          ingredients={state.ingredients}
          folders={folders}
          isEditing={true}
          onUpdateTranslations={(tr) => updateTranslations('dish', editingDish.id, tr)}
          onViewRecipe={(recipeId) => setViewingRecipeId(recipeId)}
        />
      )}

      {/* ── New dish modal ── */}
      <DishModal
        key={modalKey}
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        onSave={handleAddDish}
        recipes={state.recipes}
        ingredients={state.ingredients}
        folders={folders}
        isEditing={false}
        defaultFolder={activeFolder && activeFolder !== 'all' && activeFolder !== 'uncategorized' ? activeFolder : ''}
        onViewRecipe={(recipeId) => setViewingRecipeId(recipeId)}
      />

      {/* ── Dish cards (in a folder, or during a global search from the grid) ── */}
      {(activeFolder !== null || search) && (
      <div className="space-y-3">
        {filteredDishes.length === 0 && !isAdding && (
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 text-gray-500">
            {search ? `${t.dishes.noMatch} "${search}".` : t.dishes.empty}
          </div>
        )}

        {filteredDishes.map((dish) => {
          const isExpanded = expandedId === dish.id;
          const vatRate = dish.vatRate ?? DEFAULT_VAT_RATE;
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
                    <h3 className="text-lg font-semibold text-gray-900">{getTranslatedName(dish)}</h3>
                    {folderInfo && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${folderInfo.color}20`, color: folderInfo.color }}
                      >
                        {folderInfo.icon} {getTranslatedName(folderInfo)}
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
                        setEditModalKey(k => k + 1);
                        setEditingDish(dish);
                      }}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md"
                      title="Edit Dish"
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(dish.id);
                        setTimeout(() => window.print(), 50);
                      }}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
                      title="Print Dish"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded panel — read-only summary */}
              {isExpanded && (
                <div className="p-4 border-t border-gray-200 bg-gray-50/50 space-y-4">

                  {/* ── Key metrics ── */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">{t.dishes.sellPriceShort}</p>
                      <p className="text-lg font-bold text-blue-700">€{dish.sellingPrice.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{t.dishes.costPrice}</p>
                      <p className="text-lg font-bold text-gray-700">€{metrics.costPerPortion.toFixed(2)}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${isProfitable ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>{t.dishes.foodCostPercent}</p>
                      <p className={`text-lg font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>{metrics.foodCostPercentage.toFixed(1)}%</p>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${isProfitable ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>{t.dishes.marginPercent}</p>
                      <p className={`text-lg font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>{metrics.profitMargin.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* ── Recipe components list ── */}
                  {dish.recipes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recipe Components</h4>
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                              <th className="px-4 py-2">Recipe</th>
                              <th className="px-4 py-2">Qty (g)</th>
                              <th className="px-4 py-2">Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {dish.recipes.map((dr) => {
                              const recipe = state.recipes.find((r) => r.id === dr.recipeId);
                              const recipeTotalCost = recipe ? calculateRecipeCost(recipe, state.ingredients) : 0;
                              const recipeTotalWeight = recipe ? calculateRecipeWeight(recipe) : 0;
                              const costPerGram = recipeTotalWeight > 0 ? recipeTotalCost / recipeTotalWeight : 0;
                              const cost = costPerGram * dr.quantityInGrams;
                              return (
                                <tr key={dr.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm font-medium">
                                    {recipe ? (
                                      <button
                                        onClick={() => setViewingRecipeId(recipe.id)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                                      >
                                        {getTranslatedName(recipe)}
                                      </button>
                                    ) : 'Unknown'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{dr.quantityInGrams}g</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">€{cost.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── Direct ingredients list ── */}
                  {(dish.directIngredients || []).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Direct Ingredients</h4>
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                              <th className="px-4 py-2">Ingredient</th>
                              <th className="px-4 py-2">Qty</th>
                              <th className="px-4 py-2">Cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(dish.directIngredients || []).map((di) => {
                              const ing = state.ingredients.find((i) => i.id === di.ingredientId);
                              const isUnit = ing?.priceType === 'perUnit';
                              const cost = ing
                                ? isUnit ? ing.pricePerKg * di.quantity : (ing.pricePerKg / 1000) * di.quantity
                                : 0;
                              return (
                                <tr key={di.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{ing ? getTranslatedName(ing) : 'Unknown'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{di.quantity}{isUnit ? ' unit(s)' : 'g'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">€{cost.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {dish.recipes.length === 0 && (dish.directIngredients || []).length === 0 && (
                    <p className="text-sm text-gray-400 italic text-center py-4">No components yet. Click ✏️ to add recipes and ingredients.</p>
                  )}

                  {/* Edit button */}
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={() => { setEditModalKey(k => k + 1); setEditingDish(dish); }}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit this dish
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* ── Modals ── */}
      {showAddFolder && (
        <FolderDialog
          isOpen={true}
          onClose={() => setShowAddFolder(false)}
          onSave={(name, color, icon) => addFolder('dish', { id: newId(), name, color, icon })}
        />
      )}

      {editFolderTarget && (
        <FolderDialog
          key={editFolderTarget.id}
          isOpen={true}
          onClose={() => setEditFolderTarget(null)}
          initialFolder={{ name: editFolderTarget.name, color: editFolderTarget.color, icon: editFolderTarget.icon }}
          onSave={(name, color, icon) => {
            updateFolder('dish', editFolderTarget.id, { name, color, icon });
            setEditFolderTarget(null);
          }}
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

      {/* ── Recipe Detail Modal ── */}
      {viewingRecipeId && (() => {
        const recipe = state.recipes.find(r => r.id === viewingRecipeId);
        if (!recipe) return null;
        return (
          <RecipeDetailModal
            recipe={recipe}
            onClose={() => setViewingRecipeId(null)}
          />
        );
      })()}

      {/* ── Print-only view (current expanded dish) — always present ── */}
      {(() => {
        const dish = expandedId ? state.dishes.find(d => d.id === expandedId) : null;
        if (!dish) return null;
        const vatRate = dish.vatRate ?? DEFAULT_VAT_RATE;
        const metrics = calculateDishMetrics(dish, state.recipes, state.ingredients);
        const vat = getVatBreakdown(dish.sellingPrice, vatRate);
        const folderInfo = folders.find(f => f.id === dish.folder);
        const isProfitable = metrics.foodCostPercentage <= 30;

        return (
          <div className="print-only">
            <h2>{getTranslatedName(dish)}</h2>
            {folderInfo && (
              <p style={{ color: '#666', marginBottom: '4pt' }}>
                {folderInfo.icon} {getTranslatedName(folderInfo)}
              </p>
            )}
            <p className="print-meta">
              Wibox Recipe Automation · Printed {new Date().toLocaleDateString()}
            </p>

            <table style={{ marginBottom: '16pt' }}>
              <thead>
                <tr>
                  <th>Excl. VAT</th>
                  <th>VAT ({vatRate}%)</th>
                  <th>Incl. VAT</th>
                  <th>Portions</th>
                  <th>Cost / Portion</th>
                  <th>Food Cost</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>€{vat.priceWithoutVat.toFixed(2)}</td>
                  <td>€{vat.vatAmount.toFixed(2)}</td>
                  <td style={{ fontWeight: 600 }}>€{vat.priceWithVat.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{dish.portions}</td>
                  <td>€{metrics.costPerPortion.toFixed(2)}</td>
                  <td className={isProfitable ? 'text-green-600' : 'text-red-500'} style={{ fontWeight: 600 }}>
                    {metrics.foodCostPercentage.toFixed(1)}%
                  </td>
                  <td className={isProfitable ? 'text-green-600' : 'text-red-500'} style={{ fontWeight: 600 }}>
                    {metrics.profitMargin.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>

            {dish.recipes.length > 0 && (
              <>
                <h3>Recipe Components</h3>
                <table style={{ marginBottom: '16pt' }}>
                  <thead>
                    <tr>
                      <th>Recipe</th>
                      <th>Qty (g)</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dish.recipes.map((dr) => {
                      const recipe = state.recipes.find((r) => r.id === dr.recipeId);
                      const recipeTotalCost = recipe ? calculateRecipeCost(recipe, state.ingredients) : 0;
                      const recipeTotalWeight = recipe ? calculateRecipeWeight(recipe) : 0;
                      const costPerGram = recipeTotalWeight > 0 ? recipeTotalCost / recipeTotalWeight : 0;
                      const cost = costPerGram * dr.quantityInGrams;
                      return (
                        <tr key={dr.id}>
                          <td>{recipe ? recipe.name : '?'}</td>
                          <td>{dr.quantityInGrams}g</td>
                          <td>€{cost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {(dish.directIngredients || []).length > 0 && (
              <>
                <h3>Direct Ingredients</h3>
                <table style={{ marginBottom: '16pt' }}>
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Quantity</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dish.directIngredients || []).map((di) => {
                      const ing = state.ingredients.find((i) => i.id === di.ingredientId);
                      const cost = ing
                        ? ing.priceType === 'perUnit'
                          ? ing.pricePerKg * di.quantity
                          : (ing.pricePerKg / 1000) * di.quantity
                        : 0;
                      const unit = ing?.priceType === 'perUnit' ? 'unit(s)' : 'g';
                      return (
                        <tr key={di.id}>
                          <td>{ing ? ing.name : '?'}</td>
                          <td>{di.quantity} {unit}</td>
                          <td>€{cost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            <p className="print-summary">
              Total Cost: €{metrics.totalCost.toFixed(2)}
            </p>
          </div>
        );
      })()}
    </div>
  );
};
