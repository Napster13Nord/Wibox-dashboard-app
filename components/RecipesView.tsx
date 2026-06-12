import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { ConfirmDialog } from './ConfirmDialog';
import { Recipe, Folder as FolderType, Ingredient } from '@/lib/types';
import { fuzzyFilter } from '@/lib/fuzzySearch';
import { newId } from '@/lib/utils';
import { FolderDialog } from './FolderDialog';
import { RecipeModal, RecipeFormData } from './recipes/RecipeModal';
import { FolderGrid } from './shared/FolderGrid';
import { FolderTabs } from './shared/FolderTabs';
import {
  Plus, Trash2, X, Search,
  Edit2, FolderPlus, Folder, Printer, Eye, AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { RecipeDetailModal } from './RecipeDetailModal';



/* ── Main view ── */
export const RecipesView = () => {
  const { state, addRecipe, updateRecipe, deleteRecipe, addFolder, updateFolder, deleteFolder, updateTranslations } = useAppContext();
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingRecipeId, setViewingRecipeId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);
  const [editFolderTarget, setEditFolderTarget] = useState<FolderType | null>(null);

  const handleSaveRecipe = (data: RecipeFormData) => {
    if (data.id) {
      // Editing
      updateRecipe(data.id, {
        name: data.name,
        yieldPercentage: data.yieldPercentage,
        workTimeMinutes: data.workTimeMinutes,
        notes: data.notes,
        folder: data.folder,
        ingredients: data.ingredients,
        presets: data.presets,
      });
    } else {
      // Creating
      addRecipe({
        id: newId(),
        name: data.name,
        yieldPercentage: data.yieldPercentage,
        workTimeMinutes: data.workTimeMinutes,
        notes: data.notes,
        folder: data.folder,
        ingredients: data.ingredients,
        presets: data.presets,
      });
    }
    setEditingRecipe(null);
  };

  /* Filtered recipes — multilingual fuzzy search (EN/SV/FI), then folder filter */
  const filteredRecipes = useMemo(() => {
    const byFolder = state.recipes.filter(r => {
      return !activeFolder || activeFolder === 'all' || (activeFolder === 'uncategorized' ? !r.folder : r.folder === activeFolder);
    });
    return fuzzyFilter(byFolder, search);
  }, [state.recipes, search, activeFolder]);

  const folders = state.recipeFolders || [];

  /* ── Shared search box (works on folder grid + inside a folder) ── */
  const searchBox = (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        placeholder={t.recipes.searchPlaceholder}
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
              onClick={() => { setActiveFolder(null); setSearch(''); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl border border-gray-300 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.recipes.backToFolders}
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t.recipes.title}</h2>
            <p className="text-gray-500">{t.recipes.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          {activeFolder !== null && (
            <button
              onClick={() => setShowAddFolder(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
              {t.recipes.newFolder}
            </button>
          )}
          <button
            onClick={() => { setEditingRecipe(null); setShowRecipeModal(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t.recipes.createRecipe}
          </button>
        </div>
      </div>

      {/* ── Search (always available, incl. on the folder grid) ── */}
      {searchBox}

      {/* ── Step 0: Folder grid (when no folder selected and not searching) ── */}
      {activeFolder === null && !search ? (
        <FolderGrid
          folders={folders}
          totalCount={state.recipes.length}
          uncategorizedCount={state.recipes.filter(r => !r.folder).length}
          folderCount={id => state.recipes.filter(r => r.folder === id).length}
          countNoun={t.recipes.recipesCount}
          labels={{ all: t.recipes.all, uncategorized: t.recipes.uncategorized, newFolder: t.recipes.newFolder }}
          onPick={setActiveFolder}
          onEdit={setEditFolderTarget}
          onDelete={f => setDeleteFolderTarget({ id: f.id, name: getTranslatedName(f) })}
          onNew={() => setShowAddFolder(true)}
          editFolderTitle={t.recipes.editFolder}
        />
      ) : (
        <>
          {/* ── Step 1: folder tabs + recipe list (search box is rendered above) ── */}
          {/* Folder tabs — only inside a folder; hidden during a global search from the grid */}
          {activeFolder !== null && (
          <FolderTabs
            folders={folders}
            activeFolder={activeFolder}
            totalCount={state.recipes.length}
            uncategorizedCount={state.recipes.filter(r => !r.folder).length}
            folderCount={id => state.recipes.filter(r => r.folder === id).length}
            labels={{ all: t.recipes.all, uncategorized: t.recipes.uncategorized }}
            onPick={setActiveFolder}
            onEdit={setEditFolderTarget}
            onDelete={f => setDeleteFolderTarget({ id: f.id, name: getTranslatedName(f) })}
            editFolderTitle={t.common.edit}
          />
          )}

          {/* Recipe cards */}
          <div className="space-y-4">
            {filteredRecipes.length === 0 && (
              <div className="text-center p-8 bg-white rounded-xl border border-gray-200 text-gray-500">
                {search ? `${t.recipes.noMatch} "${search}".` : t.recipes.empty}
              </div>
            )}

            {filteredRecipes.map(recipe => {
              const totalCost = calculateRecipeCost(recipe, state.ingredients);
              const totalWeight = calculateRecipeWeight(recipe);
              const costPerKg = totalWeight > 0 ? (totalCost / totalWeight) * 1000 : 0;
              const folderInfo = folders.find(f => f.id === recipe.folder);
              const hasUnknown = recipe.ingredients.some(ri => !state.ingredients.find(i => i.id === ri.ingredientId));

              return (
                <div
                  key={recipe.id}
                  className={`rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                    hasUnknown
                      ? 'bg-red-50 border-red-300 hover:border-red-400'
                      : 'bg-white border-gray-200 hover:border-blue-200'
                  }`}
                  onClick={() => setViewingRecipeId(recipe.id)}
                >
                  <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-lg font-semibold ${hasUnknown ? 'text-red-900' : 'text-gray-900'}`}>{getTranslatedName(recipe)}</h3>
                        {folderInfo && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: `${folderInfo.color}20`, color: folderInfo.color }}
                          >
                            {folderInfo.icon} {getTranslatedName(folderInfo)}
                          </span>
                        )}
                        {hasUnknown && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            {t.recipes.unknownIngredient}
                          </span>
                        )}
                      </div>
                      <div className={`flex gap-x-4 gap-y-1 mt-1 text-sm flex-wrap ${hasUnknown ? 'text-red-500' : 'text-gray-500'}`}>
                        <span>Yield: {recipe.yieldPercentage}%</span>
                        <span>Work Time: {recipe.workTimeMinutes} mins</span>
                        <span>Total Weight: {totalWeight.toFixed(0)}g</span>
                        {recipe.notes && (
                          <span className={`max-w-xs truncate ${hasUnknown ? 'text-red-400' : 'text-gray-400'}`} title={recipe.notes}>
                            Notes: {recipe.notes}
                          </span>
                        )}
                        {(recipe.presets || []).length > 0 && (
                          <span className="text-orange-500">
                            🍳 {(recipe.presets || []).length} preset{(recipe.presets || []).length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="text-left md:text-right">
                        <p className={`text-sm ${hasUnknown ? 'text-red-500' : 'text-gray-500'}`}>Live Cost</p>
                        <p className={`text-lg font-bold ${hasUnknown ? 'text-red-600' : 'text-blue-600'}`}>€{totalCost.toFixed(2)}</p>
                        <p className={`text-xs ${hasUnknown ? 'text-red-400' : 'text-gray-400'}`}>€{costPerKg.toFixed(2)} / kg</p>
                      </div>
                      <div className="flex items-center gap-2 ml-auto md:ml-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingRecipe(recipe); setShowRecipeModal(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                          title="Edit recipe"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: recipe.id, name: recipe.name }); }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                          title="Delete recipe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(recipe.id);
                            setTimeout(() => window.print(), 50);
                          }}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                          title="Print recipe"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <Eye className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Recipe Detail Modal ── */}
      {viewingRecipeId && (() => {
        const recipe = state.recipes.find(r => r.id === viewingRecipeId);
        if (!recipe) return null;
        return (
          <RecipeDetailModal
            recipe={recipe}
            onClose={() => setViewingRecipeId(null)}
            onEdit={() => {
              setEditingRecipe(recipe);
              setShowRecipeModal(true);
              setViewingRecipeId(null);
            }}
            onPrint={() => {
              setExpandedId(recipe.id);
              setTimeout(() => window.print(), 50);
            }}
          />
        );
      })()}

      {/* ── Edit Modal ── */}
      {showRecipeModal && (
        <RecipeModal
          isOpen={true}
          onClose={() => { setShowRecipeModal(false); setEditingRecipe(null); }}
          onSave={handleSaveRecipe}
          initialData={editingRecipe ?? undefined}
          ingredients={state.ingredients}
          folders={folders}
          isEditing={!!editingRecipe}
          defaultFolder={!editingRecipe && activeFolder && activeFolder !== 'all' && activeFolder !== 'uncategorized' ? activeFolder : ''}
          onUpdateTranslations={editingRecipe ? (tr) => updateTranslations('recipe', editingRecipe.id, tr) : undefined}
        />
      )}

      {showAddFolder && (
        <FolderDialog
          isOpen={true}
          onClose={() => setShowAddFolder(false)}
          onSave={(name, color, icon) => addFolder('recipe', { id: newId(), name, color, icon })}
        />
      )}

      {editFolderTarget && (
        <FolderDialog
          key={editFolderTarget.id}
          isOpen={true}
          onClose={() => setEditFolderTarget(null)}
          initialFolder={{ name: editFolderTarget.name, color: editFolderTarget.color, icon: editFolderTarget.icon }}
          onSave={(name, color, icon) => {
            updateFolder('recipe', editFolderTarget.id, { name, color, icon });
            setEditFolderTarget(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t.recipes.deleteTitle}
        message={`${t.recipes.deleteMsg} "${deleteTarget?.name}"? ${t.recipes.trashNote}`}
        confirmLabel={t.recipes.deleteConfirm}
        cancelLabel={t.common.cancel}
        onConfirm={() => { if (deleteTarget) deleteRecipe(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteFolderTarget}
        title={t.recipes.deleteFolderTitle}
        message={`${t.recipes.deleteFolderMsg} "${deleteFolderTarget?.name}"? ${t.recipes.deleteFolderNote}`}
        confirmLabel={t.recipes.deleteFolderConfirm}
        cancelLabel={t.common.cancel}
        variant="warning"
        onConfirm={() => { if (deleteFolderTarget) deleteFolder('recipe', deleteFolderTarget.id); setDeleteFolderTarget(null); }}
        onCancel={() => setDeleteFolderTarget(null)}
      />

      {/* ── Print-only view (current expanded recipe) — always present ── */}
      {(() => {
        const printRecipeId = viewingRecipeId || expandedId;
        const recipe = printRecipeId ? state.recipes.find(r => r.id === printRecipeId) : null;
        if (!recipe) return null;
        const totalCost = calculateRecipeCost(recipe, state.ingredients);
        const totalWeight = calculateRecipeWeight(recipe);
        const costPerKg = totalWeight > 0 ? (totalCost / totalWeight) * 1000 : 0;
        const folderInfo = folders.find(f => f.id === recipe.folder);

        return (
          <div className="print-only">
            <h2>{getTranslatedName(recipe)}</h2>
            {folderInfo && (
              <p style={{ color: '#666', marginBottom: '4pt' }}>
                {folderInfo.icon} {getTranslatedName(folderInfo)}
              </p>
            )}
            <p className="print-meta">
              Wibox Recipe Automation · Printed {new Date().toLocaleDateString()}
            </p>

            {/* Summary metrics */}
            <table style={{ marginBottom: '16pt' }}>
              <thead>
                <tr>
                  <th>Total Cost</th>
                  <th>Total Weight</th>
                  <th>Cost / kg</th>
                  <th>Yield</th>
                  <th>Work Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>€{totalCost.toFixed(2)}</td>
                  <td>{totalWeight.toFixed(0)}g</td>
                  <td style={{ fontWeight: 600 }}>€{costPerKg.toFixed(2)}</td>
                  <td>{recipe.yieldPercentage}%</td>
                  <td>{recipe.workTimeMinutes} mins</td>
                </tr>
              </tbody>
            </table>

            {/* Ingredients table */}
            {recipe.ingredients.length > 0 && (
              <>
                <h3>Ingredients</h3>
                <table style={{ marginBottom: '16pt' }}>
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Quantity</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.ingredients.map(ri => {
                      const ing = state.ingredients.find(i => i.id === ri.ingredientId);
                      const cost = ing
                        ? ing.priceType === 'perUnit'
                          ? ing.pricePerKg * ri.quantityInGrams
                          : (ing.pricePerKg / 1000) * ri.quantityInGrams
                        : 0;
                      const unit = ing?.priceType === 'perUnit' ? 'unit(s)' : 'g';
                      return (
                        <tr key={ri.id}>
                          <td>{ing ? getTranslatedName(ing) : 'Unknown'}</td>
                          <td>{ri.quantityInGrams} {unit}</td>
                          <td>€{cost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                      <td>Total</td>
                      <td>{totalWeight.toFixed(0)}g</td>
                      <td>€{totalCost.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            {/* Presets */}
            {(recipe.presets || []).length > 0 && (
              <>
                <h3>Kitchen Presets</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Preset Name</th>
                      <th>Target Weight</th>
                      <th>Cost per Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recipe.presets || []).map(p => {
                      const costPerUnit = totalWeight > 0 ? (totalCost / totalWeight) * p.targetWeightGrams : 0;
                      return (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td>{p.targetWeightGrams}g</td>
                          <td>€{costPerUnit.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* Notes */}
            {recipe.notes && (
              <>
                <h3>Notes</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{recipe.notes}</p>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
};
