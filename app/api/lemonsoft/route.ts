import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lemonsoft
 * Returns the ingredient price list in a format ready for Lemonsoft integration.
 * When API credentials are available, this endpoint can be consumed by Lemonsoft
 * or used to push data to Lemonsoft's REST API.
 *
 * Response format follows common ERP article/product conventions.
 */
export async function GET() {
  try {
    const sql = getSQL();
    const rows = await sql`
      SELECT id, name, price_per_kg, price_type, supplier, lemonsoft_id, updated_at
      FROM ingredients
      WHERE deleted_at IS NULL
      ORDER BY name
    `;

    const priceList = rows.map((r: any) => ({
      // Wibox fields
      wibox_id: r.id,
      name: r.name,
      price: Number(r.price_per_kg),
      price_type: r.price_type,       // 'perKg' | 'perUnit'
      unit: r.price_type === 'perKg' ? 'kg' : 'pcs',
      supplier: r.supplier || '',
      updated_at: r.updated_at,

      // Lemonsoft mapping (populated when sync is configured)
      lemonsoft_article_id: r.lemonsoft_id || null,
    }));

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      total_items: priceList.length,
      currency: 'EUR',
      items: priceList,
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error('[Wibox API] GET /api/lemonsoft error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * POST /api/lemonsoft
 * Trigger a sync from Lemonsoft → Wibox.
 * Currently a placeholder — will be connected when Lemonsoft API credentials are available.
 *
 * Expected flow:
 * 1. Fetch articles from Lemonsoft REST API (GET /api/v1/articles)
 * 2. Match by name or lemonsoft_id
 * 3. Update ingredient prices in Wibox
 * 4. Log sync in sync_log table
 *
 * Body (future):
 * {
 *   api_key: string,
 *   api_url: string,
 *   database: string,
 *   username: string,
 *   password: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sql = getSQL();

    // ── PLACEHOLDER: Lemonsoft API integration ──
    // When credentials are available, uncomment and configure:
    //
    // const lemonsoftUrl = body.api_url || process.env.LEMONSOFT_API_URL;
    // const lemonsoftKey = body.api_key || process.env.LEMONSOFT_API_KEY;
    //
    // if (!lemonsoftUrl || !lemonsoftKey) {
    //   return NextResponse.json({
    //     ok: false,
    //     error: 'Lemonsoft API credentials not configured'
    //   }, { status: 400 });
    // }
    //
    // // Fetch articles from Lemonsoft
    // const lsResponse = await fetch(`${lemonsoftUrl}/api/v1/articles`, {
    //   headers: {
    //     'Authorization': `Bearer ${lemonsoftKey}`,
    //     'Accept': 'application/json',
    //   },
    // });
    // const articles = await lsResponse.json();
    //
    // // Match and update prices
    // let updated = 0;
    // for (const article of articles) {
    //   // Try to match by lemonsoft_id first, then by name
    //   const existing = await sql`
    //     SELECT id FROM ingredients
    //     WHERE lemonsoft_id = ${article.id} OR LOWER(name) = LOWER(${article.name})
    //     LIMIT 1
    //   `;
    //
    //   if (existing.length > 0) {
    //     await sql`
    //       UPDATE ingredients
    //       SET price_per_kg = ${article.price},
    //           lemonsoft_id = ${article.id},
    //           supplier = COALESCE(${article.supplier}, supplier),
    //           updated_at = now()
    //       WHERE id = ${existing[0].id}
    //     `;
    //     updated++;
    //   } else {
    //     // Create new ingredient from Lemonsoft
    //     const newId = Date.now().toString();
    //     await sql`
    //       INSERT INTO ingredients (id, name, price_per_kg, price_type, supplier, lemonsoft_id)
    //       VALUES (${newId}, ${article.name}, ${article.price}, 'perKg', ${article.supplier || ''}, ${article.id})
    //     `;
    //     updated++;
    //   }
    //
    //   // Log each sync
    //   await sql`
    //     INSERT INTO sync_log (source, entity_type, entity_id, action, payload)
    //     VALUES ('lemonsoft', 'ingredient', ${article.id}, 'sync', ${JSON.stringify(article)}::jsonb)
    //   `;
    // }

    // For now, return placeholder response
    await sql`
      INSERT INTO sync_log (source, entity_type, entity_id, action, payload)
      VALUES ('lemonsoft', 'ingredient', 'manual_trigger', 'sync_attempted', ${JSON.stringify({ message: 'Credentials not yet configured', triggered_at: new Date().toISOString() })}::jsonb)
    `;

    return NextResponse.json({
      ok: true,
      message: 'Lemonsoft sync endpoint ready. Configure API credentials to enable automatic price sync.',
      status: 'placeholder',
      instructions: [
        '1. Obtain Lemonsoft API key and IWS_LOG license from your Lemonsoft account manager',
        '2. Add LEMONSOFT_API_URL and LEMONSOFT_API_KEY to your .env file',
        '3. Uncomment the sync logic in /api/lemonsoft/route.ts',
        '4. Map your ingredients to Lemonsoft article IDs via the lemonsoftId field',
      ],
    });
  } catch (err) {
    console.error('[Wibox API] POST /api/lemonsoft error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
