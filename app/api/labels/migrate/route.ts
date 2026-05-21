import { NextResponse } from 'next/server';
import { getSQL, ensureTables } from '@/lib/db';
import { isManager } from '@/lib/auth';
import labelsImport from '@/data/labels-import.json';

export const dynamic = 'force-dynamic';

/**
 * Raw shape of each record in data/labels-import.json
 * (produced once from WI-BOX_KANTA.xls by the extraction step).
 */
type RawLabel = {
  notes: string;
  tuotenro: string;
  ean_code: string;
  name_sv: string;
  name_fi: string;
  weight: string;
  ingredients_sv: string;
  ingredients_fi: string;
  best_before_days: string;
  ingredients_sv_2: string;
  ingredients_fi_2: string;
  extra_line: string;
  energy: string;
  fat: string;
  fat_saturated: string;
  carbs: string;
  sugar: string;
  protein: string;
  salt: string;
  fiber: string;
};

/** Parse the "PARASTA ENNEN" field into an integer day count, or null. */
function parseBestBefore(value: string): number | null {
  if (!value) return null;
  const n = parseInt(String(value).replace(',', '.'), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * POST /api/labels/migrate
 * One-time import of the product label catalogue from WI-BOX_KANTA.xls
 * (bundled as data/labels-import.json) into the product_labels table.
 *
 * Idempotent: existing rows with the same id are left untouched
 * (ON CONFLICT DO NOTHING). Run once after deploying the labels feature.
 */
export async function POST() {
  try {
    if (!(await isManager())) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: manager role required' },
        { status: 403 }
      );
    }

    const sql = getSQL();

    // 1. Make sure product_labels / print_queue exist.
    await ensureTables();

    // 2. Import is idempotent at the catalogue level: if product_labels
    //    already holds rows, skip re-importing rather than duplicating.
    const existing = await sql`SELECT COUNT(*)::int AS n FROM product_labels`;
    if ((existing[0]?.n ?? 0) > 0) {
      return NextResponse.json({
        ok: true,
        message: 'product_labels already populated — import skipped.',
        existing_rows: existing[0].n,
        total_rows: (labelsImport as RawLabel[]).length,
        processed: 0,
      });
    }

    // 3. Insert each label row.
    //    NOTE: neither TUOTENRO nor EAN is unique in WI-BOX_KANTA.xls
    //    (product numbers and barcodes are reused across variants), so
    //    the primary key is a sequential synthetic id. TUOTENRO and EAN
    //    are kept as plain searchable fields.
    const rows = labelsImport as RawLabel[];
    let inserted = 0;
    let index = 0;

    for (const r of rows) {
      index++;
      const id = `lbl_${String(index).padStart(4, '0')}`;

      await sql`
        INSERT INTO product_labels (
          id, tuotenro, ean_code, name_sv, name_fi, weight,
          ingredients_sv, ingredients_fi, ingredients_sv_2, ingredients_fi_2,
          best_before_days, extra_line,
          energy, fat, fat_saturated, carbs, sugar, protein, salt, fiber,
          notes
        )
        VALUES (
          ${id},
          ${r.tuotenro || null},
          ${r.ean_code || null},
          ${r.name_sv || ''},
          ${r.name_fi || ''},
          ${r.weight || ''},
          ${r.ingredients_sv || ''},
          ${r.ingredients_fi || ''},
          ${r.ingredients_sv_2 || ''},
          ${r.ingredients_fi_2 || ''},
          ${parseBestBefore(r.best_before_days)},
          ${r.extra_line || ''},
          ${r.energy || ''},
          ${r.fat || ''},
          ${r.fat_saturated || ''},
          ${r.carbs || ''},
          ${r.sugar || ''},
          ${r.protein || ''},
          ${r.salt || ''},
          ${r.fiber || ''},
          ${r.notes || ''}
        )
      `;
      inserted++;
    }

    return NextResponse.json({
      ok: true,
      message: 'Product label catalogue imported.',
      total_rows: rows.length,
      processed: inserted,
    });
  } catch (err) {
    console.error('[Wibox Labels] POST /api/labels/migrate error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
