import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { IngredientCombobox } from './IngredientCombobox';
import { ConfirmDialog } from './ConfirmDialog';
import { TranslationEditor } from './TranslationEditor';
import { Recipe, RecipeIngredient, RecipePreset, Folder as FolderType } from '@/lib/types';
import { fuzzyFilter } from '@/lib/fuzzySearch';
import { newId } from '@/lib/utils';
import { FolderDialog } from './FolderDialog';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, X, Search,
  Edit2, FolderPlus, Folder, Clock, EyeOff, Printer, Eye, Pencil, AlertTriangle,
  GripVertical, ArrowLeft,
} from 'lucide-react';
import { RecipeDetailModal } from './RecipeDetailModal';

/* ── Recipe Modal ── */
const RecipeModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  ingredients,
  folders,
  isEditing,
  defaultFolder,
  onUpdateTranslations,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Omit<Recipe, 'id'> & { id?: string }) => void;
  initialData?: Recipe;
  ingredients: any[];
  folders: any[];
  isEditing: boolean;
  defaultFolder?: string;
  onUpdateTranslations?: (translations: Record<string, string>) => void;
}) => {
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();
  const [name, setName] = useState(initialData?.name || '');
  const [yieldPercentage, setYieldPercentage] = useState(initialData?.yieldPercentage ?? 100);
  const [workTimeMinutes, setWorkTimeMinutes] = useState(initialData?.workTimeMinutes ?? 0);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [folder, setFolder] = useState(initialData?.folder || defaultFolder || '');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>(
    initialData?.ingredients || []
  );
  const [presets, setPresets] = useState<RecipePreset[]>(initialData?.presets || []);

  // Ingredient add state
  const [selIngId, setSelIngId] = useState('');
  const [selQty, setSelQty] = useState<number | ''>('');

  // Preset add state
  const [presetName, setPresetName] = useState('');
  const [presetGrams, setPresetGrams] = useState<number | ''>('');

  // Editing ingredient quantities
  const [editingIngId, setEditingIngId] = useState<string | null>(null);
  const [editingIngQty, setEditingIngQty] = useState<number>(0);

  // Drag-and-drop reordering state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const addIngredient = () => {
    if (selIngId && selQty) {
      setRecipeIngredients(prev => [
        ...prev,
        { id: newId(), ingredientId: selIngId, quantityInGrams: Number(selQty) },
      ]);
      setSelIngId('');
      setSelQty('');
    }
  };

  const removeIngredient = (riId: string) => {
    setRecipeIngredients(prev => prev.filter(ri => ri.id !== riId));
  };

  const saveIngredientQty = (riId: string) => {
    setRecipeIngredients(prev =>
      prev.map(ri => ri.id === riId ? { ...ri, quantityInGrams: editingIngQty } : ri)
    );
    setEditingIngId(null);
  };

  // ── Drag-and-drop handlers ──
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Needed for Firefox
    e.dataTransfer.setData('text/plain', String(index));
    // Make the dragged row semi-transparent
    requestAnimationFrame(() => {
      (e.target as HTMLElement).style.opacity = '0.4';
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdx === null || draggedIdx === index) {
      setDropTargetIdx(null);
      return;
    }
    // Calculate whether to place above or below the hovered row
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertIdx = e.clientY < midY ? index : index + 1;
    // Don't show indicator at the dragged item's original position
    if (insertIdx === draggedIdx || insertIdx === draggedIdx + 1) {
      setDropTargetIdx(null);
    } else {
      setDropTargetIdx(insertIdx);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    if (draggedIdx === null || dropTargetIdx === null) {
      setDraggedIdx(null);
      setDropTargetIdx(null);
      return;
    }
    setRecipeIngredients(prev => {
      const next = [...prev];
      const [moved] = next.splice(draggedIdx, 1);
      // Adjust target index after removal
      const adjustedTarget = dropTargetIdx > draggedIdx ? dropTargetIdx - 1 : dropTargetIdx;
      next.splice(adjustedTarget, 0, moved);
      return next;
    });
    setDraggedIdx(null);
    setDropTargetIdx(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedIdx(null);
    setDropTargetIdx(null);
  };

  const addPreset = () => {
    if (presetName && presetGrams) {
      setPresets(prev => [
        ...prev,
        { id: newId(), name: presetName, targetWeightGrams: Number(presetGrams) },
      ]);
      setPresetName('');
      setPresetGrams('');
    }
  };

  const removePreset = (pid: string) => {
    setPresets(prev => prev.filter(p => p.id !== pid));
  };

  const handleSave = () => {
    if (!name) return;
    onSave({
      ...(isEditing && initialData ? { id: initialData.id } : {}),
      name,
      yieldPercentage,
      workTimeMinutes,
      notes,
      folder,
      ingredients: recipeIngredients,
      presets,
    });
    onClose();
  };

  // Calculate live cost inside modal
  const tempRecipe = { ingredients: recipeIngredients, yieldPercentage, notes } as any;
  const liveCost = calculateRecipeCost(tempRecipe, ingredients);
  const liveWeight = calculateRecipeWeight(tempRecipe);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? t.recipes.editRecipe : t.recipes.createNew}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* ── Basic info ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.recipes.recipeName}</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.recipes.recipeNamePlaceholder}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.recipes.yieldPercent}</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={yieldPercentage}
                onChange={e => setYieldPercentage(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Work Time (mins)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={workTimeMinutes}
                onChange={e => setWorkTimeMinutes(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.recipes.notes}</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t.recipes.notesPlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.recipes.folder}</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={folder}
                onChange={e => setFolder(e.target.value)}
              >
                <option value="">{t.recipes.noFolder}</option>
                {folders.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.icon} {getTranslatedName(f)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Translations (only when editing) ── */}
          {isEditing && initialData && onUpdateTranslations && (
            <TranslationEditor
              translations={initialData.translations}
              originalName={initialData.name}
              onSave={onUpdateTranslations}
            />
          )}

          {/* ── Unknown ingredients warning ── */}
          {recipeIngredients.some(ri => !ingredients.find((i: any) => i.id === ri.ingredientId)) && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{t.recipes.hasUnknownIngredients}</p>
            </div>
          )}

          {/* ── Live cost summary ── */}
          <div className="flex items-center gap-6 px-4 py-3 bg-blue-50 rounded-lg border border-blue-100">
            <div>
              <span className="text-xs text-blue-600 font-medium">{t.recipes.costPerKg} (€/kg)</span>
              <p className="text-2xl font-bold text-blue-700">
                {liveWeight > 0 ? `€${((liveCost / liveWeight) * 1000).toFixed(2)}` : '—'}
              </p>
            </div>
            <div className="border-l border-blue-200 pl-6">
              <span className="text-xs text-blue-600 font-medium">{t.recipes.liveCost}</span>
              <p className="text-sm font-semibold text-blue-700">€{liveCost.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-xs text-blue-600 font-medium">{t.recipes.weight}</span>
              <p className="text-sm font-semibold text-blue-700">{liveWeight.toFixed(0)}g</p>
            </div>
          </div>

          {/* ── Ingredients table ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.recipes.ingredients}</h3>
            <table className="w-full text-left text-sm mb-3">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="py-1.5 w-8"></th>
                  <th className="py-1.5 font-medium">{t.recipes.ingredient}</th>
                  <th className="py-1.5 font-medium">{t.recipes.quantity}</th>
                  <th className="py-1.5 font-medium">{t.recipes.cost}</th>
                  <th className="py-1.5 font-medium text-right">{t.recipes.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipeIngredients.map((ri, index) => {
                  const ing = ingredients.find((i: any) => i.id === ri.ingredientId);
                  const isUnknown = !ing;
                  const cost = ing
                    ? ing.priceType === 'perUnit'
                      ? ing.pricePerKg * ri.quantityInGrams
                      : (ing.pricePerKg / 1000) * ri.quantityInGrams
                    : 0;
                  const showDropBefore = dropTargetIdx === index;
                  return (
                    <React.Fragment key={ri.id}>
                      {showDropBefore && (
                        <tr aria-hidden>
                          <td colSpan={5} className="p-0">
                            <div className="h-0.5 bg-blue-500 rounded-full mx-2" />
                          </td>
                        </tr>
                      )}
                      <tr
                        draggable
                        onDragStart={e => handleDragStart(e, index)}
                        onDragOver={e => handleDragOver(e, index)}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        className={`${
                          isUnknown ? 'bg-red-50 border-l-2 border-red-400' : ''
                        } ${draggedIdx === index ? 'opacity-40' : ''} transition-opacity`}
                        style={{ cursor: 'grab' }}
                      >
                        <td className="py-2 pr-1 text-gray-400 w-8">
                          <GripVertical className="w-4 h-4" />
                        </td>
                        <td className="py-2 text-sm">
                          {isUnknown ? (
                            <span className="flex items-center gap-1.5 text-red-600 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {t.recipes.unknownIngredient}
                            </span>
                          ) : (
                            getTranslatedName(ing)
                          )}
                        </td>
                        <td className="py-2 text-sm">
                          {editingIngId === ri.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={editingIngQty}
                                onChange={e => setEditingIngQty(parseFloat(e.target.value) || 0)}
                                autoFocus
                              />
                              <button onClick={() => saveIngredientQty(ri.id)} className="text-green-600 hover:text-green-800">
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingIngId(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span
                              className="cursor-pointer hover:text-blue-600 hover:underline"
                              onClick={() => { setEditingIngId(ri.id); setEditingIngQty(ri.quantityInGrams); }}
                            >
                              {ri.quantityInGrams}g
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-sm">€{cost.toFixed(2)}</td>
                        <td className="py-2 text-right">
                          <button onClick={() => removeIngredient(ri.id)} className="text-red-500 hover:text-red-700">
                            <X className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
                {/* Drop indicator at the end of the list */}
                {dropTargetIdx === recipeIngredients.length && recipeIngredients.length > 0 && (
                  <tr aria-hidden>
                    <td colSpan={5} className="p-0">
                      <div className="h-0.5 bg-blue-500 rounded-full mx-2" />
                    </td>
                  </tr>
                )}
                {recipeIngredients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-gray-400 text-xs italic">
                      {t.recipes.noIngredients}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <form onSubmit={e => { e.preventDefault(); addIngredient(); }} className="flex flex-col gap-3">
              <div className="w-full">
                <label className="block text-xs font-medium text-gray-500 mb-1">Search Ingredient</label>
                <IngredientCombobox
                  ingredients={ingredients}
                  value={selIngId}
                  onChange={setSelIngId}
                />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Qty (g)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selQty}
                    onChange={e => setSelQty(parseFloat(e.target.value) || '')}
                    placeholder="e.g. 100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!selIngId || !selQty}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* ── Presets ── */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.recipes.kitchenPresets}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-800 text-sm px-3 py-1.5 rounded-full"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-orange-500 text-xs">({p.targetWeightGrams}g)</span>
                  <button onClick={() => removePreset(p.id)} className="text-orange-400 hover:text-orange-700 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {presets.length === 0 && (
                <p className="text-xs text-gray-400 italic">{t.recipes.noPresets}</p>
              )}
            </div>
            <form onSubmit={e => { e.preventDefault(); addPreset(); }} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Preset Name</label>
                <input
                  type="text"
                  placeholder={t.recipes.presetNamePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                />
              </div>
              <div className="w-36">
                <label className="block text-xs font-medium text-gray-500 mb-1">Target Weight (g)</label>
                <input
                  type="number"
                  placeholder="e.g. 480"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={presetGrams}
                  onChange={e => setPresetGrams(parseFloat(e.target.value) || '')}
                />
              </div>
              <button
                type="submit"
                disabled={!presetName || !presetGrams}
                className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 disabled:opacity-50"
              >
                Add Preset
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            {t.recipes.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40"
          >
            {t.recipes.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
};

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

  const handleSaveRecipe = (data: any) => {
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* All recipes */}
          <button
            onClick={() => setActiveFolder('all')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all gap-3 group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xl group-hover:bg-blue-200 transition-colors">
              🍽️
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">{t.recipes.all}</h3>
              <p className="text-sm text-gray-500">{state.recipes.length} {t.recipes.recipesCount}</p>
            </div>
          </button>

          {/* Named folders */}
          {folders.map(f => {
            const count = state.recipes.filter(r => r.folder === f.id).length;
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
                    <p className="text-sm text-gray-500">{count} {t.recipes.recipesCount}</p>
                  </div>
                </button>
                {/* Edit button */}
                <button
                  onClick={() => setEditFolderTarget(f)}
                  className="absolute top-2 right-8 w-6 h-6 bg-blue-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex hover:bg-blue-600 transition-colors"
                  title={t.recipes.editFolder}
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
          {state.recipes.some(r => !r.folder) && (
            <button
              onClick={() => setActiveFolder('uncategorized')}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-400 transition-all gap-3 group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xl group-hover:bg-gray-200 transition-colors">
                📁
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">{t.recipes.uncategorized}</h3>
                <p className="text-sm text-gray-500">{state.recipes.filter(r => !r.folder).length} {t.recipes.recipesCount}</p>
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
              <h3 className="font-semibold text-gray-500 group-hover:text-blue-600 transition-colors">{t.recipes.newFolder}</h3>
            </div>
          </button>
        </div>
      ) : (
        <>
          {/* ── Step 1: folder tabs + recipe list (search box is rendered above) ── */}
          {/* Folder tabs — only inside a folder; hidden during a global search from the grid */}
          {activeFolder !== null && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveFolder('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFolder === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.recipes.all} ({state.recipes.length})
            </button>
            <button
              onClick={() => setActiveFolder('uncategorized')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFolder === 'uncategorized' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.recipes.uncategorized} ({state.recipes.filter(r => !r.folder).length})
            </button>
            {folders.map(f => {
              const count = state.recipes.filter(r => r.folder === f.id).length;
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
                    title={t.common.edit}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
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
