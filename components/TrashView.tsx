import React, { useState } from 'react';
import { useAppContext } from '@/lib/context';
import { ConfirmDialog } from './ConfirmDialog';
import { Trash2, RotateCcw, AlertTriangle, Carrot, ChefHat, UtensilsCrossed } from 'lucide-react';

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const typeIcon = (type: string) => {
  switch (type) {
    case 'ingredient': return <Carrot className="w-4 h-4" />;
    case 'recipe': return <ChefHat className="w-4 h-4" />;
    case 'dish': return <UtensilsCrossed className="w-4 h-4" />;
    default: return null;
  }
};

const typeBadge = (type: string) => {
  const styles: Record<string, string> = {
    ingredient: 'bg-green-50 text-green-700 border-green-200',
    recipe: 'bg-blue-50 text-blue-700 border-blue-200',
    dish: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${styles[type] || ''}`}>
      {typeIcon(type)}
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
};

export const TrashView = () => {
  const { state, restoreFromTrash, permanentlyDelete, emptyTrash } = useAppContext();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const trash = state.trash || [];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trash</h2>
          <p className="text-gray-500">
            Deleted items are kept here. You can restore or permanently delete them.
          </p>
        </div>
        {trash.length > 0 && (
          <button
            onClick={() => setConfirmEmpty(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Empty Trash ({trash.length})
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {trash.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Trash2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">Trash is empty</p>
          <p className="text-gray-300 text-sm mt-1">Deleted items will appear here for recovery.</p>
        </div>
      )}

      {/* ── Trash items ── */}
      {trash.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-medium text-gray-600 text-sm">Type</th>
                <th className="p-4 font-medium text-gray-600 text-sm">Name</th>
                <th className="p-4 font-medium text-gray-600 text-sm">Deleted At</th>
                <th className="p-4 font-medium text-gray-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trash.map(item => {
                const name = (item.data as any).name || 'Unknown';
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">{typeBadge(item.originalType)}</td>
                    <td className="p-4 font-medium text-gray-900">{name}</td>
                    <td className="p-4 text-sm text-gray-500">{formatDate(item.deletedAt)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => restoreFromTrash(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: item.id, name })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Confirm dialogs ── */}
      <ConfirmDialog
        isOpen={confirmEmpty}
        title="Empty Trash"
        message={`This will permanently delete all ${trash.length} item(s) in the trash. This action cannot be undone.`}
        confirmLabel="Delete All Permanently"
        onConfirm={() => { emptyTrash(); setConfirmEmpty(false); }}
        onCancel={() => setConfirmEmpty(false)}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Permanently Delete"
        message={`Permanently delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete Forever"
        onConfirm={() => { if (confirmDelete) permanentlyDelete(confirmDelete.id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
