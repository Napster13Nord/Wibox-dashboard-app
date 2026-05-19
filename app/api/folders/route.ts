import { NextRequest, NextResponse } from 'next/server';
import { getSQL } from '@/lib/db';
import { isManager } from '@/lib/auth';
import { translateAndSave, loadTranslations } from '@/lib/translate';

export const dynamic = 'force-dynamic';

/** GET /api/folders?type=recipe|dish — list folders with translations */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const sql = getSQL();

    const rows = type
      ? await sql`SELECT * FROM folders WHERE type = ${type} ORDER BY name`
      : await sql`SELECT * FROM folders ORDER BY type, name`;

    // Load translations for all folders
    const translationMap = await loadTranslations(sql, 'folder');

    const folders = rows.map((f: any) => ({
      id: f.id, name: f.name, color: f.color, icon: f.icon, type: f.type,
      translations: translationMap[f.id] || {},
    }));
    return NextResponse.json(folders);
  } catch (err) {
    console.error('[Wibox API] GET /api/folders error:', err);
    return NextResponse.json([], { status: 500 });
  }
}

/** POST /api/folders — create folder + auto-translate */
export async function POST(request: NextRequest) {
  try {
    if (!(await isManager())) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: manager role required' },
        { status: 403 }
      );
    }

    const { type, sourceLang, ...folder } = await request.json();
    const sql = getSQL();
    await sql`
      INSERT INTO folders (id, type, name, color, icon)
      VALUES (${folder.id}, ${type}, ${folder.name}, ${folder.color || '#6366f1'}, ${folder.icon || '📁'})
    `;

    // Fire-and-forget translation (non-blocking for the response)
    translateAndSave(sql, 'folder', folder.id, folder.name, sourceLang).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] POST /api/folders error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** PATCH /api/folders — update folder, re-translate on name change */
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isManager())) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: manager role required' },
        { status: 403 }
      );
    }

    const { id, sourceLang, ...updates } = await request.json();
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    const sql = getSQL();

    if (updates.name !== undefined) {
      // Only re-translate if the name actually changed
      const existing = await sql`SELECT name FROM folders WHERE id = ${id}`;
      const oldName = existing[0]?.name;
      await sql`UPDATE folders SET name = ${updates.name} WHERE id = ${id}`;
      if (oldName && oldName !== updates.name) {
        // Re-translate on name change
        translateAndSave(sql, 'folder', id, updates.name, sourceLang).catch(() => {});
      }
    }
    if (updates.color !== undefined) await sql`UPDATE folders SET color = ${updates.color} WHERE id = ${id}`;
    if (updates.icon !== undefined) await sql`UPDATE folders SET icon = ${updates.icon} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] PATCH /api/folders error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** DELETE /api/folders?id=xxx — delete folder, unlink items, and clean up translations */
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
    const type = searchParams.get('type');
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

    const sql = getSQL();

    // Unlink items from this folder
    if (type === 'recipe') {
      await sql`UPDATE recipes SET folder_id = NULL WHERE folder_id = ${id}`;
    } else if (type === 'dish') {
      await sql`UPDATE dishes SET folder_id = NULL WHERE folder_id = ${id}`;
    }

    // Clean up translations for this folder
    await sql`DELETE FROM translations WHERE entity_type = 'folder' AND entity_id = ${id}`;

    await sql`DELETE FROM folders WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Wibox API] DELETE /api/folders error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
