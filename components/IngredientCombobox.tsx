import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { TranslationMap } from '@/lib/types';

type IngredientOption = {
  id: string;
  name: string;
  pricePerKg: number;
  priceType: 'perKg' | 'perUnit';
  translations?: TranslationMap;
};

interface IngredientComboboxProps {
  ingredients: IngredientOption[];
  value: string; // selected ingredient id
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export const IngredientCombobox: React.FC<IngredientComboboxProps> = ({
  ingredients,
  value,
  onChange,
  placeholder = 'Search ingredients…',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const getTranslatedName = useTranslatedName();

  const selectedIng = ingredients.find(i => i.id === value);

  // Search across original name AND all translations
  const filtered = query.trim()
    ? ingredients.filter(i => {
        const q = query.toLowerCase();
        if ((i.name || '').toLowerCase().includes(q)) return true;
        // Also search through translations
        if (i.translations) {
          return Object.values(i.translations).some(
            t => t && t.toLowerCase().includes(q)
          );
        }
        return false;
      })
    : ingredients;

  // Click outside to close
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
    const ing = ingredients.find(i => i.id === id);
    setQuery(ing ? getTranslatedName(ing) : '');
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
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
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
        if (filtered[highlightIdx]) {
          handleSelect(filtered[highlightIdx].id);
        }
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
          placeholder={selectedIng ? getTranslatedName(selectedIng) : placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (!e.target.value && value) {
              onChange('');
            }
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
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {filtered.map((ing, idx) => (
            <li
              key={ing.id}
              onClick={() => handleSelect(ing.id)}
              className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                idx === highlightIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              } ${ing.id === value ? 'font-medium' : ''}`}
            >
              <span>{getTranslatedName(ing)}</span>
              <span className="text-xs text-gray-400 ml-2">
                €{ing.pricePerKg.toFixed(2)}/{ing.priceType === 'perUnit' ? 'unit' : 'kg'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-3 px-3 text-sm text-gray-400 text-center">
          No ingredients match &quot;{query}&quot;
        </div>
      )}
    </div>
  );
};
