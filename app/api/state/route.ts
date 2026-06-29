import { NextRequest, NextResponse } from 'next/server';
import { getSQL, ensureTables } from '@/lib/db';
import { isManager } from '@/lib/auth';
import { DEFAULT_VAT_RATE } from '@/lib/constants';
import {
  Ingredient, Recipe, Dish, Folder, RecipeIngredient, RecipePreset,
  DishRecipe, DishIngredient, TranslationMap, TrashedItem,
} from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── DB row shapes (snake_case, as returned by Neon) ──
// Numeric columns come back as strings over the HTTP driver, hence string | number.
type IngredientRow = {
  id: string; name: string; price_per_kg: string | number; price_type: string;
  supplier: string | null; supplier_product: string | null; lemonsoft_id: string | null;
  updated_at: string | null; deleted_at: string | null;
};
type RecipeRow = {
  id: string; name: string; yield_percentage: string | number;
  work_time_min: string | number; notes: string | null; folder_id: string | null;
  updated_at: string | null; deleted_at: string | null;
};
type DishRow = {
  id: string; name: string; selling_price: string | number; portions: string | number;
  price_includes_vat: boolean; vat_rate: string | number; folder_id: string | null;
  updated_at: string | null; deleted_at: string | null;
};
type FolderRow = { id: string; type: string; name: string; color: string; icon: string };
type RecipeIngredientRow = {
  id: string; recipe_id: string; ingredient_id: string;
  quantity_grams: string | number; sort_order: number;
};
type RecipePresetRow = {
  id: string; recipe_id: string; name: string; target_weight_grams: string | number;
};
type DishRecipeRow = {
  id: string; dish_id: string; recipe_id: string; quantity_grams: string | number;
};
type DishIngredientRow = {
  id: string; dish_id: string; ingredient_id: string; quantity: string | number;
};
type TranslationRow = { entity_type: string; entity_id: string; lang: string; name: string };

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
    const allRecipeIngredients = (await sql`SELECT * FROM recipe_ingredients ORDER BY sort_order, id`) as RecipeIngredientRow[];
    const allRecipePresets = (await sql`SELECT * FROM recipe_presets`) as RecipePresetRow[];

    // ── Dish sub-data ──
    const allDishRecipes = (await sql`SELECT * FROM dish_recipes`) as DishRecipeRow[];
    const allDishIngredients = (await sql`SELECT * FROM dish_ingredients`) as DishIngredientRow[];

    // ── Translations (single query for all entities) ──
    const allTranslations = (await sql`SELECT * FROM translations`) as TranslationRow[];
    const translationIndex: Record<string, TranslationMap> = {};
    for (const t of allTranslations) {
      const key = `${t.entity_type}:${t.entity_id}`;
      if (!translationIndex[key]) translationIndex[key] = {};
      (translationIndex[key] as Record<string, string>)[t.lang] = t.name;
    }
    const getTranslations = (type: string, id: string): TranslationMap =>
      translationIndex[`${type}:${id}`] || {};

    // ── Typed row → domain mappers (keep coercions identical to the schema) ──
    const rowToRecipeIngredient = (ri: RecipeIngredientRow): RecipeIngredient => ({
      id: ri.id, ingredientId: ri.ingredient_id, quantityInGrams: Number(ri.quantity_grams),
    });
    const rowToRecipePreset = (p: RecipePresetRow): RecipePreset => ({
      id: p.id, name: p.name, targetWeightGrams: Number(p.target_weight_grams),
    });
    const rowToDishRecipe = (dr: DishRecipeRow): DishRecipe => ({
      id: dr.id, recipeId: dr.recipe_id, quantityInGrams: Number(dr.quantity_grams),
    });
    const rowToDishIngredient = (di: DishIngredientRow): DishIngredient => ({
      id: di.id, ingredientId: di.ingredient_id, quantity: Number(di.quantity),
    });

    const rowToIngredient = (r: IngredientRow): Ingredient => ({
      id: r.id,
      name: r.name,
      pricePerKg: Number(r.price_per_kg),
      priceType: r.price_type as Ingredient['priceType'],
      supplier: r.supplier || '',
      supplierProduct: r.supplier_product || '',
      lastUpdate: r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : '',
      lemonsoftId: r.lemonsoft_id || undefined,
      translations: getTranslations('ingredient', r.id),
    });
    const rowToRecipe = (r: RecipeRow): Recipe => ({
      id: r.id,
      name: r.name,
      yieldPercentage: Number(r.yield_percentage),
      workTimeMinutes: Number(r.work_time_min),
      notes: r.notes || '',
      folder: r.folder_id || '',
      ingredients: allRecipeIngredients.filter(ri => ri.recipe_id === r.id).map(rowToRecipeIngredient),
      presets: allRecipePresets.filter(p => p.recipe_id === r.id).map(rowToRecipePreset),
      translations: getTranslations('recipe', r.id),
    });
    const rowToDish = (d: DishRow): Dish => ({
      id: d.id,
      name: d.name,
      sellingPrice: Number(d.selling_price),
      portions: Number(d.portions),
      priceIncludesVat: d.price_includes_vat,
      vatRate: Number(d.vat_rate),
      folder: d.folder_id || '',
      recipes: allDishRecipes.filter(dr => dr.dish_id === d.id).map(rowToDishRecipe),
      directIngredients: allDishIngredients.filter(di => di.dish_id === d.id).map(rowToDishIngredient),
      translations: getTranslations('dish', d.id),
    });
    const rowToFolder = (f: FolderRow): Folder => ({
      id: f.id, name: f.name, color: f.color, icon: f.icon,
      translations: getTranslations('folder', f.id),
    });

    // ── Active data → domain objects ──
    const ingredients = (ingredientRows as IngredientRow[]).map(rowToIngredient);
    const recipes = (recipeRows as RecipeRow[]).map(rowToRecipe);
    const dishes = (dishRows as DishRow[]).map(rowToDish);
    const recipeFolders = (recipeFolderRows as FolderRow[]).map(rowToFolder);
    const dishFolders = (dishFolderRows as FolderRow[]).map(rowToFolder);

    // ── Trashed items (soft-deleted rows) ──
    const trashedIngredients = (await sql`SELECT * FROM ingredients WHERE deleted_at IS NOT NULL`) as IngredientRow[];
    const trashedRecipes = (await sql`SELECT * FROM recipes WHERE deleted_at IS NOT NULL`) as RecipeRow[];
    const trashedDishes = (await sql`SELECT * FROM dishes WHERE deleted_at IS NOT NULL`) as DishRow[];

    const trash: TrashedItem[] = [
      ...trashedIngredients.map((r): TrashedItem => ({
        id: `trash-ing-${r.id}`,
        originalType: 'ingredient',
        // Trash keeps the legacy shape: no lemonsoftId, blank lastUpdate.
        data: {
          id: r.id, name: r.name, pricePerKg: Number(r.price_per_kg),
          priceType: r.price_type as Ingredient['priceType'], supplier: r.supplier || '',
          supplierProduct: r.supplier_product || '',
          lastUpdate: '', translations: getTranslations('ingredient', r.id),
        },
        deletedAt: r.deleted_at || new Date().toISOString(),
      })),
      ...trashedRecipes.map((r): TrashedItem => ({
        id: `trash-rec-${r.id}`,
        originalType: 'recipe',
        data: rowToRecipe(r),
        deletedAt: r.deleted_at || new Date().toISOString(),
      })),
      ...trashedDishes.map((d): TrashedItem => ({
        id: `trash-dish-${d.id}`,
        originalType: 'dish',
        data: rowToDish(d),
        deletedAt: d.deleted_at || new Date().toISOString(),
      })),
    ];

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
        INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, supplier_product, updated_at)
        VALUES (${ing.id}, ${ing.name}, ${ing.pricePerKg || 0}, ${ing.priceType || 'perKg'}, ${ing.supplier || ''}, ${ing.supplierProduct || ''}, ${ing.lastUpdate ? new Date(ing.lastUpdate).toISOString() : new Date().toISOString()})
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
          INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, supplier_product, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.pricePerKg || 0}, ${d.priceType || 'perKg'}, ${d.supplier || ''}, ${d.supplierProduct || ''}, ${deletedAt})
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
