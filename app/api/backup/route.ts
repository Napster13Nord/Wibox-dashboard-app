import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/backup — export full database as JSON (same shape as legacy blob)
 */
export async function GET() {
  try {
    // Reuse /api/state logic — fetch from there
    const stateRes = await fetch(new URL('/api/state', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'), {
      cache: 'no-store',
    });
    const state = await stateRes.json();

    return new NextResponse(JSON.stringify(state, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="wibox-backup.json"',
      },
    });
  } catch (err) {
    console.error('[Wibox API] GET /api/backup error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/**
 * POST /api/backup — import JSON backup (overwrites all data)
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const sql = getSQL();

    // Clear all tables
    await sql`DELETE FROM dish_ingredients`;
    await sql`DELETE FROM dish_recipes`;
    await sql`DELETE FROM recipe_presets`;
    await sql`DELETE FROM recipe_ingredients`;
    await sql`DELETE FROM dishes`;
    await sql`DELETE FROM recipes`;
    await sql`DELETE FROM ingredients`;
    await sql`DELETE FROM folders`;

    // Re-insert via the state route logic
    // Inline it here to avoid circular fetch
    for (const ing of (data.ingredients || [])) {
      await sql`
        INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, updated_at)
        VALUES (${ing.id}, ${ing.name}, ${ing.pricePerKg || 0}, ${ing.priceType || 'perKg'}, ${ing.supplier || ''}, now())
      `;
    }

    for (const rec of (data.recipes || [])) {
      await sql`
        INSERT INTO recipes (id, name, yield_percentage, work_time_min, hidden_costs, folder_id)
        VALUES (${rec.id}, ${rec.name}, ${rec.yieldPercentage || 100}, ${rec.workTimeMinutes || 0}, ${rec.hiddenCosts || 0}, ${rec.folder || null})
      `;
      for (const ri of (rec.ingredients || [])) {
        await sql`INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity_grams) VALUES (${ri.id}, ${rec.id}, ${ri.ingredientId}, ${ri.quantityInGrams || 0})`;
      }
      for (const pr of (rec.presets || [])) {
        await sql`INSERT INTO recipe_presets (id, recipe_id, name, target_weight_grams) VALUES (${pr.id}, ${rec.id}, ${pr.name}, ${pr.targetWeightGrams || 0})`;
      }
    }

    for (const dish of (data.dishes || [])) {
      await sql`
        INSERT INTO dishes (id, name, selling_price, portions, price_includes_vat, vat_rate, folder_id)
        VALUES (${dish.id}, ${dish.name}, ${dish.sellingPrice || 0}, ${dish.portions || 1}, ${dish.priceIncludesVat || false}, ${dish.vatRate ?? 14}, ${dish.folder || null})
      `;
      for (const dr of (dish.recipes || [])) {
        await sql`INSERT INTO dish_recipes (id, dish_id, recipe_id, quantity_grams) VALUES (${dr.id}, ${dish.id}, ${dr.recipeId}, ${dr.quantityInGrams || 0})`;
      }
      for (const di of (dish.directIngredients || [])) {
        await sql`INSERT INTO dish_ingredients (id, dish_id, ingredient_id, quantity) VALUES (${di.id}, ${dish.id}, ${di.ingredientId}, ${di.quantity || 0})`;
      }
    }

    for (const f of (data.recipeFolders || [])) {
      await sql`INSERT INTO folders (id, type, name, color, icon) VALUES (${f.id}, 'recipe', ${f.name}, ${f.color}, ${f.icon})`;
    }
    for (const f of (data.dishFolders || [])) {
      await sql`INSERT INTO folders (id, type, name, color, icon) VALUES (${f.id}, 'dish', ${f.name}, ${f.color}, ${f.icon})`;
    }

    for (const t of (data.trash || [])) {
      const d = t.data;
      const deletedAt = t.deletedAt || new Date().toISOString();
      if (t.originalType === 'ingredient' && d) {
        await sql`INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, deleted_at) VALUES (${d.id}, ${d.name}, ${d.pricePerKg || 0}, ${d.priceType || 'perKg'}, ${d.supplier || ''}, ${deletedAt}) ON CONFLICT (id) DO UPDATE SET deleted_at = ${deletedAt}`;
      } else if (t.originalType === 'recipe' && d) {
        await sql`INSERT INTO recipes (id, name, yield_percentage, work_time_min, hidden_costs, deleted_at) VALUES (${d.id}, ${d.name}, ${d.yieldPercentage || 100}, ${d.workTimeMinutes || 0}, ${d.hiddenCosts || 0}, ${deletedAt}) ON CONFLICT (id) DO UPDATE SET deleted_at = ${deletedAt}`;
      } else if (t.originalType === 'dish' && d) {
        await sql`INSERT INTO dishes (id, name, selling_price, portions, price_includes_vat, vat_rate, deleted_at) VALUES (${d.id}, ${d.name}, ${d.sellingPrice || 0}, ${d.portions || 1}, ${d.priceIncludesVat || false}, ${d.vatRate ?? 14}, ${deletedAt}) ON CONFLICT (id) DO UPDATE SET deleted_at = ${deletedAt}`;
      }
    }

    // Log the sync
    await sql`INSERT INTO sync_log (source, entity_type, entity_id, action) VALUES ('backup_import', 'full', 'all', 'import')`;

    return NextResponse.json({ ok: true, message: 'Backup imported successfully' });
  } catch (err) {
    console.error('[Wibox API] POST /api/backup error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
