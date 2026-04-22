import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/dishes — list all active dishes with nested recipes & direct ingredients */
export async function GET() {
  try {
    const sql = getSQL();
    const rows = await sql`SELECT * FROM dishes WHERE deleted_at IS NULL ORDER BY name`;
    const allDR = await sql`SELECT * FROM dish_recipes`;
    const allDI = await sql`SELECT * FROM dish_ingredients`;

    const dishes = rows.map((d: any) => ({
      id: d.id,
      name: d.name,
      sellingPrice: Number(d.selling_price),
      portions: Number(d.portions),
      priceIncludesVat: d.price_includes_vat,
      vatRate: Number(d.vat_rate),
      folder: d.folder_id || '',
      recipes: allDR.filter((dr: any) => dr.dish_id === d.id).map((dr: any) => ({
        id: dr.id, recipeId: dr.recipe_id, quantityInGrams: Number(dr.quantity_grams),
      })),
      directIngredients: allDI.filter((di: any) => di.dish_id === d.id).map((di: any) => ({
        id: di.id, ingredientId: di.ingredient_id, quantity: Number(di.quantity),
      })),
    }));

    return NextResponse.json(dishes, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (err) {
    console.error('[Wibox API] GET /api/dishes error:', err);
    return NextResponse.json([], { status: 500 });
  }
}

/** POST /api/dishes — create dish with nested recipe refs & direct ingredients */
export async function POST(request: NextRequest) {
  try {
    const dish = await request.json();
    const sql = getSQL();

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST /api/dishes error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** PATCH /api/dishes — update dish (replace nested data) */
export async function PATCH(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    const sql = getSQL();

    if (updates.name !== undefined) await sql`UPDATE dishes SET name = ${updates.name}, updated_at = now() WHERE id = ${id}`;
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
