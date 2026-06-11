import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';
import { isManager } from '@/lib/auth';
import { translateAndSave } from '@/lib/translate';
import { DEFAULT_VAT_RATE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// NOTE: reads happen via GET /api/state (assembled from all tables). This route
// only exposes the granular writes used by the client (POST/PATCH/DELETE).

/** POST /api/dishes — create dish with nested recipe refs, direct ingredients & auto-translate */
export async function POST(request: NextRequest) {
  try {
    if (!(await isManager())) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: manager role required' },
        { status: 403 }
      );
    }

    const dish = await request.json();
    const sql = getSQL();

    await sql`
      INSERT INTO dishes (id, name, selling_price, portions, price_includes_vat, vat_rate, folder_id)
      VALUES (${dish.id}, ${dish.name}, ${dish.sellingPrice || 0}, ${dish.portions || 1}, ${dish.priceIncludesVat || false}, ${dish.vatRate ?? DEFAULT_VAT_RATE}, ${dish.folder || null})
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

    // Fire-and-forget translation
    translateAndSave(sql, 'dish', dish.id, dish.name, dish.sourceLang).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST /api/dishes error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** PATCH /api/dishes — update dish (replace nested data) */
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isManager())) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: manager role required' },
        { status: 403 }
      );
    }

    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    const sql = getSQL();

    if (updates.name !== undefined) {
      const existing = await sql`SELECT name FROM dishes WHERE id = ${id}`;
      const oldName = existing[0]?.name;
      await sql`UPDATE dishes SET name = ${updates.name}, updated_at = now() WHERE id = ${id}`;
      if (oldName && oldName !== updates.name) {
        // Re-translate on name change
        translateAndSave(sql, 'dish', id, updates.name, updates.sourceLang).catch(() => {});
      }
    }
    if (updates.sellingPrice !== undefined) await sql`UPDATE dishes SET selling_price = ${updates.sellingPrice}, updated_at = now() WHERE id = ${id}`;
    if (updates.portions !== undefined) await sql`UPDATE dishes SET portions = ${updates.portions}, updated_at = now() WHERE id = ${id}`;
    if (updates.priceIncludesVat !== undefined) await sql`UPDATE dishes SET price_includes_vat = ${updates.priceIncludesVat}, updated_at = now() WHERE id = ${id}`;
    if (updates.vatRate !== undefined) await sql`UPDATE dishes SET vat_rate = ${updates.vatRate}, updated_at = now() WHERE id = ${id}`;
    if (updates.folder !== undefined) await sql`UPDATE dishes SET folder_id = ${updates.folder || null}, updated_at = now() WHERE id = ${id}`;

    if (updates.recipes !== undefined) {
      await sql`DELETE FROM dish_recipes WHERE dish_id = ${id}`;
      for (const dr of updates.recipes) {
        await sql`
          INSERT INTO dish_recipes (id, dish_id, recipe_id, quantity_grams)
          VALUES (${dr.id}, ${id}, ${dr.recipeId}, ${dr.quantityInGrams || 0})
        `;
      }
    }

    if (updates.directIngredients !== undefined) {
      await sql`DELETE FROM dish_ingredients WHERE dish_id = ${id}`;
      for (const di of updates.directIngredients) {
        await sql`
          INSERT INTO dish_ingredients (id, dish_id, ingredient_id, quantity)
          VALUES (${di.id}, ${id}, ${di.ingredientId}, ${di.quantity || 0})
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] PATCH /api/dishes error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** DELETE /api/dishes — soft-delete */
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isManager())) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: manager role required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    const sql = getSQL();
    await sql`UPDATE dishes SET deleted_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] DELETE /api/dishes error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
