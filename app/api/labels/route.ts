import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';
import { isManager } from '@/lib/auth';
import { newId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** GET /api/labels — list all active product labels */
export async function GET(request: NextRequest) {
  try {
    const sql = getSQL();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';

    let rows;
    if (q) {
      const pattern = `%${q}%`;
      rows = await sql`
        SELECT * FROM product_labels
        WHERE deleted_at IS NULL
          AND (
            LOWER(name_sv) LIKE ${pattern}
            OR LOWER(name_fi) LIKE ${pattern}
            OR LOWER(ean_code) LIKE ${pattern}
            OR LOWER(tuotenro) LIKE ${pattern}
          )
        ORDER BY name_sv
      `;
    } else {
      rows = await sql`
        SELECT * FROM product_labels
        WHERE deleted_at IS NULL
        ORDER BY name_sv
      `;
    }

    const labels = rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      dishId: r.dish_id || undefined,
      tuotenro: r.tuotenro || '',
      eanCode: r.ean_code || '',
      nameSv: r.name_sv || '',
      nameFi: r.name_fi || '',
      weight: r.weight || '',
      ingredientsSv: r.ingredients_sv || '',
      ingredientsFi: r.ingredients_fi || '',
      ingredientsSv2: r.ingredients_sv_2 || '',
      ingredientsFi2: r.ingredients_fi_2 || '',
      bestBeforeDays: r.best_before_days != null ? Number(r.best_before_days) : undefined,
      extraLine: r.extra_line || '',
      energy: r.energy || '',
      fat: r.fat || '',
      fatSaturated: r.fat_saturated || '',
      carbs: r.carbs || '',
      sugar: r.sugar || '',
      protein: r.protein || '',
      salt: r.salt || '',
      fiber: r.fiber || '',
      notes: r.notes || '',
      updatedAt: r.updated_at ? new Date(r.updated_at as string).toISOString() : undefined,
    }));

    return NextResponse.json(labels, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error('[Wibox API] GET /api/labels error:', err);
    return NextResponse.json([], { status: 500 });
  }
}

/** POST /api/labels — create or update a product label */
export async function POST(request: NextRequest) {
  try {
    if (!(await isManager())) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: manager role required' },
        { status: 403 }
      );
    }

    const label = await request.json();
    const sql = getSQL();

    // If id is provided, check whether it exists → UPDATE; otherwise INSERT
    if (label.id) {
      const existing = await sql`SELECT id FROM product_labels WHERE id = ${label.id} AND deleted_at IS NULL`;
      if (existing.length > 0) {
        // UPDATE
        await sql`
          UPDATE product_labels SET
            dish_id          = ${label.dishId || null},
            tuotenro         = ${label.tuotenro || null},
            ean_code         = ${label.eanCode || null},
            name_sv          = ${label.nameSv || ''},
            name_fi          = ${label.nameFi || ''},
            weight           = ${label.weight || ''},
            ingredients_sv   = ${label.ingredientsSv || ''},
            ingredients_fi   = ${label.ingredientsFi || ''},
            ingredients_sv_2 = ${label.ingredientsSv2 || ''},
            ingredients_fi_2 = ${label.ingredientsFi2 || ''},
            best_before_days = ${label.bestBeforeDays != null ? label.bestBeforeDays : null},
            extra_line       = ${label.extraLine || ''},
            energy           = ${label.energy || ''},
            fat              = ${label.fat || ''},
            fat_saturated    = ${label.fatSaturated || ''},
            carbs            = ${label.carbs || ''},
            sugar            = ${label.sugar || ''},
            protein          = ${label.protein || ''},
            salt             = ${label.salt || ''},
            fiber            = ${label.fiber || ''},
            notes            = ${label.notes || ''},
            updated_at       = now()
          WHERE id = ${label.id}
        `;
        return NextResponse.json({ ok: true, id: label.id });
      }
    }

    // INSERT — generate id if not provided
    const id = label.id || newId('lbl');
    await sql`
      INSERT INTO product_labels (
        id, dish_id, tuotenro, ean_code, name_sv, name_fi, weight,
        ingredients_sv, ingredients_fi, ingredients_sv_2, ingredients_fi_2,
        best_before_days, extra_line,
        energy, fat, fat_saturated, carbs, sugar, protein, salt, fiber,
        notes
      ) VALUES (
        ${id},
        ${label.dishId || null},
        ${label.tuotenro || null},
        ${label.eanCode || null},
        ${label.nameSv || ''},
        ${label.nameFi || ''},
        ${label.weight || ''},
        ${label.ingredientsSv || ''},
        ${label.ingredientsFi || ''},
        ${label.ingredientsSv2 || ''},
        ${label.ingredientsFi2 || ''},
        ${label.bestBeforeDays != null ? label.bestBeforeDays : null},
        ${label.extraLine || ''},
        ${label.energy || ''},
        ${label.fat || ''},
        ${label.fatSaturated || ''},
        ${label.carbs || ''},
        ${label.sugar || ''},
        ${label.protein || ''},
        ${label.salt || ''},
        ${label.fiber || ''},
        ${label.notes || ''}
      )
    `;

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error('[Wibox API] POST /api/labels error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** DELETE /api/labels — soft-delete (id in query param) */
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
    await sql`UPDATE product_labels SET deleted_at = now() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] DELETE /api/labels error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
