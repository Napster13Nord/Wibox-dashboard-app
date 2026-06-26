import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';
import { Recipe, RecipeIngredient, RecipePreset, Folder as FolderType, Ingredient } from '@/lib/types';
import { newId } from '@/lib/utils';
import { IngredientCombobox } from '../IngredientCombobox';
import { TranslationEditor } from '../TranslationEditor';
import { Save, X, Clock, AlertTriangle, GripVertical } from 'lucide-react';

/** Payload emitted by RecipeModal.onSave — a Recipe without a server-assigned
 *  id (id present only when editing an existing recipe). */
export type RecipeFormData = Omit<Recipe, 'id'> & { id?: string };

/* ── Recipe Modal ── */
export const RecipeModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  ingredients,
  folders,
  isEditing,
  defaultFolder,
  onUpdateTranslations,
  zClassName = 'z-50',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: RecipeFormData) => void;
  initialData?: Recipe;
  ingredients: Ingredient[];
  folders: FolderType[];
  isEditing: boolean;
  defaultFolder?: string;
  onUpdateTranslations?: (translations: Record<string, string>) => void;
  /** Tailwind z-index class for the overlay. Override when stacking above
   *  another modal (e.g. inline recipe edit from Dish Building). */
  zClassName?: string;
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
  const tempRecipe: Recipe = { id: '', name: '', ingredients: recipeIngredients, yieldPercentage, workTimeMinutes, presets, notes };
  const liveCost = calculateRecipeCost(tempRecipe, ingredients);
  const liveWeight = calculateRecipeWeight(tempRecipe);

  return (
    <div className={`fixed inset-0 ${zClassName} flex items-start justify-center overflow-y-auto`}>
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
                {folders.map((f) => (
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
          {recipeIngredients.some(ri => !ingredients.find((i) => i.id === ri.ingredientId)) && (
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
                  const ing = ingredients.find((i) => i.id === ri.ingredientId);
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
