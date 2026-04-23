import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { ConfirmDialog } from './ConfirmDialog';
import { Plus, Trash2, Edit2, Save, X, Weight, Package, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type PriceType = 'perKg' | 'perUnit';
type SortField = 'name' | 'supplier' | 'lastUpdate';
type SortDir = 'asc' | 'desc';

/* ── Helpers ── */
const PriceTypeToggle = ({
  value,
  onChange,
}: {
  value: PriceType;
  onChange: (v: PriceType) => void;
}) => (
  <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm font-medium">
    <button
      type="button"
      onClick={() => onChange('perKg')}
      className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
        value === 'perKg' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Weight className="w-3.5 h-3.5" />
      per Kg
    </button>
    <button
      type="button"
      onClick={() => onChange('perUnit')}
      className={`flex items-center gap-1.5 px-3 py-2 border-l border-gray-300 transition-colors ${
        value === 'perUnit' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Package className="w-3.5 h-3.5" />
      per Unit
    </button>
  </div>
);

const PriceTypeBadge = ({ priceType }: { priceType: PriceType }) =>
  priceType === 'perUnit' ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
      <Package className="w-3 h-3" /> Unit
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
      <Weight className="w-3 h-3" /> Kg
    </span>
  );

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

const todayIso = () => new Date().toISOString().split('T')[0];

/* ── Sort header helper ── */
const SortHeader = ({
  label,
  field,
  activeField,
  activeDir,
  onSort,
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  activeDir: SortDir;
  onSort: (field: SortField) => void;
}) => {
  const isActive = activeField === field;
  return (
    <th
      className="p-4 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        {isActive ? (
          activeDir === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
        )}
      </div>
    </th>
  );
};

/* ── Main component ── */
export const IngredientsView = () => {
  const { state, addIngredient, updateIngredient, deleteIngredient } = useAppContext();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [newIngredient, setNewIngredient] = useState<{
    name: string;
    pricePerKg: number;
    priceType: PriceType;
    supplier: string;
    lastUpdate: string;
  }>({ name: '', pricePerKg: 0, priceType: 'perKg', supplier: '', lastUpdate: todayIso() });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    pricePerKg: number;
    priceType: PriceType;
    supplier: string;
    lastUpdate: string;
  }>({ name: '', pricePerKg: 0, priceType: 'perKg', supplier: '', lastUpdate: '' });

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  /* Sort toggle */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  /* Actions */
  const handleAdd = () => {
    if (!newIngredient.name) return;
    addIngredient({
      id: Date.now().toString(),
      name: newIngredient.name,
      pricePerKg: newIngredient.pricePerKg,
      priceType: newIngredient.priceType,
      supplier: newIngredient.supplier,
      lastUpdate: newIngredient.lastUpdate,
    });
    setNewIngredient({ name: '', pricePerKg: 0, priceType: 'perKg', supplier: '', lastUpdate: todayIso() });
    setIsAdding(false);
  };

  const startEdit = (ingredient: any) => {
    setEditingId(ingredient.id);
    setEditForm({
      name: ingredient.name,
      pricePerKg: ingredient.pricePerKg,
      priceType: ingredient.priceType ?? 'perKg',
      supplier: ingredient.supplier ?? '',
      lastUpdate: ingredient.lastUpdate ?? todayIso(),
    });
  };

  const saveEdit = () => {
    if (editingId) {
      updateIngredient(editingId, { ...editForm, lastUpdate: todayIso() });
      setEditingId(null);
    }
  };

  /* Filtered & sorted list */
  const filtered = useMemo(() => {
    let list = state.ingredients.filter((ing) => {
      const q = search.toLowerCase();
      return (
        ing.name.toLowerCase().includes(q) ||
        (ing.supplier ?? '').toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'supplier':
          cmp = (a.supplier ?? '').localeCompare(b.supplier ?? '');
          break;
        case 'lastUpdate':
          cmp = (a.lastUpdate ?? '').localeCompare(b.lastUpdate ?? '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [state.ingredients, search, sortField, sortDir]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.ingredients.title}</h2>
          <p className="text-gray-500">{t.ingredients.subtitle}</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t.ingredients.addIngredient}
        </button>
      </div>

      {/* ── Search box ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={t.ingredients.searchPlaceholder}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        {/* Datalist for supplier autocomplete */}
        <datalist id="supplier-list">
          {Array.from(new Set(state.ingredients.map(i => i.supplier).filter(Boolean))).map(supplier => (
            <option key={supplier} value={supplier} />
          ))}
        </datalist>

        <table className="w-full min-w-[700px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortHeader label={t.ingredients.ingredientName} field="name" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
              <th className="p-4 font-medium text-gray-600">{t.ingredients.pricingType}</th>
              <th className="p-4 font-medium text-gray-600">{t.ingredients.price}</th>
              <SortHeader label={t.ingredients.supplier} field="supplier" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
              <SortHeader label={t.ingredients.lastUpdate} field="lastUpdate" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
              <th className="p-4 font-medium text-gray-600 text-right">{t.ingredients.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">

            {/* ── Add row ── */}
            {isAdding && (
              <tr className="bg-blue-50/50">
                <td className="p-4">
                  <input
                    type="text"
                    placeholder="e.g., Flour"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newIngredient.name}
                    onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                    autoFocus
                  />
                </td>
                <td className="p-4">
                  <PriceTypeToggle
                    value={newIngredient.priceType}
                    onChange={(v) => setNewIngredient({ ...newIngredient, priceType: v })}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-sm">€</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={newIngredient.priceType === 'perKg' ? '0.00 / kg' : '0.00 / unit'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newIngredient.pricePerKg || ''}
                      onChange={(e) =>
                        setNewIngredient({ ...newIngredient, pricePerKg: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    list="supplier-list"
                    placeholder="Supplier name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newIngredient.supplier}
                    onChange={(e) => setNewIngredient({ ...newIngredient, supplier: e.target.value })}
                  />
                </td>
                <td className="p-4">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={newIngredient.lastUpdate}
                    onChange={(e) => setNewIngredient({ ...newIngredient, lastUpdate: e.target.value })}
                  />
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={handleAdd} className="p-2 text-green-600 hover:bg-green-50 rounded-md">
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsAdding(false)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-md">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Empty state ── */}
            {filtered.length === 0 && !isAdding && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  {search ? `${t.ingredients.noMatch} "${search}".` : t.ingredients.empty}
                </td>
              </tr>
            )}

            {/* ── Ingredient rows ── */}
            {filtered.map((ingredient) => (
              <tr key={ingredient.id} className="hover:bg-gray-50 transition-colors">
                {editingId === ingredient.id ? (
                  <>
                    <td className="p-4">
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </td>
                    <td className="p-4">
                      <PriceTypeToggle
                        value={editForm.priceType}
                        onChange={(v) => setEditForm({ ...editForm, priceType: v })}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">€</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editForm.pricePerKg}
                          onChange={(e) =>
                            setEditForm({ ...editForm, pricePerKg: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <input
                        type="text"
                        list="supplier-list"
                        placeholder="Supplier name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.supplier}
                        onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={editForm.lastUpdate}
                        onChange={(e) => setEditForm({ ...editForm, lastUpdate: e.target.value })}
                      />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={saveEdit} className="p-2 text-green-600 hover:bg-green-50 rounded-md">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-md">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-4 font-medium text-gray-900">{ingredient.name}</td>
                    <td className="p-4">
                      <PriceTypeBadge priceType={(ingredient as any).priceType ?? 'perKg'} />
                    </td>
                    <td className="p-4 text-gray-600">
                      €{ingredient.pricePerKg.toFixed(2)}
                      <span className="text-gray-400 text-xs ml-1">
                        / {(ingredient as any).priceType === 'perUnit' ? 'unit' : 'kg'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      {(ingredient as any).supplier || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {formatDate((ingredient as any).lastUpdate)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(ingredient)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: ingredient.id, name: ingredient.name })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t.ingredients.deleteTitle}
        message={`${t.ingredients.deleteMsg} "${deleteTarget?.name}"? ${t.ingredients.trashNote}`}
        confirmLabel={t.ingredients.deleteConfirm}
        cancelLabel={t.common.cancel}
        onConfirm={() => {
          if (deleteTarget) deleteIngredient(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
