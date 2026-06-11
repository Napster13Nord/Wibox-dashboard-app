import React from 'react';
import { EntityCombobox } from './EntityCombobox';
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

/** Recipe picker — thin specialisation of EntityCombobox. */
export const RecipeCombobox: React.FC<RecipeComboboxProps> = ({
  recipes,
  value,
  onChange,
  placeholder = 'Search recipes…',
  className = '',
}) => (
  <EntityCombobox
    items={recipes}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    emptyLabel="No recipes match"
    className={className}
    renderMeta={(r) => `€${r.costPerKg.toFixed(2)}/kg`}
  />
);
