import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { Plus, Trash2, Edit2, Save, X, Weight, Package } from 'lucide-react';

type PriceType = 'perKg' | 'perUnit';

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
        value === 'perKg'
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Weight className="w-3.5 h-3.5" />
      per Kg
    </button>
    <button
      type="button"
      onClick={() => onChange('perUnit')}
      className={`flex items-center gap-1.5 px-3 py-2 border-l border-gray-300 transition-colors ${
        value === 'perUnit'
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-600 hover:bg-gray-50'
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

export const IngredientsView = () => {
  const { state, addIngredient, updateIngredient, deleteIngredient } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newIngredient, setNewIngredient] = useState<{
    name: string;
    pricePerKg: number;
    priceType: PriceType;
  }>({ name: '', pricePerKg: 0, priceType: 'perKg' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    pricePerKg: number;
    priceType: PriceType;
  }>({ name: '', pricePerKg: 0, priceType: 'perKg' });

  const handleAdd = () => {
    if (!newIngredient.name) return;
    addIngredient({
      id: Date.now().toString(),
      name: newIngredient.name,
      pricePerKg: newIngredient.pricePerKg,
      priceType: newIngredient.priceType,
    });
    setNewIngredient({ name: '', pricePerKg: 0, priceType: 'perKg' });
    setIsAdding(false);
  };

  const startEdit = (ingredient: any) => {
    setEditingId(ingredient.id);
    setEditForm({
      name: ingredient.name,
      pricePerKg: ingredient.pricePerKg,
      priceType: ingredient.priceType ?? 'perKg',
    });
  };

  const saveEdit = () => {
    if (editingId) {
      updateIngredient(editingId, editForm);
      setEditingId(null);
    }
  };

  const priceLabel = (pt: PriceType) => (pt === 'perUnit' ? '€/unit' : '€/Kg');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Master Price List</h2>
          <p className="text-gray-500">Update ingredient prices here. All recipes will update automatically.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Ingredient
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-medium text-gray-600">Ingredient Name</th>
              <th className="p-4 font-medium text-gray-600">Pricing Type</th>
              <th className="p-4 font-medium text-gray-600">Price (€)</th>
              <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
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

            {state.ingredients.length === 0 && !isAdding && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No ingredients found. Add one to get started.
                </td>
              </tr>
            )}

            {state.ingredients.map((ingredient) => (
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
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(ingredient)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteIngredient(ingredient.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md">
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
    </div>
  );
};
