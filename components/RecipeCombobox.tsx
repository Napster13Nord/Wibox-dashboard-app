import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { TranslationMap } from '@/lib/types';

type RecipeOption = {
  id: string;
  name: string;
  costPerKg: number;          // pre-computed by parent
  translations?: TranslationMap;
};

interface RecipeComboboxProps {
  recipes: RecipeOption[];
  value: string;              // selected recipe id
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export const RecipeCombobox: React.FC<RecipeComboboxProps> = ({
  recipes,
  value,
  onChange,
  placeholder = 'Search recipes…',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const getTranslatedName = useTranslatedName();

  const selectedRecipe = recipes.find(r => r.id === value);

  // Filter by query across name + translations
  const filtered = query.trim()
    ? recipes.filter(r => {
        const q = query.toLowerCase();
        if ((r.name || '').toLowerCase().includes(q)) return true;
        if ((r as any).translations) {
          return Object.values((r as any).translations).some(
            (t: any) => t && t.toLowerCase().includes(q)
          );
        }
        return false;
      })
    : recipes;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  const handleSelect = (id: string) => {
    onChange(id);
    const r = recipes.find(r => r.id === id);
    setQuery(r ? getTranslatedName(r) : '');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIdx]) handleSelect(filtered[highlightIdx].id);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          placeholder={selectedRecipe ? getTranslatedName(selectedRecipe) : placeholder}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (!e.target.value && value) onChange('');
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {(value || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {filtered.map((r, idx) => (
            <li
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                idx === highlightIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              } ${r.id === value ? 'font-medium' : ''}`}
            >
              <span>{getTranslatedName(r)}</span>
              <span className="text-xs text-gray-400 ml-2">
                €{r.costPerKg.toFixed(2)}/kg
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-3 px-3 text-sm text-gray-400 text-center">
          No recipes match &quot;{query}&quot;
        </div>
      )}
    </div>
  );
};
