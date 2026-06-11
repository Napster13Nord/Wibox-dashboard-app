import React from 'react';
import { EntityCombobox } from './EntityCombobox';
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

/** Ingredient picker — thin specialisation of EntityCombobox. */
export const IngredientCombobox: React.FC<IngredientComboboxProps> = ({
  ingredients,
  value,
  onChange,
  placeholder = 'Search ingredients…',
  className = '',
}) => (
  <EntityCombobox
    items={ingredients}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    emptyLabel="No ingredients match"
    className={className}
    renderMeta={(ing) => `€${ing.pricePerKg.toFixed(2)}/${ing.priceType === 'perUnit' ? 'unit' : 'kg'}`}
  />
);
