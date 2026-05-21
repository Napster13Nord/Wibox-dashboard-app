import React, { useState, useEffect } from 'react';
import { ProductLabel } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { X, Save, Loader2, Tag } from 'lucide-react';

interface LabelDetailModalProps {
  label: ProductLabel | null; // null = create new
  onClose: () => void;
  onSaved: () => void;
}

const emptyLabel: ProductLabel = {
  id: '',
  tuotenro: '',
  eanCode: '',
  nameSv: '',
  nameFi: '',
  weight: '',
  bestBeforeDays: undefined,
  ingredientsSv: '',
  ingredientsFi: '',
  ingredientsSv2: '',
  ingredientsFi2: '',
  energy: '',
  fat: '',
  fatSaturated: '',
  carbs: '',
  sugar: '',
  protein: '',
  salt: '',
  fiber: '',
  extraLine: '',
  notes: '',
};

export const LabelDetailModal: React.FC<LabelDetailModalProps> = ({
  label,
  onClose,
  onSaved,
}) => {
  const { t } = useI18n();
  const isEditing = !!label;
  const [form, setForm] = useState<ProductLabel>(label ?? { ...emptyLabel });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(label ?? { ...emptyLabel });
  }, [label]);

  const update = (field: keyof ProductLabel, value: string | number | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.nameSv && !form.nameFi) {
      setError('At least one name (SV or FI) is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { ...form };
      if (!isEditing) {
        body.id = `lbl_${Date.now()}`;
      }
      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';
  const textareaClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y min-h-[60px]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? `Edit: ${label?.nameSv || label?.nameFi || 'Label'}` : 'New Label'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Section: Identification */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Identification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Product Number (Tuotenro)</label>
                <input
                  className={inputClass}
                  value={form.tuotenro || ''}
                  onChange={e => update('tuotenro', e.target.value)}
                  placeholder="e.g. 1111"
                />
              </div>
              <div>
                <label className={labelClass}>EAN Code</label>
                <input
                  className={inputClass}
                  value={form.eanCode || ''}
                  onChange={e => update('eanCode', e.target.value)}
                  placeholder="e.g. 6430010300XX"
                />
              </div>
              <div>
                <label className={labelClass}>Name (SV) *</label>
                <input
                  className={inputClass}
                  value={form.nameSv}
                  onChange={e => update('nameSv', e.target.value)}
                  placeholder="Product name in Swedish"
                />
              </div>
              <div>
                <label className={labelClass}>Name (FI)</label>
                <input
                  className={inputClass}
                  value={form.nameFi}
                  onChange={e => update('nameFi', e.target.value)}
                  placeholder="Product name in Finnish"
                />
              </div>
              <div>
                <label className={labelClass}>Weight</label>
                <input
                  className={inputClass}
                  value={form.weight || ''}
                  onChange={e => update('weight', e.target.value)}
                  placeholder="e.g. 560 g"
                />
              </div>
              <div>
                <label className={labelClass}>Best Before (days)</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.bestBeforeDays ?? ''}
                  onChange={e => update('bestBeforeDays', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 14"
                />
              </div>
            </div>
          </div>

          {/* Section: Ingredients */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Ingredients
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Ingredients (SV)</label>
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={form.ingredientsSv || ''}
                  onChange={e => update('ingredientsSv', e.target.value)}
                  placeholder="Ingredient list in Swedish…"
                />
              </div>
              <div>
                <label className={labelClass}>Ingredients (FI)</label>
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={form.ingredientsFi || ''}
                  onChange={e => update('ingredientsFi', e.target.value)}
                  placeholder="Ingredient list in Finnish…"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ingredients SV (cont.)</label>
                  <textarea
                    className={textareaClass}
                    rows={2}
                    value={form.ingredientsSv2 || ''}
                    onChange={e => update('ingredientsSv2', e.target.value)}
                    placeholder="Continuation…"
                  />
                </div>
                <div>
                  <label className={labelClass}>Ingredients FI (cont.)</label>
                  <textarea
                    className={textareaClass}
                    rows={2}
                    value={form.ingredientsFi2 || ''}
                    onChange={e => update('ingredientsFi2', e.target.value)}
                    placeholder="Continuation…"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Nutritional Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Nutritional Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Energy</label>
                <input
                  className={inputClass}
                  value={form.energy || ''}
                  onChange={e => update('energy', e.target.value)}
                  placeholder="e.g. 197 kcal/862 kJ"
                />
              </div>
              <div>
                <label className={labelClass}>Fat</label>
                <input
                  className={inputClass}
                  value={form.fat || ''}
                  onChange={e => update('fat', e.target.value)}
                  placeholder="e.g. 5,8 g"
                />
              </div>
              <div>
                <label className={labelClass}>Fat (saturated)</label>
                <input
                  className={inputClass}
                  value={form.fatSaturated || ''}
                  onChange={e => update('fatSaturated', e.target.value)}
                  placeholder="e.g. 0,6 g"
                />
              </div>
              <div>
                <label className={labelClass}>Carbs</label>
                <input
                  className={inputClass}
                  value={form.carbs || ''}
                  onChange={e => update('carbs', e.target.value)}
                  placeholder="e.g. 34,9 g"
                />
              </div>
              <div>
                <label className={labelClass}>Sugar</label>
                <input
                  className={inputClass}
                  value={form.sugar || ''}
                  onChange={e => update('sugar', e.target.value)}
                  placeholder="e.g. 9,0 g"
                />
              </div>
              <div>
                <label className={labelClass}>Protein</label>
                <input
                  className={inputClass}
                  value={form.protein || ''}
                  onChange={e => update('protein', e.target.value)}
                  placeholder="e.g. 7,5 g"
                />
              </div>
              <div>
                <label className={labelClass}>Salt</label>
                <input
                  className={inputClass}
                  value={form.salt || ''}
                  onChange={e => update('salt', e.target.value)}
                  placeholder="e.g. 1,07 g"
                />
              </div>
              <div>
                <label className={labelClass}>Fiber</label>
                <input
                  className={inputClass}
                  value={form.fiber || ''}
                  onChange={e => update('fiber', e.target.value)}
                  placeholder="e.g. 8,2 g"
                />
              </div>
            </div>
          </div>

          {/* Section: Extra */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Extra
            </h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Extra Line (storage / allergens)</label>
                <input
                  className={inputClass}
                  value={form.extraLine || ''}
                  onChange={e => update('extraLine', e.target.value)}
                  placeholder="e.g. FÖRVARING UNDER +8 °C – SÄILYTYS ALLE +8 °C"
                />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={textareaClass}
                  rows={2}
                  value={form.notes || ''}
                  onChange={e => update('notes', e.target.value)}
                  placeholder="Internal notes…"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving…' : t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
};
