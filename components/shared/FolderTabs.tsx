import React from 'react';
import { Folder as FolderType } from '@/lib/types';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { Pencil } from 'lucide-react';

/**
 * Shared in-folder tab row: "All" / "Uncategorized (n)" / one tab per folder.
 *
 * Used by RecipesView, DishesView and KitchenView. As with {@link FolderGrid},
 * KitchenView renders read-only tabs (no edit/delete — omit `onEdit`/`onDelete`)
 * and passes `className="print:hidden"`.
 */
export interface FolderTabsProps {
  folders: FolderType[];
  /** Currently selected tab: 'all' | 'uncategorized' | folderId. */
  activeFolder: string;
  totalCount: number;
  uncategorizedCount: number;
  folderCount: (folderId: string) => number;
  labels: { all: string; uncategorized: string };
  onPick: (folderId: string) => void;
  onEdit?: (folder: FolderType) => void;
  onDelete?: (folder: FolderType) => void;
  /** Title attribute for the edit button. */
  editFolderTitle?: string;
  /** Extra classes merged onto the row container (e.g. "print:hidden"). */
  className?: string;
}

export const FolderTabs = ({
  folders,
  activeFolder,
  totalCount,
  uncategorizedCount,
  folderCount,
  labels,
  onPick,
  onEdit,
  onDelete,
  editFolderTitle,
  className = '',
}: FolderTabsProps) => {
  const getTranslatedName = useTranslatedName();

  return (
    <div className={`flex items-center gap-2 flex-wrap${className ? ` ${className}` : ''}`}>
      <button
        onClick={() => onPick('all')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          activeFolder === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {labels.all} ({totalCount})
      </button>
      <button
        onClick={() => onPick('uncategorized')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          activeFolder === 'uncategorized' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {labels.uncategorized} ({uncategorizedCount})
      </button>
      {folders.map(f => {
        const count = folderCount(f.id);
        const tab = (
          <button
            onClick={() => onPick(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeFolder === f.id ? 'text-white' : 'text-gray-700 hover:opacity-80'
            }`}
            style={{ backgroundColor: activeFolder === f.id ? f.color : `${f.color}20` }}
          >
            <span>{f.icon}</span>
            <span>{getTranslatedName(f)}</span>
            <span className="text-xs opacity-75">({count})</span>
          </button>
        );

        if (!onEdit && !onDelete) {
          return <React.Fragment key={f.id}>{tab}</React.Fragment>;
        }

        return (
          <div key={f.id} className="group relative">
            {tab}
            {onDelete && (
              <button
                onClick={() => onDelete(f)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex"
              >
                ×
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(f)}
                className="absolute -top-1 right-4 w-4 h-4 bg-blue-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex"
                title={editFolderTitle}
              >
                <Pencil className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
