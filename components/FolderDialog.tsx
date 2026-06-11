import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { FOLDER_COLORS, FOLDER_ICONS } from '@/lib/folders';

/**
 * Create/edit dialog for a recipe or dish folder. Shared by RecipesView and
 * DishesView — both pick a name, an icon and a color, then call onSave.
 */
export const FolderDialog = ({
  isOpen,
  onClose,
  onSave,
  initialFolder,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, icon: string) => void;
  initialFolder?: { name: string; color: string; icon: string };
}) => {
  const { t } = useI18n();
  const [name, setName] = useState(initialFolder?.name || '');
  const [selColor, setSelColor] = useState(initialFolder?.color || FOLDER_COLORS[0]);
  const [selIcon, setSelIcon] = useState(initialFolder?.icon || FOLDER_ICONS[0]);

  if (!isOpen) return null;

  const isEditing = !!initialFolder;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{isEditing ? t.recipes.editFolder : t.recipes.newFolder}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.recipes.folderName}</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.recipes.folderNamePlaceholder}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.recipes.icon}</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.recipes.color}</label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map(color => (
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
            {t.common.cancel}
          </button>
          <button
            onClick={() => { if (name) { onSave(name, selColor, selIcon); onClose(); } }}
            disabled={!name}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isEditing ? t.common.save : t.recipes.createFolder}
          </button>
        </div>
      </div>
    </div>
  );
};
