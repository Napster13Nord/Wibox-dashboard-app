import { NextRequest, NextResponse } from 'next/server';
import { getSQL, ensureTables } from '@/lib/db';
import { isManager } from '@/lib/auth';
import { DEFAULT_VAT_RATE } from '@/lib/constants';

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
    const allRecipeIngredients = await sql`SELECT * FROM recipe_ingredients ORDER BY sort_order, id`;
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
      notes: r.notes || '',
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
      translations: getTranslations('folder', f.id),
    }));
    const dishFolders = dishFolderRows.map((f: any) => ({
      id: f.id, name: f.name, color: f.color, icon: f.icon,
      translations: getTranslations('folder', f.id),
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
          workTimeMinutes: Number(r.work_time_min), notes: r.notes || '',
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
    if (!(await isManager())) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: manager role required' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const sql = getSQL();
    await ensureTables();

    // Build every statement up front, then run them as ONE atomic transaction.
    // neon-http transactions are non-interactive (no reads between writes), which
    // is fine here: this is a blind wipe-and-reinsert. If any statement fails the
    // whole batch rolls back, so the existing data is never left half-deleted.
    const queries: ReturnType<typeof sql>[] = [];

    const pushTranslations = (
      entityType: string,
      entityId: string,
      translations: Record<string, string> | undefined,
    ) => {
      if (!translations) return;
      for (const [lang, name] of Object.entries(translations)) {
        if (name) {
          queries.push(sql`
            INSERT INTO translations (entity_type, entity_id, lang, name, updated_at)
            VALUES (${entityType}, ${entityId}, ${lang}, ${name as string}, now())
            ON CONFLICT (entity_type, entity_id, lang) DO UPDATE SET name = ${name as string}, updated_at = now()
          `);
        }
      }
    };

    // ── Clear all tables (child tables first) ──
    queries.push(sql`DELETE FROM translations`);
    queries.push(sql`DELETE FROM dish_ingredients`);
    queries.push(sql`DELETE FROM dish_recipes`);
    queries.push(sql`DELETE FROM recipe_presets`);
    queries.push(sql`DELETE FROM recipe_ingredients`);
    queries.push(sql`DELETE FROM dishes`);
    queries.push(sql`DELETE FROM recipes`);
    queries.push(sql`DELETE FROM ingredients`);
    queries.push(sql`DELETE FROM folders`);

    // ── Ingredients ──
    for (const ing of (data.ingredients || [])) {
      queries.push(sql`
        INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, updated_at)
        VALUES (${ing.id}, ${ing.name}, ${ing.pricePerKg || 0}, ${ing.priceType || 'perKg'}, ${ing.supplier || ''}, ${ing.lastUpdate ? new Date(ing.lastUpdate).toISOString() : new Date().toISOString()})
      `);
      pushTranslations('ingredient', ing.id, ing.translations);
    }

    // ── Recipes ──
    for (const rec of (data.recipes || [])) {
      queries.push(sql`
        INSERT INTO recipes (id, name, yield_percentage, work_time_min, notes, folder_id)
        VALUES (${rec.id}, ${rec.name}, ${rec.yieldPercentage || 100}, ${rec.workTimeMinutes || 0}, ${rec.notes || null}, ${rec.folder || null})
      `);
      for (let idx = 0; idx < (rec.ingredients || []).length; idx++) {
        const ri = rec.ingredients[idx];
        queries.push(sql`
          INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity_grams, sort_order)
          VALUES (${ri.id}, ${rec.id}, ${ri.ingredientId}, ${ri.quantityInGrams || 0}, ${idx})
        `);
      }
      for (const pr of (rec.presets || [])) {
        queries.push(sql`
          INSERT INTO recipe_presets (id, recipe_id, name, target_weight_grams)
          VALUES (${pr.id}, ${rec.id}, ${pr.name}, ${pr.targetWeightGrams || 0})
        `);
      }
      pushTranslations('recipe', rec.id, rec.translations);
    }

    // ── Dishes ──
    for (const dish of (data.dishes || [])) {
      queries.push(sql`
        INSERT INTO dishes (id, name, selling_price, portions, price_includes_vat, vat_rate, folder_id)
        VALUES (${dish.id}, ${dish.name}, ${dish.sellingPrice || 0}, ${dish.portions || 1}, ${dish.priceIncludesVat || false}, ${dish.vatRate ?? DEFAULT_VAT_RATE}, ${dish.folder || null})
      `);
      for (const dr of (dish.recipes || [])) {
        queries.push(sql`
          INSERT INTO dish_recipes (id, dish_id, recipe_id, quantity_grams)
          VALUES (${dr.id}, ${dish.id}, ${dr.recipeId}, ${dr.quantityInGrams || 0})
        `);
      }
      for (const di of (dish.directIngredients || [])) {
        queries.push(sql`
          INSERT INTO dish_ingredients (id, dish_id, ingredient_id, quantity)
          VALUES (${di.id}, ${dish.id}, ${di.ingredientId}, ${di.quantity || 0})
        `);
      }
      pushTranslations('dish', dish.id, dish.translations);
    }

    // ── Folders ──
    for (const f of (data.recipeFolders || [])) {
      queries.push(sql`INSERT INTO folders (id, type, name, color, icon) VALUES (${f.id}, 'recipe', ${f.name}, ${f.color}, ${f.icon})`);
      pushTranslations('folder', f.id, f.translations);
    }
    for (const f of (data.dishFolders || [])) {
      queries.push(sql`INSERT INTO folders (id, type, name, color, icon) VALUES (${f.id}, 'dish', ${f.name}, ${f.color}, ${f.icon})`);
      pushTranslations('folder', f.id, f.translations);
    }

    // ── Trash (soft-deleted rows) ──
    for (const t of (data.trash || [])) {
      const d = t.data;
      const deletedAt = t.deletedAt || new Date().toISOString();
      if (t.originalType === 'ingredient' && d) {
        queries.push(sql`
          INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.pricePerKg || 0}, ${d.priceType || 'perKg'}, ${d.supplier || ''}, ${deletedAt})
          ON CONFLICT (id) DO UPDATE SET deleted_at = ${deletedAt}
        `);
      } else if (t.originalType === 'recipe' && d) {
        queries.push(sql`
          INSERT INTO recipes (id, name, yield_percentage, work_time_min, notes, folder_id, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.yieldPercentage || 100}, ${d.workTimeMinutes || 0}, ${d.notes || null}, ${d.folder || null}, ${deletedAt})
          ON CONFLICT (id) DO UPDATE SET deleted_at = ${deletedAt}
        `);
      } else if (t.originalType === 'dish' && d) {
        queries.push(sql`
          INSERT INTO dishes (id, name, selling_price, portions, price_includes_vat, vat_rate, folder_id, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.sellingPrice || 0}, ${d.portions || 1}, ${d.priceIncludesVat || false}, ${d.vatRate ?? DEFAULT_VAT_RATE}, ${d.folder || null}, ${deletedAt})
          ON CONFLICT (id) DO UPDATE SET deleted_at = ${deletedAt}
        `);
      }
    }

    // Run the whole batch atomically — all or nothing.
    await sql.transaction(queries);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST /api/state error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
