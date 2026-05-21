import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProductLabel } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { ConfirmDialog } from './ConfirmDialog';
import { LabelDetailModal } from './LabelDetailModal';
import {
  Plus, Trash2, Edit2, Search, X, Printer, Loader2,
  ArrowUpDown, ArrowUp, ArrowDown, Tag,
} from 'lucide-react';

type SortField = 'name' | 'ean' | 'weight' | 'bestBefore';
type SortDir = 'asc' | 'desc';

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
export const LabelsView = () => {
  const { t } = useI18n();

  // Data state
  const [labels, setLabels] = useState<ProductLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // UI state
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Modal state
  const [modalLabel, setModalLabel] = useState<ProductLabel | null | 'new'>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  /* ── Fetch labels ── */
  const fetchLabels = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await fetch('/api/labels');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProductLabel[] = await res.json();
      setLabels(data);
    } catch (err) {
      console.error('[LabelsView] fetch error:', err);
      setFetchError('Failed to load labels. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  /* ── Sort toggle ── */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  /* ── Delete handler ── */
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/labels?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setLabels(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('[LabelsView] delete error:', err);
      alert('Failed to delete label. Please try again.');
    }
  };

  /* ── Filtered & sorted list ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = labels;

    if (q) {
      list = labels.filter(l =>
        l.nameSv.toLowerCase().includes(q) ||
        l.nameFi.toLowerCase().includes(q) ||
        (l.eanCode || '').toLowerCase().includes(q) ||
        (l.tuotenro || '').toLowerCase().includes(q) ||
        (l.weight || '').toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.nameSv || a.nameFi).localeCompare(b.nameSv || b.nameFi);
          break;
        case 'ean':
          cmp = (a.eanCode || '').localeCompare(b.eanCode || '');
          break;
        case 'weight':
          cmp = (a.weight || '').localeCompare(b.weight || '');
          break;
        case 'bestBefore':
          cmp = (a.bestBeforeDays ?? 0) - (b.bestBeforeDays ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [labels, search, sortField, sortDir]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.labels.title}</h2>
          <p className="text-gray-500">{t.labels.subtitle}</p>
        </div>
        <button
          onClick={() => setModalLabel('new')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t.labels.addLabel}
        </button>
      </div>

      {/* ── Search box ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={t.labels.searchPlaceholder}
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

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-500 text-sm">Loading labels…</span>
        </div>
      )}

      {/* ── Error state ── */}
      {fetchError && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {fetchError}
          <button onClick={fetchLabels} className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !fetchError && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-max w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortHeader label={t.labels.productName} field="name" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
                <SortHeader label="EAN" field="ean" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
                <SortHeader label={t.labels.weight} field="weight" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
                <SortHeader label={t.labels.bestBefore} field="bestBefore" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
                <th className="p-4 font-medium text-gray-600 text-right">{t.labels.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* ── Empty state ── */}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    {search ? `${t.labels.noMatch} "${search}".` : t.labels.empty}
                  </td>
                </tr>
              )}

              {/* ── Label rows ── */}
              {filtered.map((label) => (
                <tr key={label.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{label.nameSv || label.nameFi}</p>
                        {label.nameSv && label.nameFi && label.nameSv !== label.nameFi && (
                          <p className="text-xs text-gray-400 truncate">{label.nameFi}</p>
                        )}
                        {label.tuotenro && (
                          <p className="text-xs text-gray-400">#{label.tuotenro}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 font-mono">
                    {label.eanCode || <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {label.weight || <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {label.bestBeforeDays != null ? (
                      <span>{label.bestBeforeDays} {t.labels.days}</span>
                    ) : (
                      <span className="text-gray-300 italic">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setModalLabel(label)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title={t.common.edit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        disabled
                        className="p-2 text-gray-300 cursor-not-allowed rounded-md"
                        title={t.labels.printDisabledTooltip}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: label.id, name: label.nameSv || label.nameFi })}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Count ── */}
      {!loading && !fetchError && (
        <p className="text-xs text-gray-400 text-right">
          {filtered.length} / {labels.length} {t.labels.labelsCount}
        </p>
      )}

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t.labels.deleteTitle}
        message={`${t.labels.deleteMsg} "${deleteTarget?.name}"?`}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Detail / Create Modal ── */}
      {modalLabel !== null && (
        <LabelDetailModal
          label={modalLabel === 'new' ? null : modalLabel}
          onClose={() => setModalLabel(null)}
          onSaved={fetchLabels}
        />
      )}
    </div>
  );
};
