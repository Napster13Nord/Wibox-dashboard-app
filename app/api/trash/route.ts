import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/trash/restore — restore a soft-deleted item
 * Body: { entityType: 'ingredient'|'recipe'|'dish', entityId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { entityType, entityId } = await request.json();
    if (!entityType || !entityId) {
      return NextResponse.json({ ok: false, error: 'Missing entityType or entityId' }, { status: 400 });
    }

    const sql = getSQL();
    const table = entityType === 'ingredient' ? 'ingredients'
      : entityType === 'recipe' ? 'recipes'
      : entityType === 'dish' ? 'dishes'
      : null;

    if (!table) {
      return NextResponse.json({ ok: false, error: 'Invalid entityType' }, { status: 400 });
    }

    // Clear deleted_at to restore
    await sql`UPDATE ingredients SET deleted_at = NULL, updated_at = now() WHERE id = ${entityId}`;
    if (table === 'recipes') {
      await sql`UPDATE recipes SET deleted_at = NULL, updated_at = now() WHERE id = ${entityId}`;
    } else if (table === 'dishes') {
      await sql`UPDATE dishes SET deleted_at = NULL, updated_at = now() WHERE id = ${entityId}`;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST /api/trash/restore error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/trash — permanently delete item or empty trash
 * Query: ?entityType=ingredient&entityId=xxx  (single item)
 * Query: ?all=true                            (empty all trash)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const sql = getSQL();

    if (all === 'true') {
      // Permanently delete all trashed items and their child rows
      // Dishes first (children)
      const trashedDishes = await sql`SELECT id FROM dishes WHERE deleted_at IS NOT NULL`;
      for (const d of trashedDishes) {
        await sql`DELETE FROM dish_recipes WHERE dish_id = ${d.id}`;
        await sql`DELETE FROM dish_ingredients WHERE dish_id = ${d.id}`;
      }
      await sql`DELETE FROM dishes WHERE deleted_at IS NOT NULL`;

      // Recipes
      const trashedRecipes = await sql`SELECT id FROM recipes WHERE deleted_at IS NOT NULL`;
      for (const r of trashedRecipes) {
        await sql`DELETE FROM recipe_ingredients WHERE recipe_id = ${r.id}`;
        await sql`DELETE FROM recipe_presets WHERE recipe_id = ${r.id}`;
      }
      await sql`DELETE FROM recipes WHERE deleted_at IS NOT NULL`;

      // Ingredients
      await sql`DELETE FROM ingredients WHERE deleted_at IS NOT NULL`;

      return NextResponse.json({ ok: true });
    }

    if (!entityType || !entityId) {
      return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    }

    if (entityType === 'ingredient') {
      await sql`DELETE FROM ingredients WHERE id = ${entityId} AND deleted_at IS NOT NULL`;
    } else if (entityType === 'recipe') {
      await sql`DELETE FROM recipe_ingredients WHERE recipe_id = ${entityId}`;
      await sql`DELETE FROM recipe_presets WHERE recipe_id = ${entityId}`;
      await sql`DELETE FROM recipes WHERE id = ${entityId} AND deleted_at IS NOT NULL`;
    } else if (entityType === 'dish') {
      await sql`DELETE FROM dish_recipes WHERE dish_id = ${entityId}`;
      await sql`DELETE FROM dish_ingredients WHERE dish_id = ${entityId}`;
      await sql`DELETE FROM dishes WHERE id = ${entityId} AND deleted_at IS NOT NULL`;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] DELETE /api/trash error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
