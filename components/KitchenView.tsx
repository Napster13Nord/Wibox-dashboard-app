import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n, localeLabels, Locale } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { calculateRecipeWeight, calculateRecipeCost } from '@/lib/calculations';
import { ChefHat, Scale, Printer, Calculator, Search, X, Eye, ArrowLeft } from 'lucide-react';
import { RecipeDetailModal } from './RecipeDetailModal';

export const KitchenView = () => {
  const { state } = useAppContext();
  const { t, locale, setLocale } = useI18n();
  const getTranslatedName = useTranslatedName();

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
  const [kitchenSearch, setKitchenSearch] = useState('');

  // Folder filter (null means show folder cards)
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [viewingRecipeId, setViewingRecipeId] = useState<string | null>(null);


  const selectedRecipe = state.recipes.find(r => r.id === selectedRecipeId);
  const presets = selectedRecipe?.presets || [];
  const baseWeight = selectedRecipe ? calculateRecipeWeight(selectedRecipe) : 0;
  const effectiveSF = scaleFactor ?? 1;
  const totalTargetWeight = baseWeight * effectiveSF;

  const folders = state.recipeFolders || [];

  // Filtered recipes (folder + search)
  const filteredRecipes = useMemo(() => {
    return state.recipes.filter(r => {
      const matchesSearch = !kitchenSearch
        || getTranslatedName(r).toLowerCase().includes(kitchenSearch.toLowerCase())
        || r.name.toLowerCase().includes(kitchenSearch.toLowerCase());
      const matchesFolder = activeFolder === 'all'
        || (activeFolder === 'uncategorized' ? !r.folder : r.folder === activeFolder);
      return matchesSearch && matchesFolder;
    });
  }, [state.recipes, kitchenSearch, activeFolder]);

  // ── Safe quantity display ──
  // IMPORTANT: use toFixed (not toLocaleString) for type="number" inputs —
  // toLocaleString uses system locale (e.g. PT uses commas: "0,1") which
  // number inputs reject, showing blank.
  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return isFinite(n) && n > 0 ? n : 0;
  };

  const getDisplayQty = (riId: string, baseQty: unknown): string => {
    if (editingValues[riId] !== undefined) return editingValues[riId];
    const base = safeNum(baseQty);
    if (base === 0) return '';
    const q = base * effectiveSF;
    return q.toFixed(1); // plain dot decimal — always valid in number inputs
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
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t.kitchen.title}</h2>
            <p className="text-gray-500">{t.kitchen.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeFolder !== null && !selectedRecipe && (
            <button
              onClick={() => setActiveFolder(null)}
              className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-base rounded-xl border border-gray-300 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              {t.kitchen.backToFolders}
            </button>
          )}
          {/* Language switcher for kitchen users */}
          <div className="flex gap-1">
            {(Object.keys(localeLabels) as Locale[]).map((loc) => (
              <button
                key={loc}
                onClick={() => setLocale(loc)}
                className={`text-lg px-2 py-1 rounded-lg transition-colors ${
                  locale === loc
                    ? 'bg-blue-100 ring-2 ring-blue-400 scale-110'
                    : 'hover:bg-gray-100'
                }`}
                title={localeLabels[loc].label}
              >
                {localeLabels[loc].flag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Instructions ── */}
      {!selectedRecipe && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5 print:hidden">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <Scale className="w-4.5 h-4.5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-orange-900 mb-2">How to use the Kitchen Scale</h3>
              <ol className="text-sm text-orange-800 space-y-1.5 list-decimal list-inside">
                <li><strong>Select a recipe</strong> from the list below to start scaling.</li>
                <li><strong>Set quantities</strong> — choose how many of each preset you need, or enter a custom weight.</li>
                <li><strong>Review the scaled ingredients</strong> — all quantities are recalculated automatically.</li>
                <li><strong>Edit any ingredient</strong> — click a value in the scaled list to adjust it, and all other ingredients will re-scale.</li>
                <li><strong>Print</strong> the scaled recipe using the 🖨️ button or <kbd className="px-1.5 py-0.5 bg-orange-100 border border-orange-300 rounded text-xs font-mono">Ctrl+P</kbd>.</li>
              </ol>
              <p className="text-xs text-orange-500 mt-2">💡 Tip: Use the 👁 icon on any recipe card to preview its full details without entering scale mode.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 0: Pick a folder ── */}
      {activeFolder === null && !selectedRecipe ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:hidden">
          <button
            onClick={() => setActiveFolder('all')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-900 transition-all gap-3 group"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 text-xl group-hover:bg-gray-200 transition-colors">
              🍽️
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">{t.kitchen.all}</h3>
              <p className="text-sm text-gray-500">{state.recipes.length} recipes</p>
            </div>
          </button>

          {folders.map(f => {
            const count = state.recipes.filter(r => r.folder === f.id).length;
            if (count === 0) return null; // Hide empty folders to reduce clutter
            return (
              <button
                key={f.id}
                onClick={() => setActiveFolder(f.id)}
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all gap-3 relative overflow-hidden group"
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
                  <h3 className="font-semibold text-gray-900">{f.name}</h3>
                  <p className="text-sm text-gray-500">{count} recipes</p>
                </div>
              </button>
            );
          })}

          {state.recipes.some(r => !r.folder) && (
            <button
              onClick={() => setActiveFolder('uncategorized')}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-400 transition-all gap-3 group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xl group-hover:bg-gray-200 transition-colors">
                📁
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">{t.kitchen.uncategorized}</h3>
                <p className="text-sm text-gray-500">{state.recipes.filter(r => !r.folder).length} recipes</p>
              </div>
            </button>
          )}
        </div>
      ) : !selectedRecipe ? (
        /* ── Step 1: Pick a recipe ── */
        <>
          {/* Search box */}
          <div className="relative max-w-sm print:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t.kitchen.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              value={kitchenSearch}
              onChange={e => setKitchenSearch(e.target.value)}
            />
            {kitchenSearch && (
              <button onClick={() => setKitchenSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ── Folder tabs ── */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <button
              onClick={() => setActiveFolder('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFolder === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.kitchen.all} ({state.recipes.length})
            </button>
            <button
              onClick={() => setActiveFolder('uncategorized')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeFolder === 'uncategorized' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.kitchen.uncategorized} ({state.recipes.filter(r => !r.folder).length})
            </button>
            {folders.map(f => {
              const count = state.recipes.filter(r => r.folder === f.id).length;
              return (
                <button
                  key={f.id}
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
              );
            })}
          </div>

          {/* ── Recipe cards (consistent with Dishes/Recipes style) ── */}
          <div className="space-y-3 print:hidden">
            {filteredRecipes.length === 0 && (
              <div className="text-center p-8 bg-white rounded-xl border border-gray-200 text-gray-500">
                {kitchenSearch ? `${t.kitchen.noMatch} "${kitchenSearch}"` : t.kitchen.noRecipes}
              </div>
            )}

            {filteredRecipes.map(recipe => {
              const totalCost = calculateRecipeCost(recipe, state.ingredients);
              const totalWeight = calculateRecipeWeight(recipe);
              const costPerKg = totalWeight > 0 ? (totalCost / totalWeight) * 1000 : 0;
              const folderInfo = folders.find(f => f.id === recipe.folder);

              return (
                <div
                  key={recipe.id}
                  className="w-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 text-left transition-all group relative"
                >
                  {/* Info button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewingRecipeId(recipe.id); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors z-10"
                    title="View recipe details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Main click area → scale */}
                  <button
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    className="w-full text-left"
                  >
                    <div className="p-4 pr-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-500 transition-colors shrink-0">
                            <ChefHat className="w-4.5 h-4.5 text-orange-600 group-hover:text-white" />
                          </div>
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
                        <div className="flex gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 flex-wrap ml-11">
                          <span>{recipe.ingredients.length} {t.kitchen.ingredients}</span>
                          <span>{t.kitchen.weight}: {totalWeight.toFixed(0)}g</span>
                          {(recipe.presets || []).length > 0 && (
                            <span className="text-orange-500">
                              🍳 {(recipe.presets || []).length} preset{(recipe.presets || []).length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:gap-6 ml-11 md:ml-0">
                        <div className="text-left md:text-right">
                          <p className="text-xs text-gray-400 font-medium">{t.kitchen.costKg}</p>
                          <p className="text-lg font-bold text-orange-600">€{costPerKg.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </>

      ) : (
        /* ── Step 2: Scale builder ── */
        <div className="space-y-6">
          <div className="flex items-center gap-4 print:hidden">
            <button onClick={handleBack} className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-base rounded-xl border border-gray-300 transition-colors shadow-sm">
              <ArrowLeft className="w-5 h-5" />
              {t.kitchen.backToRecipes}
            </button>
            <h2 className="text-xl font-bold text-gray-900">/ {getTranslatedName(selectedRecipe)}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ─── Left Panel: Size Builder ─── */}
            <div className="lg:col-span-1 print:hidden">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-orange-500" />
                  {t.kitchen.selectSizes}
                </h3>
                <p className="text-xs text-gray-400 mb-5">{t.kitchen.selectSizesDesc}</p>

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
                          <span className="text-gray-400 text-xs">{preset.targetWeightGrams}g {t.kitchen.each}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 shrink-0">{t.kitchen.qty}</label>
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
                      {t.kitchen.noPresets}
                    </p>
                  )}

                  {/* Custom weight */}
                  <div className={`rounded-lg border p-3 transition-all ${
                    parseFloat(customWeight) > 0 && !presets.some(p => parseFloat(presetQtys[p.id] || '0') > 0)
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-200'
                  }`}>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      {t.kitchen.customWeight}
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
                      <span>{t.kitchen.total}</span>
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
                  {t.kitchen.calculate}
                </button>
              </div>
            </div>

            {/* ─── Right Panel: Scaled Ingredients ─── */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm print:shadow-none print:border-none print:p-0">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1 print:text-2xl">
                      {getTranslatedName(selectedRecipe)}
                    </h1>
                    {scaleFactor !== null ? (
                      <p className="text-orange-600 font-medium">
                        {totalTargetWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })}g total
                        {calcSummary ? ` — ${calcSummary}` : ''}
                      </p>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        Base weight: {baseWeight.toFixed(0)}g — {t.kitchen.clickToEdit}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => window.print()}
                    disabled={selectedRecipe.ingredients.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors print:hidden"
                  >
                    <Printer className="w-4 h-4" />
                    {t.kitchen.print}
                  </button>
                </div>

                {selectedRecipe.ingredients.length > 0 ? (
                  <>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-900">
                          <th className="py-3 text-base font-bold text-gray-700">{t.kitchen.ingredient}</th>
                          <th className="py-3 text-base font-bold text-gray-700 text-right w-44">
                            {t.kitchen.quantityLabel}
                            <span className="block text-xs font-normal text-gray-400">{t.kitchen.clickToEdit}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedRecipe.ingredients.map(ri => {
                          const ingredient = state.ingredients.find(i => i.id === ri.ingredientId);
                          const isUnit = ingredient?.priceType === 'perUnit';
                          const displayVal = getDisplayQty(ri.id, ri.quantityInGrams);
                          const isEditing = editingValues[ri.id] !== undefined;
                          const hasData = safeNum(ri.quantityInGrams) > 0;
                          const isScaled = scaleFactor !== null;

                          return (
                            <tr key={ri.id} className="hover:bg-orange-50 transition-colors">
                              <td className="py-4 text-lg text-gray-900 font-medium">
                                {ingredient ? getTranslatedName(ingredient) : 'Unknown'}
                                {!hasData && (
                                  <span className="ml-2 text-xs text-red-400 font-normal">{t.kitchen.quantityMissing}</span>
                                )}
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    className={`w-28 px-2 py-1 rounded-lg text-right text-xl font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                                      isEditing
                                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                                        : isScaled && hasData
                                          ? 'border-transparent bg-transparent text-orange-600 hover:border-gray-300 hover:bg-white cursor-pointer'
                                          : hasData
                                            ? 'border-transparent bg-transparent text-gray-700 hover:border-gray-300 hover:bg-white cursor-pointer'
                                            : 'border-transparent bg-transparent text-red-300 hover:border-gray-300 hover:bg-white cursor-pointer'
                                    }`}
                                    value={displayVal}
                                    placeholder="0"
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

                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    <Scale className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>{t.kitchen.noIngredientsYet}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

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

      {/* ── Print-only view (Recipe Detail Modal) — for Eye icon preview ── */}
      {(() => {
        const printRecipe = viewingRecipeId ? state.recipes.find(r => r.id === viewingRecipeId) : null;
        if (!printRecipe || selectedRecipe) return null; // don't override scale print
        const totalCost = calculateRecipeCost(printRecipe, state.ingredients);
        const totalWeight = calculateRecipeWeight(printRecipe);
        const costPerKg = totalWeight > 0 ? (totalCost / totalWeight) * 1000 : 0;
        const folderInfo = folders.find(f => f.id === printRecipe.folder);
        return (
          <div className="print-only">
            <h2>{getTranslatedName(printRecipe)}</h2>
            {folderInfo && (
              <p style={{ color: '#666', marginBottom: '4pt' }}>
                {folderInfo.icon} {folderInfo.name}
              </p>
            )}
            <p className="print-meta">
              Wibox Recipe Automation · Printed {new Date().toLocaleDateString()}
            </p>
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
                  <td>{printRecipe.yieldPercentage}%</td>
                  <td>{printRecipe.workTimeMinutes} mins</td>
                </tr>
              </tbody>
            </table>
            {printRecipe.ingredients.length > 0 && (
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
                    {printRecipe.ingredients.map(ri => {
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
            {(printRecipe.presets || []).length > 0 && (
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
                    {(printRecipe.presets || []).map(p => {
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
            {printRecipe.notes && (
              <>
                <h3>Notes</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{printRecipe.notes}</p>
              </>
            )}
          </div>
        );
      })()}

      {/* ── Print-only view (Kitchen Scale) — always present, hidden on screen ── */}
      {selectedRecipe && (
        <div className="print-only">
          <h2>{getTranslatedName(selectedRecipe)}</h2>
          {scaleFactor !== null ? (
            <p className="print-subtitle">
              {totalTargetWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })}g total
              {calcSummary ? ` — ${calcSummary}` : ''}
            </p>
          ) : (
            <p className="print-subtitle">
              Base recipe — {baseWeight.toFixed(0)}g total
            </p>
          )}
          <p className="print-meta">
            Wibox Recipe Automation · Printed {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>

          <table>
            <thead>
              <tr>
                <th>{t.kitchen.ingredient}</th>
                <th style={{ textAlign: 'right' }}>{t.kitchen.quantityLabel}</th>
              </tr>
            </thead>
            <tbody>
              {selectedRecipe.ingredients.map(ri => {
                const ingredient = state.ingredients.find(i => i.id === ri.ingredientId);
                const isUnit = ingredient?.priceType === 'perUnit';
                const base = safeNum(ri.quantityInGrams);
                const scaled = base * effectiveSF;
                return (
                  <tr key={ri.id}>
                    <td>{ingredient ? getTranslatedName(ingredient) : 'Unknown'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {scaled.toFixed(1)} {isUnit ? 'unit' : 'g'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {scaleFactor !== null && (
            <p className="print-summary">
              Scale factor: {effectiveSF.toFixed(3)}x · Base weight: {baseWeight.toFixed(0)}g
            </p>
          )}
        </div>
      )}
    </div>
  );
};
