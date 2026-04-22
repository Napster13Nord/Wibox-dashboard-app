import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/recipes — list all active recipes with nested ingredients & presets */
export async function GET() {
  try {
    const sql = getSQL();
    const rows = await sql`SELECT * FROM recipes WHERE deleted_at IS NULL ORDER BY name`;
    const allRI = await sql`SELECT * FROM recipe_ingredients`;
    const allRP = await sql`SELECT * FROM recipe_presets`;

    const recipes = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      yieldPercentage: Number(r.yield_percentage),
      workTimeMinutes: Number(r.work_time_min),
      hiddenCosts: Number(r.hidden_costs) || 0,
      folder: r.folder_id || '',
      ingredients: allRI.filter((ri: any) => ri.recipe_id === r.id).map((ri: any) => ({
        id: ri.id, ingredientId: ri.ingredient_id, quantityInGrams: Number(ri.quantity_grams),
      })),
      presets: allRP.filter((p: any) => p.recipe_id === r.id).map((p: any) => ({
        id: p.id, name: p.name, targetWeightGrams: Number(p.target_weight_grams),
      })),
    }));

    return NextResponse.json(recipes, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err) {
    console.error('[Wibox API] GET /api/recipes error:', err);
    return NextResponse.json([], { status: 500 });
  }
}

/** POST /api/recipes — create recipe with nested ingredients & presets */
export async function POST(request: NextRequest) {
  try {
    const rec = await request.json();
    const sql = getSQL();

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST /api/recipes error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** PATCH /api/recipes — update recipe (replace nested data) */
export async function PATCH(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    const sql = getSQL();

    // Update scalar fields
    if (updates.name !== undefined) await sql`UPDATE recipes SET name = ${updates.name}, updated_at = now() WHERE id = ${id}`;
    if (updates.yieldPercentage !== undefined) await sql`UPDATE recipes SET yield_percentage = ${updates.yieldPercentage}, updated_at = now() WHERE id = ${id}`;
    if (updates.workTimeMinutes !== undefined) await sql`UPDATE recipes SET work_time_min = ${updates.workTimeMinutes}, updated_at = now() WHERE id = ${id}`;
    if (updates.hiddenCosts !== undefined) await sql`UPDATE recipes SET hidden_costs = ${updates.hiddenCosts}, updated_at = now() WHERE id = ${id}`;
    if (updates.folder !== undefined) await sql`UPDATE recipes SET folder_id = ${updates.folder || null}, updated_at = now() WHERE id = ${id}`;

    // Replace ingredients if provided
    if (updates.ingredients !== undefined) {
      await sql`DELETE FROM recipe_ingredients WHERE recipe_id = ${id}`;
      for (const ri of updates.ingredients) {
        await sql`
          INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity_grams)
          VALUES (${ri.id}, ${id}, ${ri.ingredientId}, ${ri.quantityInGrams || 0})
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
