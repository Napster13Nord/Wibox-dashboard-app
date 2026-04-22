import { NextResponse } from 'next/server';
import { getSQL, ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/db/migrate
 * One-time migration: reads the old wibox_state JSONB blob
 * and inserts data into the new normalized tables.
 */
export async function POST() {
  try {
    const sql = getSQL();

    // 1. Create normalized tables
    await ensureTables();

    // 2. Read old blob
    let rows: any[];
    try {
      rows = await sql`SELECT data FROM wibox_state WHERE id = 1`;
    } catch {
      return NextResponse.json({
        ok: false,
        error: 'Old wibox_state table not found. Nothing to migrate.',
      }, { status: 404 });
    }

    if (rows.length === 0 || !rows[0].data) {
      return NextResponse.json({
        ok: true,
        message: 'No data in wibox_state to migrate. Tables created.',
        migrated: { ingredients: 0, recipes: 0, dishes: 0 },
      });
    }

    const blob = rows[0].data;
    const stats = { ingredients: 0, recipes: 0, dishes: 0, folders: 0, trash: 0 };

    // 3. Migrate ingredients
    for (const ing of (blob.ingredients || [])) {
      await sql`
        INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, updated_at)
        VALUES (
          ${ing.id},
          ${ing.name},
          ${ing.pricePerKg || 0},
          ${ing.priceType || 'perKg'},
          ${ing.supplier || ''},
          ${ing.lastUpdate ? new Date(ing.lastUpdate).toISOString() : new Date().toISOString()}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      stats.ingredients++;
    }

    // 4. Migrate recipes + nested ingredients + presets
    for (const rec of (blob.recipes || [])) {
      await sql`
        INSERT INTO recipes (id, name, yield_percentage, work_time_min, hidden_costs, folder_id)
        VALUES (
          ${rec.id},
          ${rec.name},
          ${rec.yieldPercentage || 100},
          ${rec.workTimeMinutes || 0},
          ${rec.hiddenCosts || 0},
          ${rec.folder || null}
        )
        ON CONFLICT (id) DO NOTHING
      `;

      for (const ri of (rec.ingredients || [])) {
        await sql`
          INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity_grams)
          VALUES (${ri.id}, ${rec.id}, ${ri.ingredientId}, ${ri.quantityInGrams || 0})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      for (const pr of (rec.presets || [])) {
        await sql`
          INSERT INTO recipe_presets (id, recipe_id, name, target_weight_grams)
          VALUES (${pr.id}, ${rec.id}, ${pr.name}, ${pr.targetWeightGrams || 0})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      stats.recipes++;
    }

    // 5. Migrate dishes + nested recipes + direct ingredients
    for (const dish of (blob.dishes || [])) {
      await sql`
        INSERT INTO dishes (id, name, selling_price, portions, price_includes_vat, vat_rate, folder_id)
        VALUES (
          ${dish.id},
          ${dish.name},
          ${dish.sellingPrice || 0},
          ${dish.portions || 1},
          ${dish.priceIncludesVat || false},
          ${dish.vatRate ?? 14},
          ${dish.folder || null}
        )
        ON CONFLICT (id) DO NOTHING
      `;

      for (const dr of (dish.recipes || [])) {
        await sql`
          INSERT INTO dish_recipes (id, dish_id, recipe_id, quantity_grams)
          VALUES (${dr.id}, ${dish.id}, ${dr.recipeId}, ${dr.quantityInGrams || 0})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      for (const di of (dish.directIngredients || [])) {
        await sql`
          INSERT INTO dish_ingredients (id, dish_id, ingredient_id, quantity)
          VALUES (${di.id}, ${dish.id}, ${di.ingredientId}, ${di.quantity || 0})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      stats.dishes++;
    }

    // 6. Migrate folders
    for (const f of (blob.recipeFolders || [])) {
      await sql`
        INSERT INTO folders (id, type, name, color, icon)
        VALUES (${f.id}, 'recipe', ${f.name}, ${f.color || '#6366f1'}, ${f.icon || '📁'})
        ON CONFLICT (id) DO NOTHING
      `;
      stats.folders++;
    }
    for (const f of (blob.dishFolders || [])) {
      await sql`
        INSERT INTO folders (id, type, name, color, icon)
        VALUES (${f.id}, 'dish', ${f.name}, ${f.color || '#6366f1'}, ${f.icon || '📁'})
        ON CONFLICT (id) DO NOTHING
      `;
      stats.folders++;
    }

    // 7. Migrate trash — re-insert items with deleted_at set
    for (const t of (blob.trash || [])) {
      const d = t.data;
      const deletedAt = t.deletedAt || new Date().toISOString();

      if (t.originalType === 'ingredient' && d) {
        await sql`
          INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.pricePerKg || 0}, ${d.priceType || 'perKg'}, ${d.supplier || ''}, ${deletedAt})
          ON CONFLICT (id) DO NOTHING
        `;
      } else if (t.originalType === 'recipe' && d) {
        await sql`
          INSERT INTO recipes (id, name, yield_percentage, work_time_min, hidden_costs, folder_id, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.yieldPercentage || 100}, ${d.workTimeMinutes || 0}, ${d.hiddenCosts || 0}, ${d.folder || null}, ${deletedAt})
          ON CONFLICT (id) DO NOTHING
        `;
        for (const ri of (d.ingredients || [])) {
          await sql`
            INSERT INTO recipe_ingredients (id, recipe_id, ingredient_id, quantity_grams)
            VALUES (${ri.id}, ${d.id}, ${ri.ingredientId}, ${ri.quantityInGrams || 0})
            ON CONFLICT (id) DO NOTHING
          `;
        }
      } else if (t.originalType === 'dish' && d) {
        await sql`
          INSERT INTO dishes (id, name, selling_price, portions, price_includes_vat, vat_rate, folder_id, deleted_at)
          VALUES (${d.id}, ${d.name}, ${d.sellingPrice || 0}, ${d.portions || 1}, ${d.priceIncludesVat || false}, ${d.vatRate ?? 14}, ${d.folder || null}, ${deletedAt})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      stats.trash++;
    }

    return NextResponse.json({
      ok: true,
      message: 'Migration completed successfully.',
      migrated: stats,
    });
  } catch (err) {
    console.error('[Wibox Migration] Error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
