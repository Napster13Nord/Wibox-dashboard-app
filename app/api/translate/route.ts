import { NextResponse } from 'next/server';
import { getSQL, ensureTables } from '@/lib/db';
import { translateName, saveTranslations } from '@/lib/translate';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for batch translation

/**
 * POST /api/translate
 * One-time migration: translates all existing ingredients, recipes, and dishes
 * that don't have translations yet.
 */
export async function POST() {
  try {
    const sql = getSQL();
    await ensureTables();

    const stats = { ingredients: 0, recipes: 0, dishes: 0, skipped: 0, errors: 0 };

    // Get all active ingredients without translations
    const ingredients = await sql`
      SELECT i.id, i.name
      FROM ingredients i
      WHERE i.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM translations t
          WHERE t.entity_type = 'ingredient' AND t.entity_id = i.id
        )
    `;

    for (const ing of ingredients) {
      try {
        const translations = await translateName(ing.name as string);
        if (Object.keys(translations).length > 0) {
          await saveTranslations(sql, 'ingredient', ing.id as string, translations);
          stats.ingredients++;
        } else {
          stats.skipped++;
        }
      } catch (err) {
        console.error(`[Wibox Translate] Failed ingredient "${ing.name}":`, err);
        stats.errors++;
      }
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get all active recipes without translations
    const recipes = await sql`
      SELECT r.id, r.name
      FROM recipes r
      WHERE r.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM translations t
          WHERE t.entity_type = 'recipe' AND t.entity_id = r.id
        )
    `;

    for (const rec of recipes) {
      try {
        const translations = await translateName(rec.name as string);
        if (Object.keys(translations).length > 0) {
          await saveTranslations(sql, 'recipe', rec.id as string, translations);
          stats.recipes++;
        } else {
          stats.skipped++;
        }
      } catch (err) {
        console.error(`[Wibox Translate] Failed recipe "${rec.name}":`, err);
        stats.errors++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get all active dishes without translations
    const dishes = await sql`
      SELECT d.id, d.name
      FROM dishes d
      WHERE d.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM translations t
          WHERE t.entity_type = 'dish' AND t.entity_id = d.id
        )
    `;

    for (const dish of dishes) {
      try {
        const translations = await translateName(dish.name as string);
        if (Object.keys(translations).length > 0) {
          await saveTranslations(sql, 'dish', dish.id as string, translations);
          stats.dishes++;
        } else {
          stats.skipped++;
        }
      } catch (err) {
        console.error(`[Wibox Translate] Failed dish "${dish.name}":`, err);
        stats.errors++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      ok: true,
      message: 'Translation migration completed.',
      translated: stats,
      total: {
        ingredients: ingredients.length,
        recipes: recipes.length,
        dishes: dishes.length,
      },
    });
  } catch (err) {
    console.error('[Wibox Translate] Migration error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/**
 * GET /api/translate
 * Returns translation status/stats for all entities.
 */
export async function GET() {
  try {
    const sql = getSQL();
    await ensureTables();

    const ingredientCount = await sql`SELECT COUNT(*) as count FROM ingredients WHERE deleted_at IS NULL`;
    const recipeCount = await sql`SELECT COUNT(*) as count FROM recipes WHERE deleted_at IS NULL`;
    const dishCount = await sql`SELECT COUNT(*) as count FROM dishes WHERE deleted_at IS NULL`;

    const translatedIngredients = await sql`
      SELECT COUNT(DISTINCT entity_id) as count FROM translations WHERE entity_type = 'ingredient'
    `;
    const translatedRecipes = await sql`
      SELECT COUNT(DISTINCT entity_id) as count FROM translations WHERE entity_type = 'recipe'
    `;
    const translatedDishes = await sql`
      SELECT COUNT(DISTINCT entity_id) as count FROM translations WHERE entity_type = 'dish'
    `;

    return NextResponse.json({
      ingredients: {
        total: Number(ingredientCount[0]?.count || 0),
        translated: Number(translatedIngredients[0]?.count || 0),
      },
      recipes: {
        total: Number(recipeCount[0]?.count || 0),
        translated: Number(translatedRecipes[0]?.count || 0),
      },
      dishes: {
        total: Number(dishCount[0]?.count || 0),
        translated: Number(translatedDishes[0]?.count || 0),
      },
    });
  } catch (err) {
    console.error('[Wibox Translate] Status error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
