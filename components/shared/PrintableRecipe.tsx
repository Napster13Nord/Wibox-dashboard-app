import React from 'react';
import { Recipe, Ingredient, Folder as FolderType } from '@/lib/types';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { calculateRecipeCost, calculateRecipeWeight } from '@/lib/calculations';

/**
 * Shared `print-only` recipe summary: header + metrics + ingredients + presets
 * + notes. Duplicated in RecipesView and KitchenView; each view keeps its own
 * gating logic (which recipe to print, or null) and renders this for the body.
 */
export interface PrintableRecipeProps {
  recipe: Recipe;
  ingredients: Ingredient[];
  folders: FolderType[];
}

export const PrintableRecipe = ({ recipe, ingredients, folders }: PrintableRecipeProps) => {
  const getTranslatedName = useTranslatedName();

  const totalCost = calculateRecipeCost(recipe, ingredients);
  const totalWeight = calculateRecipeWeight(recipe);
  const costPerKg = totalWeight > 0 ? (totalCost / totalWeight) * 1000 : 0;
  const folderInfo = folders.find(f => f.id === recipe.folder);

  return (
    <div className="print-only">
      <h2>{getTranslatedName(recipe)}</h2>
      {folderInfo && (
        <p style={{ color: '#666', marginBottom: '4pt' }}>
          {folderInfo.icon} {getTranslatedName(folderInfo)}
        </p>
      )}
      <p className="print-meta">
        Wibox Recipe Automation · Printed {new Date().toLocaleDateString()}
      </p>

      {/* Summary metrics */}
      <table style={{ marginBottom: '16pt' }}>
        <thead>
          <tr>
            <th>Total Cost</th>
            <th>Total Weight</th>
            <th>Cost / kg</th>
            <th>Yield</th>
            <th>Work Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 600 }}>€{totalCost.toFixed(2)}</td>
            <td>{totalWeight.toFixed(0)}g</td>
            <td style={{ fontWeight: 600 }}>€{costPerKg.toFixed(2)}</td>
            <td>{recipe.yieldPercentage}%</td>
            <td>{recipe.workTimeMinutes} mins</td>
          </tr>
        </tbody>
      </table>

      {/* Ingredients table */}
      {recipe.ingredients.length > 0 && (
        <>
          <h3>Ingredients</h3>
          <table style={{ marginBottom: '16pt' }}>
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Quantity</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map(ri => {
                const ing = ingredients.find(i => i.id === ri.ingredientId);
                const cost = ing
                  ? ing.priceType === 'perUnit'
                    ? ing.pricePerKg * ri.quantityInGrams
                    : (ing.pricePerKg / 1000) * ri.quantityInGrams
                  : 0;
                const unit = ing?.priceType === 'perUnit' ? 'unit(s)' : 'g';
                return (
                  <tr key={ri.id}>
                    <td>{ing ? getTranslatedName(ing) : 'Unknown'}</td>
                    <td>{ri.quantityInGrams} {unit}</td>
                    <td>€{cost.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                <td>Total</td>
                <td>{totalWeight.toFixed(0)}g</td>
                <td>€{totalCost.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Presets */}
      {(recipe.presets || []).length > 0 && (
        <>
          <h3>Kitchen Presets</h3>
          <table>
            <thead>
              <tr>
                <th>Preset Name</th>
                <th>Target Weight</th>
                <th>Cost per Unit</th>
              </tr>
            </thead>
            <tbody>
              {(recipe.presets || []).map(p => {
                const costPerUnit = totalWeight > 0 ? (totalCost / totalWeight) * p.targetWeightGrams : 0;
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.targetWeightGrams}g</td>
                    <td>€{costPerUnit.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Notes */}
      {recipe.notes && (
        <>
          <h3>Notes</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{recipe.notes}</p>
        </>
      )}
    </div>
  );
};
