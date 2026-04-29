import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { IngredientCombobox } from './IngredientCombobox';
import { ConfirmDialog } from './ConfirmDialog';
import { TranslationEditor } from './TranslationEditor';
import { Recipe, RecipeIngredient, RecipePreset } from '@/lib/types';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, X, Search,
  Edit2, FolderPlus, Folder, Clock, EyeOff,
} from 'lucide-react';

/* ── Folder color palette ── */
const FOLDER_COLORS = [
  { color: '#6366f1', icon: '📁' },
  { color: '#f59e0b', icon: '🍰' },
  { color: '#10b981', icon: '🥗' },
  { color: '#ef4444', icon: '🍖' },
  { color: '#8b5cf6', icon: '🧁' },
  { color: '#ec4899', icon: '🍓' },
  { color: '#06b6d4', icon: '🐟' },
  { color: '#84cc16', icon: '🥬' },
];

const FOLDER_ICONS = ['📁', '🍰', '🥗', '🍖', '🧁', '🍓', '🐟', '🥬', '🍕', '🍞', '🥧', '🍫', '☕', '🧀'];

/* ── Recipe Modal ── */
const RecipeModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  ingredients,
  folders,
  isEditing,
  onUpdateTranslations,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Omit<Recipe, 'id'> & { id?: string }) => void;
  initialData?: Recipe;
  ingredients: any[];
  folders: any[];
  isEditing: boolean;
  onUpdateTranslations?: (translations: Record<string, string>) => void;
}) => {
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();
  const [name, setName] = useState(initialData?.name || '');
  const [yieldPercentage, setYieldPercentage] = useState(initialData?.yieldPercentage ?? 100);
  const [workTimeMinutes, setWorkTimeMinutes] = useState(initialData?.workTimeMinutes ?? 0);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [folder, setFolder] = useState(initialData?.folder || '');
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

  if (!isOpen) return null;

  const addIngredient = () => {
    if (selIngId && selQty) {
      setRecipeIngredients(prev => [
        ...prev,
        { id: Date.now().toString(), ingredientId: selIngId, quantityInGrams: Number(selQty) },
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

  const addPreset = () => {
    if (presetName && presetGrams) {
      setPresets(prev => [
        ...prev,
        { id: Date.now().toString(), name: presetName, targetWeightGrams: Number(presetGrams) },
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={workTimeMinutes}
                onChange={e => setWorkTimeMinutes(parseFloat(e.target.value) || 0)}
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
                  <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
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

          {/* ── Live cost summary ── */}
          <div className="flex items-center gap-6 px-4 py-3 bg-blue-50 rounded-lg border border-blue-100">
            <div>
              <span className="text-xs text-blue-600 font-medium">Live Cost</span>
              <p className="text-lg font-bold text-blue-700">€{liveCost.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-xs text-blue-600 font-medium">Weight</span>
              <p className="text-lg font-bold text-blue-700">{liveWeight.toFixed(0)}g</p>
            </div>
            {liveWeight > 0 && (
              <div>
                <span className="text-xs text-blue-600 font-medium">Cost/kg</span>
                <p className="text-lg font-bold text-blue-700">€{((liveCost / liveWeight) * 1000).toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* ── Ingredients table ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.recipes.ingredients}</h3>
            <table className="w-full text-left text-sm mb-3">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="py-1.5 font-medium">{t.recipes.ingredient}</th>
                  <th className="py-1.5 font-medium">{t.recipes.quantity}</th>
                  <th className="py-1.5 font-medium">{t.recipes.cost}</th>
                  <th className="py-1.5 font-medium text-right">{t.recipes.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipeIngredients.map(ri => {
                  const ing = ingredients.find((i: any) => i.id === ri.ingredientId);
                  const cost = ing
                    ? ing.priceType === 'perUnit'
                      ? ing.pricePerKg * ri.quantityInGrams
                      : (ing.pricePerKg / 1000) * ri.quantityInGrams
                    : 0;
                  return (
                    <tr key={ri.id}>
                      <td className="py-2 text-sm">{ing ? getTranslatedName(ing) : 'Unknown'}</td>
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
                  );
                })}
                {recipeIngredients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-gray-400 text-xs italic">
                      {t.recipes.noIngredients}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex flex-col gap-3">
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
                  onClick={addIngredient}
                  disabled={!selIngId || !selQty}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
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
            <div className="flex gap-2 items-end">
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
                onClick={addPreset}
                disabled={!presetName || !presetGrams}
                className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 disabled:opacity-50"
              >
                Add Preset
              </button>
            </div>
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

/* ── Add folder dialog ── */
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
  const [selIcon, setSelIcon] = useState(FOLDER_COLORS[0].icon);

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
              placeholder="e.g., Cakes"
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

/* ── Main view ── */
export const RecipesView = () => {
  const { state, addRecipe, updateRecipe, deleteRecipe, addFolder, deleteFolder, updateTranslations } = useAppContext();
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{ id: string; name: string } | null>(null);

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
        id: Date.now().toString(),
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

  /* Filtered recipes */
  const filteredRecipes = useMemo(() => {
    return state.recipes.filter(r => {
      const matchesSearch = !search || getTranslatedName(r).toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase());
      const matchesFolder = activeFolder === 'all' || (activeFolder === 'uncategorized' ? !r.folder : r.folder === activeFolder);
      return matchesSearch && matchesFolder;
    });
  }, [state.recipes, search, activeFolder]);

  const folders = state.recipeFolders || [];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.recipes.title}</h2>
          <p className="text-gray-500">{t.recipes.subtitle}</p>
        </div>
        <button
          onClick={() => { setEditingRecipe(null); setShowRecipeModal(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t.recipes.createRecipe}
        </button>
      </div>

      {/* ── Search ── */}
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

      {/* ── Folder tabs ── */}
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
          {t.recipes.newFolder}
        </button>
      </div>

      {/* ── Recipe cards ── */}
      <div className="space-y-4">
        {filteredRecipes.length === 0 && (
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 text-gray-500">
            {search ? `${t.recipes.noMatch} "${search}".` : t.recipes.empty}
          </div>
        )}

        {filteredRecipes.map(recipe => {
          const isExpanded = expandedId === recipe.id;
          const totalCost = calculateRecipeCost(recipe, state.ingredients);
          const totalWeight = calculateRecipeWeight(recipe);
          const costPerKg = totalWeight > 0 ? (totalCost / totalWeight) * 1000 : 0;
          const folderInfo = folders.find(f => f.id === recipe.folder);

          return (
            <div key={recipe.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div
                className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900">{getTranslatedName(recipe)}</h3>
                    {folderInfo && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${folderInfo.color}20`, color: folderInfo.color }}
                      >
                        {folderInfo.icon} {folderInfo.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 flex-wrap">
                    <span>Yield: {recipe.yieldPercentage}%</span>
                    <span>Work Time: {recipe.workTimeMinutes} mins</span>
                    <span>Total Weight: {totalWeight.toFixed(0)}g</span>
                    {recipe.notes && (
                      <span className="text-gray-400 max-w-xs truncate" title={recipe.notes}>
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
                    <p className="text-sm text-gray-500">Live Cost</p>
                    <p className="text-lg font-bold text-blue-600">€{totalCost.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">€{costPerKg.toFixed(2)} / kg</p>
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
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  {/* Read-only ingredient summary */}
                  <table className="w-full text-left mb-4">
                    <thead>
                      <tr className="text-sm text-gray-500 border-b border-gray-200">
                        <th className="pb-2 font-medium">Ingredient</th>
                        <th className="pb-2 font-medium">Quantity (g)</th>
                        <th className="pb-2 font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recipe.ingredients.map(ri => {
                        const ing = state.ingredients.find(i => i.id === ri.ingredientId);
                        const cost = ing
                          ? ing.priceType === 'perUnit'
                            ? ing.pricePerKg * ri.quantityInGrams
                            : (ing.pricePerKg / 1000) * ri.quantityInGrams
                          : 0;
                        return (
                          <tr key={ri.id}>
                            <td className="py-2 text-sm">{ing ? getTranslatedName(ing) : 'Unknown'}</td>
                            <td className="py-2 text-sm">{ri.quantityInGrams}g</td>
                            <td className="py-2 text-sm">€{cost.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {recipe.ingredients.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-4 text-sm text-center text-gray-400">
                            {t.recipes.noIngredientsEdit}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Presets */}
                  {(recipe.presets || []).length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm">{t.recipes.kitchenPresets}</h4>
                      <div className="flex flex-wrap gap-2">
                        {(recipe.presets || []).map(p => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-800 text-sm px-3 py-1.5 rounded-full"
                          >
                            <span className="font-medium">{p.name}</span>
                            <span className="text-orange-500 text-xs">({p.targetWeightGrams}g)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => { setEditingRecipe(recipe); setShowRecipeModal(true); }}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {t.recipes.editThisRecipe}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Modals ── */}
      {showRecipeModal && (
        <RecipeModal
          isOpen={true}
          onClose={() => { setShowRecipeModal(false); setEditingRecipe(null); }}
          onSave={handleSaveRecipe}
          initialData={editingRecipe ?? undefined}
          ingredients={state.ingredients}
          folders={folders}
          isEditing={!!editingRecipe}
          onUpdateTranslations={editingRecipe ? (tr) => updateTranslations('recipe', editingRecipe.id, tr) : undefined}
        />
      )}

      {showAddFolder && (
        <AddFolderDialog
          isOpen={true}
          onClose={() => setShowAddFolder(false)}
          onSave={(name, color, icon) => addFolder('recipe', { id: Date.now().toString(), name, color, icon })}
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
    </div>
  );
};
