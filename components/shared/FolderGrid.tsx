import React from 'react';
import { Folder as FolderType } from '@/lib/types';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { FolderPlus, Pencil } from 'lucide-react';

/**
 * Shared Step-0 landing grid: "All" card + named-folder cards +
 * "Uncategorized" card + optional "New folder" card.
 *
 * Used by RecipesView, DishesView and KitchenView. Divergences are driven by
 * props/flags:
 *  - KitchenView hides empty folders (`hideEmptyFolders`), shows no edit/delete
 *    (omit `onEdit`/`onDelete`) and no "New folder" card (omit `onNew`).
 *  - The "All" card accent is blue (Recipes/Dishes) or neutral/dark (Kitchen).
 */
export interface FolderGridProps {
  folders: FolderType[];
  /** Count shown on the "All" card. */
  totalCount: number;
  /** Count shown on the "Uncategorized" card (also gates its visibility). */
  uncategorizedCount: number;
  /** Per-folder item count. */
  folderCount: (folderId: string) => number;
  /** Noun appended after each count, e.g. "recipes" / "dishes". */
  countNoun: string;
  labels: { all: string; uncategorized: string; newFolder?: string };
  /** Called with 'all' | 'uncategorized' | folderId when a card is picked. */
  onPick: (folderId: string) => void;
  onEdit?: (folder: FolderType) => void;
  onDelete?: (folder: FolderType) => void;
  onNew?: () => void;
  /** Hide folders that have zero items (KitchenView). */
  hideEmptyFolders?: boolean;
  /** Accent for the "All" card. */
  allAccent?: 'blue' | 'neutral';
  /** Title attribute for the edit button. */
  editFolderTitle?: string;
  /** Extra classes merged onto the grid container (e.g. "print:hidden"). */
  className?: string;
}

export const FolderGrid = ({
  folders,
  totalCount,
  uncategorizedCount,
  folderCount,
  countNoun,
  labels,
  onPick,
  onEdit,
  onDelete,
  onNew,
  hideEmptyFolders = false,
  allAccent = 'blue',
  editFolderTitle,
  className = '',
}: FolderGridProps) => {
  const getTranslatedName = useTranslatedName();

  const allCardHover = allAccent === 'blue' ? 'hover:border-blue-400' : 'hover:border-gray-900';
  const allCircle =
    allAccent === 'blue'
      ? 'bg-blue-100 text-blue-700 group-hover:bg-blue-200'
      : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200';

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4${className ? ` ${className}` : ''}`}>
      {/* All */}
      <button
        onClick={() => onPick('all')}
        className={`flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md ${allCardHover} transition-all gap-3 group`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors ${allCircle}`}>
          🍽️
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-gray-900">{labels.all}</h3>
          <p className="text-sm text-gray-500">{totalCount} {countNoun}</p>
        </div>
      </button>

      {/* Named folders */}
      {folders.map(f => {
        const count = folderCount(f.id);
        if (hideEmptyFolders && count === 0) return null;

        const card = (
          <button
            onClick={() => onPick(f.id)}
            className={`${onEdit || onDelete ? 'w-full ' : ''}flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all gap-3 relative overflow-hidden${onEdit || onDelete ? '' : ' group'}`}
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
              <p className="text-sm text-gray-500">{count} {countNoun}</p>
            </div>
          </button>
        );

        if (!onEdit && !onDelete) {
          return <React.Fragment key={f.id}>{card}</React.Fragment>;
        }

        return (
          <div key={f.id} className="relative group">
            {card}
            {onEdit && (
              <button
                onClick={() => onEdit(f)}
                className="absolute top-2 right-8 w-6 h-6 bg-blue-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex hover:bg-blue-600 transition-colors"
                title={editFolderTitle}
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(f)}
                className="absolute top-2 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex hover:bg-red-600 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {/* Uncategorized */}
      {uncategorizedCount > 0 && (
        <button
          onClick={() => onPick('uncategorized')}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-400 transition-all gap-3 group"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-xl group-hover:bg-gray-200 transition-colors">
            📁
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900">{labels.uncategorized}</h3>
            <p className="text-sm text-gray-500">{uncategorizedCount} {countNoun}</p>
          </div>
        </button>
      )}

      {/* New folder card */}
      {onNew && (
        <button
          onClick={onNew}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 transition-all gap-3 group"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-gray-500 group-hover:text-blue-600 transition-colors">{labels.newFolder}</h3>
          </div>
        </button>
      )}
    </div>
  );
};
