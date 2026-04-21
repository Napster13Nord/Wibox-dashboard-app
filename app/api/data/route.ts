import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force Next.js to treat this route as fully dynamic (no server-side caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DATA_FILE = path.join(process.cwd(), 'data', 'wibox-data.json');

export async function GET() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return NextResponse.json(null, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
      });
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(raw), {
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
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[Wibox API] Data saved successfully');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
