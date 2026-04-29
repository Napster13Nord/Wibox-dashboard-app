import React, { useState, useEffect } from 'react';
import { TranslationMap } from '@/lib/types';
import { useI18n, localeLabels, Locale } from '@/lib/i18n';
import { Save, X, Languages } from 'lucide-react';

const LANGS: Locale[] = ['en', 'sv', 'fi'];

type TranslationEditorProps = {
  /** Current translations stored on the entity */
  translations?: TranslationMap;
  /** The original name (used as fallback for the source language) */
  originalName: string;
  /** Called when the user saves edited translations */
  onSave: (translations: TranslationMap) => void;
  /** Compact mode for table rows (horizontal layout) */
  compact?: boolean;
};

/**
 * Inline editor for EN / SV / FI translation fields.
 * Shows flag icons with editable text inputs for each language.
 */
export const TranslationEditor = ({
  translations,
  originalName,
  onSave,
  compact = false,
}: TranslationEditorProps) => {
  const { t } = useI18n();

  const [edits, setEdits] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Initialise form from current translations
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const lang of LANGS) {
      initial[lang] = translations?.[lang] || '';
    }
    setEdits(initial);
    setIsDirty(false);
  }, [translations, originalName]);

  const handleChange = (lang: string, value: string) => {
    setEdits(prev => ({ ...prev, [lang]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    const result: TranslationMap = {};
    for (const lang of LANGS) {
      const val = edits[lang]?.trim();
      if (val) {
        (result as any)[lang] = val;
      }
    }
    onSave(result);
    setIsDirty(false);
  };

  const handleCancel = () => {
    const initial: Record<string, string> = {};
    for (const lang of LANGS) {
      initial[lang] = translations?.[lang] || '';
    }
    setEdits(initial);
    setIsDirty(false);
  };

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Languages className="w-3 h-3" />
          <span>Translations</span>
        </div>
        {LANGS.map(lang => {
          const info = localeLabels[lang];
          return (
            <div key={lang} className="flex items-center gap-1.5">
              <span className="text-sm shrink-0" title={info.label}>{info.flag}</span>
              <input
                type="text"
                className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={edits[lang] || ''}
                onChange={e => handleChange(lang, e.target.value)}
                placeholder={originalName}
              />
            </div>
          );
        })}
        {isDirty && (
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleSave}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Save translations"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:bg-gray-50 rounded"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full mode: vertical card-style layout
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Languages className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-gray-700">Translations</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {LANGS.map(lang => {
          const info = localeLabels[lang];
          return (
            <div key={lang}>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <span>{info.flag}</span>
                <span>{info.label}</span>
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={edits[lang] || ''}
                onChange={e => handleChange(lang, e.target.value)}
                placeholder={originalName}
              />
            </div>
          );
        })}
      </div>
      {isDirty && (
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            Save Translations
          </button>
        </div>
      )}
    </div>
  );
};
