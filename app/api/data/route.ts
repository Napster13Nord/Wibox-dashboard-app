import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSQL() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export async function GET() {
  try {
    const sql = getSQL();

    // Ensure table exists (idempotent, runs every time but costs nothing)
    await sql`
      CREATE TABLE IF NOT EXISTS wibox_state (
        id   INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB   NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const rows = await sql`SELECT data FROM wibox_state WHERE id = 1`;

    if (rows.length === 0) {
      return NextResponse.json(null, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
      });
    }

    return NextResponse.json(rows[0].data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    });
  } catch (err) {
    console.error('[Wibox API] GET error:', err);
    return NextResponse.json(null, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const sql = getSQL();

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS wibox_state (
        id   INTEGER PRIMARY KEY DEFAULT 1,
        data JSONB   NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const jsonStr = JSON.stringify(data);

    // Upsert: insert row 1 or update it
    await sql`
      INSERT INTO wibox_state (id, data, updated_at)
      VALUES (1, ${jsonStr}::jsonb, now())
      ON CONFLICT (id) DO UPDATE
      SET data = ${jsonStr}::jsonb,
          updated_at = now()
    `;

    console.log('[Wibox API] Data saved to Neon PostgreSQL');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
