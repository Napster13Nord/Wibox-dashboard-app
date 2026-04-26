import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';
import { translateAndSave, loadTranslations } from '@/lib/translate';

export const dynamic = 'force-dynamic';

/** GET /api/ingredients — list all active ingredients with translations */
export async function GET() {
  try {
    const sql = getSQL();
    const rows = await sql`SELECT * FROM ingredients WHERE deleted_at IS NULL ORDER BY name`;

    // Load translations for all ingredients
    const translationMap = await loadTranslations(sql, 'ingredient');

    const ingredients = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      pricePerKg: Number(r.price_per_kg),
      priceType: r.price_type,
      supplier: r.supplier || '',
      lastUpdate: r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : '',
      lemonsoftId: r.lemonsoft_id || undefined,
      translations: translationMap[r.id] || {},
    }));
    return NextResponse.json(ingredients, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error('[Wibox API] GET /api/ingredients error:', err);
    return NextResponse.json([], { status: 500 });
  }
}

/** POST /api/ingredients — create a new ingredient + auto-translate */
export async function POST(request: NextRequest) {
  try {
    const ing = await request.json();
    const sql = getSQL();
    await sql`
      INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, updated_at)
      VALUES (${ing.id}, ${ing.name}, ${ing.pricePerKg || 0}, ${ing.priceType || 'perKg'}, ${ing.supplier || ''}, now())
    `;

    // Fire-and-forget translation (non-blocking for the response)
    translateAndSave(sql, 'ingredient', ing.id, ing.name).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST /api/ingredients error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** PATCH /api/ingredients — update an existing ingredient (id in body) */
export async function PATCH(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

    const sql = getSQL();

    // Build dynamic update — only update provided fields
    if (updates.name !== undefined) {
      await sql`UPDATE ingredients SET name = ${updates.name}, updated_at = now() WHERE id = ${id}`;
      // Re-translate on name change
      translateAndSave(sql, 'ingredient', id, updates.name).catch(() => {});
    }
    if (updates.pricePerKg !== undefined) {
      await sql`UPDATE ingredients SET price_per_kg = ${updates.pricePerKg}, updated_at = now() WHERE id = ${id}`;
    }
    if (updates.priceType !== undefined) {
      await sql`UPDATE ingredients SET price_type = ${updates.priceType}, updated_at = now() WHERE id = ${id}`;
    }
    if (updates.supplier !== undefined) {
      await sql`UPDATE ingredients SET supplier = ${updates.supplier}, updated_at = now() WHERE id = ${id}`;
    }
    if (updates.lemonsoftId !== undefined) {
      await sql`UPDATE ingredients SET lemonsoft_id = ${updates.lemonsoftId}, updated_at = now() WHERE id = ${id}`;
    }

    // If only lastUpdate was sent (without other fields), still touch updated_at
    if (Object.keys(updates).length === 0 || (Object.keys(updates).length === 1 && updates.lastUpdate !== undefined)) {
      await sql`UPDATE ingredients SET updated_at = now() WHERE id = ${id}`;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] PATCH /api/ingredients error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** DELETE /api/ingredients — soft-delete (id in query param) */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

    const sql = getSQL();
    await sql`UPDATE ingredients SET deleted_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] DELETE /api/ingredients error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
