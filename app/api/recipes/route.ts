import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';
import { isManager } from '@/lib/auth';
import { translateAndSave } from '@/lib/translate';

export const dynamic = 'force-dynamic';

// NOTE: reads happen via GET /api/state (assembled from all tables). This route
// only exposes the granular writes used by the client (POST/PATCH/DELETE).

/** POST /api/recipes — create recipe with nested ingredients, presets & auto-translate */
export async function POST(request: NextRequest) {
  try {
    if (!(await isManager())) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: manager role required' },
        { status: 403 }
      );
    }

    const rec = await request.json();
    const sql = getSQL();

    await sql`
      INSERT INTO recipes (id, name, yield_percentage, work_time_min, notes, folder_id, updated_at)
      VALUES (${rec.id}, ${rec.name}, ${rec.yieldPercentage || 100}, ${rec.workTimeMinutes || 0}, ${rec.notes || null}, ${rec.folder || null}, now())
    `;

    for (let idx = 0; idx < (rec.ingredients || []).length; idx++) {
      const ri = rec.ingredients[idx];
      await sql`
        INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity_grams, sort_order)
        VALUES (${ri.id}, ${rec.id}, ${ri.ingredientId}, ${ri.quantityInGrams || 0}, ${idx})
      `;
    }
    for (const pr of (rec.presets || [])) {
      await sql`
        INSERT INTO recipe_presets (id, recipe_id, name, target_weight_grams)
        VALUES (${pr.id}, ${rec.id}, ${pr.name}, ${pr.targetWeightGrams || 0})
      `;
    }

    // Fire-and-forget translation
    translateAndSave(sql, 'recipe', rec.id, rec.name, rec.sourceLang).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST /api/recipes error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** PATCH /api/recipes — update recipe (replace nested data) */
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

    // Update scalar fields
    if (updates.name !== undefined) {
      const existing = await sql`SELECT name FROM recipes WHERE id = ${id}`;
      const oldName = existing[0]?.name;
      await sql`UPDATE recipes SET name = ${updates.name}, updated_at = now() WHERE id = ${id}`;
      if (oldName && oldName !== updates.name) {
        // Re-translate on name change
        translateAndSave(sql, 'recipe', id, updates.name, updates.sourceLang).catch(() => {});
      }
    }
    if (updates.yieldPercentage !== undefined) await sql`UPDATE recipes SET yield_percentage = ${updates.yieldPercentage}, updated_at = now() WHERE id = ${id}`;
    if (updates.workTimeMinutes !== undefined) await sql`UPDATE recipes SET work_time_min = ${updates.workTimeMinutes}, updated_at = now() WHERE id = ${id}`;
    if (updates.notes !== undefined) await sql`UPDATE recipes SET notes = ${updates.notes}, updated_at = now() WHERE id = ${id}`;
    if (updates.folder !== undefined) await sql`UPDATE recipes SET folder_id = ${updates.folder || null}, updated_at = now() WHERE id = ${id}`;

    // Replace ingredients if provided
    if (updates.ingredients !== undefined) {
      await sql`DELETE FROM recipe_ingredients WHERE recipe_id = ${id}`;
      for (let idx = 0; idx < updates.ingredients.length; idx++) {
        const ri = updates.ingredients[idx];
        await sql`
          INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity_grams, sort_order)
          VALUES (${ri.id}, ${id}, ${ri.ingredientId}, ${ri.quantityInGrams || 0}, ${idx})
        `;
      }
    }

    // Replace presets if provided
    if (updates.presets !== undefined) {
      await sql`DELETE FROM recipe_presets WHERE recipe_id = ${id}`;
      for (const pr of updates.presets) {
        await sql`
          INSERT INTO recipe_presets (id, recipe_id, name, target_weight_grams)
          VALUES (${pr.id}, ${id}, ${pr.name}, ${pr.targetWeightGrams || 0})
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] PATCH /api/recipes error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** DELETE /api/recipes — soft-delete */
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
    await sql`UPDATE recipes SET deleted_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] DELETE /api/recipes error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
