import { NextRequest, NextResponse } from 'next/server';
import { getSQL, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/state
 * Returns the full application state assembled from normalized tables.
 * Shape matches the legacy blob: { ingredients, recipes, dishes, recipeFolders, dishFolders, trash }
 */
export async function GET() {
  try {
    const sql = getSQL();
    await ensureTables();

    // ── Active data ──
    const ingredientRows = await sql`SELECT * FROM ingredients WHERE deleted_at IS NULL ORDER BY name`;
    const recipeRows = await sql`SELECT * FROM recipes WHERE deleted_at IS NULL ORDER BY name`;
    const dishRows = await sql`SELECT * FROM dishes WHERE deleted_at IS NULL ORDER BY name`;
    const recipeFolderRows = await sql`SELECT * FROM folders WHERE type = 'recipe' ORDER BY name`;
    const dishFolderRows = await sql`SELECT * FROM folders WHERE type = 'dish' ORDER BY name`;

    // ── Recipe sub-data ──
    const allRecipeIngredients = await sql`SELECT * FROM recipe_ingredients`;
    const allRecipePresets = await sql`SELECT * FROM recipe_presets`;

    // ── Dish sub-data ──
    const allDishRecipes = await sql`SELECT * FROM dish_recipes`;
    const allDishIngredients = await sql`SELECT * FROM dish_ingredients`;

    // ── Translations (single query for all entities) ──
    const allTranslations = await sql`SELECT * FROM translations`;
    const translationIndex: Record<string, Record<string, string>> = {};
    for (const t of allTranslations) {
      const key = `${t.entity_type}:${t.entity_id}`;
      if (!translationIndex[key]) translationIndex[key] = {} as Record<string, string>;
      (translationIndex[key] as Record<string, string>)[t.lang as string] = t.name as string;
    }
    const getTranslations = (type: string, id: string) => translationIndex[`${type}:${id}`] || {};

    // ── Trashed items ──
    const trashedIngredients = await sql`SELECT * FROM ingredients WHERE deleted_at IS NOT NULL`;
    const trashedRecipes = await sql`SELECT * FROM recipes WHERE deleted_at IS NOT NULL`;
    const trashedDishes = await sql`SELECT * FROM dishes WHERE deleted_at IS NOT NULL`;

    // ── Assemble ingredients ──
    const ingredients = ingredientRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      pricePerKg: Number(r.price_per_kg),
      priceType: r.price_type,
      supplier: r.supplier || '',
      lastUpdate: r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : '',
      lemonsoftId: r.lemonsoft_id || undefined,
      translations: getTranslations('ingredient', r.id),
    }));

    // ── Assemble recipes ──
    const recipes = recipeRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      yieldPercentage: Number(r.yield_percentage),
      workTimeMinutes: Number(r.work_time_min),
      hiddenCosts: Number(r.hidden_costs) || 0,
      folder: r.folder_id || '',
      ingredients: allRecipeIngredients
        .filter((ri: any) => ri.recipe_id === r.id)
        .map((ri: any) => ({
          id: ri.id,
          ingredientId: ri.ingredient_id,
          quantityInGrams: Number(ri.quantity_grams),
        })),
      presets: allRecipePresets
        .filter((p: any) => p.recipe_id === r.id)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          targetWeightGrams: Number(p.target_weight_grams),
        })),
      translations: getTranslations('recipe', r.id),
    }));

    // ── Assemble dishes ──
    const dishes = dishRows.map((d: any) => ({
      id: d.id,
      name: d.name,
      sellingPrice: Number(d.selling_price),
      portions: Number(d.portions),
      priceIncludesVat: d.price_includes_vat,
      vatRate: Number(d.vat_rate),
      folder: d.folder_id || '',
      recipes: allDishRecipes
        .filter((dr: any) => dr.dish_id === d.id)
        .map((dr: any) => ({
          id: dr.id,
          recipeId: dr.recipe_id,
          quantityInGrams: Number(dr.quantity_grams),
        })),
      directIngredients: allDishIngredients
        .filter((di: any) => di.dish_id === d.id)
        .map((di: any) => ({
          id: di.id,
          ingredientId: di.ingredient_id,
          quantity: Number(di.quantity),
        })),
      translations: getTranslations('dish', d.id),
    }));

    // ── Assemble folders ──
    const recipeFolders = recipeFolderRows.map((f: any) => ({
      id: f.id, name: f.name, color: f.color, icon: f.icon,
    }));
    const dishFolders = dishFolderRows.map((f: any) => ({
      id: f.id, name: f.name, color: f.color, icon: f.icon,
    }));

    // ── Assemble trash ──
    const trash: any[] = [];

    for (const r of trashedIngredients) {
      trash.push({
        id: `trash-ing-${r.id}`,
        originalType: 'ingredient',
        data: {
          id: r.id, name: r.name, pricePerKg: Number(r.price_per_kg),
          priceType: r.price_type, supplier: r.supplier || '', lastUpdate: '',
          translations: getTranslations('ingredient', r.id),
        },
        deletedAt: r.deleted_at,
      });
    }

    for (const r of trashedRecipes) {
      const recIngredients = allRecipeIngredients
        .filter((ri: any) => ri.recipe_id === r.id)
        .map((ri: any) => ({ id: ri.id, ingredientId: ri.ingredient_id, quantityInGrams: Number(ri.quantity_grams) }));
      const recPresets = allRecipePresets
        .filter((p: any) => p.recipe_id === r.id)
        .map((p: any) => ({ id: p.id, name: p.name, targetWeightGrams: Number(p.target_weight_grams) }));

      trash.push({
        id: `trash-rec-${r.id}`,
        originalType: 'recipe',
        data: {
          id: r.id, name: r.name, yieldPercentage: Number(r.yield_percentage),
          workTimeMinutes: Number(r.work_time_min), hiddenCosts: Number(r.hidden_costs),
          folder: r.folder_id || '', ingredients: recIngredients, presets: recPresets,
          translations: getTranslations('recipe', r.id),
        },
        deletedAt: r.deleted_at,
      });
    }

    for (const d of trashedDishes) {
      const dRecipes = allDishRecipes
        .filter((dr: any) => dr.dish_id === d.id)
        .map((dr: any) => ({ id: dr.id, recipeId: dr.recipe_id, quantityInGrams: Number(dr.quantity_grams) }));
      const dIngredients = allDishIngredients
        .filter((di: any) => di.dish_id === d.id)
        .map((di: any) => ({ id: di.id, ingredientId: di.ingredient_id, quantity: Number(di.quantity) }));

      trash.push({
        id: `trash-dish-${d.id}`,
        originalType: 'dish',
        data: {
          id: d.id, name: d.name, sellingPrice: Number(d.selling_price),
          portions: Number(d.portions), priceIncludesVat: d.price_includes_vat,
          vatRate: Number(d.vat_rate), folder: d.folder_id || '',
          recipes: dRecipes, directIngredients: dIngredients,
          translations: getTranslations('dish', d.id),
        },
        deletedAt: d.deleted_at,
      });
    }

    const state = { ingredients, recipes, dishes, recipeFolders, dishFolders, trash };

    return NextResponse.json(state, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    });
  } catch (err) {
    console.error('[Wibox API] GET /api/state error:', err);
    return NextResponse.json(null, { status: 500 });
  }
}

/**
 * POST /api/state
 * Full state sync — used for undo and backup import.
 * Deletes all existing data and re-inserts from the provided state.
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const sql = getSQL();
    await ensureTables();

    // Clear all tables (child tables first)
    await sql`DELETE FROM translations`;
    await sql`DELETE FROM dish_ingredients`;
    await sql`DELETE FROM dish_recipes`;
    await sql`DELETE FROM recipe_presets`;
    await sql`DELETE FROM recipe_ingredients`;
    await sql`DELETE FROM dishes`;
    await sql`DELETE FROM recipes`;
    await sql`DELETE FROM ingredients`;
    await sql`DELETE FROM folders`;

    // Re-insert ingredients
    for (const ing of (data.ingredients || [])) {
      await sql`
        INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, updated_at)
        VALUES (${ing.id}, ${ing.name}, ${ing.pricePerKg || 0}, ${ing.priceType || 'perKg'}, ${ing.supplier || ''}, ${ing.lastUpdate ? new Date(ing.lastUpdate).toISOString() : new Date().toISOString()})
      `;
      // Re-insert translations if available
      if (ing.translations) {
        for (const [lang, name] of Object.entries(ing.translations)) {
          if (name) {
            await sql`
              INSERT INTO translations (entity_type, entity_id, lang, name, updated_at)
              VALUES ('ingredient', ${ing.id}, ${lang}, ${name as string}, now())
              ON CONFLICT (entity_type, entity_id, lang) DO UPDATE SET name = ${name as string}, updated_at = now()
            `;
          }
        }
      }
    }

    // Re-insert recipes
    for (const rec of (data.recipes || [])) {
      await sql`
        INSERT INTO recipes (id, name, yield_percentage, work_time_min, hidden_costs, folder_id)
        VALUES (${rec.id}, ${rec.name}, ${rec.yieldPercentage || 100}, ${rec.workTimeMinutes || 0}, ${rec.hiddenCosts || 0}, ${rec.folder || null})
      `;
      for (const ri of (rec.ingredients || [])) {
        await sql`
          INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity_grams)
          VALUES (${ri.id}, ${rec.id}, ${ri.ingredientId}, ${ri.quantityInGrams || 0})
        `;
      }
      for (const pr of (rec.presets || [])) {
        await sql`
          INSERT INTO recipe_presets (id, recipe_id, name, target_weight_grams)
          VALUES (${pr.id}, ${rec.id}, ${pr.name}, ${pr.targetWeightGrams || 0})
        `;
      }
      // Re-insert translations if available
      if (rec.translations) {
        for (const [lang, name] of Object.entries(rec.translations)) {
          if (name) {
            await sql`
              INSERT INTO translations (entity_type, entity_id, lang, name, updated_at)
              VALUES ('recipe', ${rec.id}, ${lang}, ${name as string}, now())
              ON CONFLICT (entity_type, entity_id, lang) DO UPDATE SET name = ${name as string}, updated_at = now()
            `;
          }
        }
      }
    }

    // Re-insert dishes
    for (const dish of (data.dishes || [])) {
      await sql`
        INSERT INTO dishes (id, name, selling_price, portions, price_includes_vat, vat_rate, folder_id)
        VALUES (${dish.id}, ${dish.name}, ${dish.sellingPrice || 0}, ${dish.portions || 1}, ${dish.priceIncludesVat || false}, ${dish.vatRate ?? 14}, ${dish.folder || null})
      `;
      for (const dr of (dish.recipes || [])) {
        await sql`
          INSERT INTO dish_recipes (id, dish_id, recipe_id, quantity_grams)
          VALUES (${dr.id}, ${dish.id}, ${dr.recipeId}, ${dr.quantityInGrams || 0})
        `;
      }
      for (const di of (dish.directIngredients || [])) {
        await sql`
          INSERT INTO dish_ingredients (id, dish_id, ingredient_id, quantity)
          VALUES (${di.id}, ${dish.id}, ${di.ingredientId}, ${di.quantity || 0})
        `;
      }
      // Re-insert translations if available
      if (dish.translations) {
        for (const [lang, name] of Object.entries(dish.translations)) {
          if (name) {
            await sql`
              INSERT INTO translations (entity_type, entity_id, lang, name, updated_at)
              VALUES ('dish', ${dish.id}, ${lang}, ${name as string}, now())
              ON CONFLICT (entity_type, entity_id, lang) DO UPDATE SET name = ${name as string}, updated_at = now()
            `;
          }
        }
      }
    }

    // Re-insert folders
    for (const f of (data.recipeFolders || [])) {
      await sql`INSERT INTO folders (id, type, name, color, icon) VALUES (${f.id}, 'recipe', ${f.name}, ${f.color}, ${f.icon})`;
    }
    for (const f of (data.dishFolders || [])) {
      await sql`INSERT INTO folders (id, type, name, color, icon) VALUES (${f.id}, 'dish', ${f.name}, ${f.color}, ${f.icon})`;
    }

    // Re-insert trash as soft-deleted items
    for (const t of (data.trash || [])) {
      const d = t.data;
      const deletedAt = t.deletedAt || new Date().toISOString();
      if (t.originalType === 'ingredient' && d) {
        await sql`
          INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.pricePerKg || 0}, ${d.priceType || 'perKg'}, ${d.supplier || ''}, ${deletedAt})
          ON CONFLICT (id) DO UPDATE SET deleted_at = ${deletedAt}
        `;
      } else if (t.originalType === 'recipe' && d) {
        await sql`
          INSERT INTO recipes (id, name, yield_percentage, work_time_min, hidden_costs, folder_id, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.yieldPercentage || 100}, ${d.workTimeMinutes || 0}, ${d.hiddenCosts || 0}, ${d.folder || null}, ${deletedAt})
          ON CONFLICT (id) DO UPDATE SET deleted_at = ${deletedAt}
        `;
      } else if (t.originalType === 'dish' && d) {
        await sql`
          INSERT INTO dishes (id, name, selling_price, portions, price_includes_vat, vat_rate, folder_id, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.sellingPrice || 0}, ${d.portions || 1}, ${d.priceIncludesVat || false}, ${d.vatRate ?? 14}, ${d.folder || null}, ${deletedAt})
          ON CONFLICT (id) DO UPDATE SET deleted_at = ${deletedAt}
        `;
      }
    }

    console.log('[Wibox API] Full state synced to normalized tables');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST /api/state error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
