import { neon } from '@neondatabase/serverless';

export function getSQL() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

/**
 * Creates all normalized tables if they don't exist.
 * Safe to call multiple times (idempotent).
 */
export async function ensureTables() {
  const sql = getSQL();

  await sql`
    CREATE TABLE IF NOT EXISTS ingredients (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      price_per_kg NUMERIC(10,4) NOT NULL DEFAULT 0,
      price_type  TEXT NOT NULL DEFAULT 'perKg',
      supplier    TEXT DEFAULT '',
      lemonsoft_id TEXT,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at  TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS folders (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL,
      name       TEXT NOT NULL,
      color      TEXT DEFAULT '#6366f1',
      icon       TEXT DEFAULT '📁',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS recipes (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      yield_percentage NUMERIC(5,2) NOT NULL DEFAULT 100,
      work_time_min    INTEGER NOT NULL DEFAULT 0,
      notes            TEXT,
      folder_id        TEXT,
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at       TIMESTAMPTZ
    )
  `;

  // Migrate existing table
  try {
    await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS notes TEXT`;
    await sql`ALTER TABLE recipes DROP COLUMN IF EXISTS hidden_costs`;
  } catch (err) {
    console.error('Migration error:', err);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id              TEXT PRIMARY KEY,
      recipe_id       TEXT NOT NULL,
      ingredient_id   TEXT NOT NULL,
      quantity_grams  NUMERIC(10,2) NOT NULL DEFAULT 0,
      sort_order      INTEGER NOT NULL DEFAULT 0
    )
  `;

  // Migrate: add sort_order to existing recipe_ingredients tables
  try {
    await sql`ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`;
  } catch (err) {
    // Column already exists or unsupported — safe to ignore
  }

  await sql`
    CREATE TABLE IF NOT EXISTS recipe_presets (
      id                  TEXT PRIMARY KEY,
      recipe_id           TEXT NOT NULL,
      name                TEXT NOT NULL,
      target_weight_grams NUMERIC(10,2) NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS dishes (
      id                 TEXT PRIMARY KEY,
      name               TEXT NOT NULL,
      selling_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
      portions           INTEGER NOT NULL DEFAULT 1,
      price_includes_vat BOOLEAN DEFAULT false,
      vat_rate           NUMERIC(5,2) DEFAULT 14,
      folder_id          TEXT,
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at         TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS dish_recipes (
      id              TEXT PRIMARY KEY,
      dish_id         TEXT NOT NULL,
      recipe_id       TEXT NOT NULL,
      quantity_grams  NUMERIC(10,2) NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS dish_ingredients (
      id              TEXT PRIMARY KEY,
      dish_id         TEXT NOT NULL,
      ingredient_id   TEXT NOT NULL,
      quantity         NUMERIC(10,2) NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS translations (
      entity_type  TEXT NOT NULL,
      entity_id    TEXT NOT NULL,
      lang         TEXT NOT NULL,
      name         TEXT NOT NULL,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (entity_type, entity_id, lang)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sync_log (
      id          SERIAL PRIMARY KEY,
      source      TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id   TEXT NOT NULL,
      action      TEXT NOT NULL,
      payload     JSONB,
      synced_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // ── Label printing: product label data (imported from WI-BOX_KANTA.xls) ──
  await sql`
    CREATE TABLE IF NOT EXISTS product_labels (
      id               TEXT PRIMARY KEY,
      dish_id          TEXT,                       -- optional link to a Wibox dish
      tuotenro         TEXT,                       -- TUOTENRO (product number)
      ean_code         TEXT,                       -- EAN-KOODI
      name_sv          TEXT NOT NULL DEFAULT '',   -- NIMI S
      name_fi          TEXT NOT NULL DEFAULT '',   -- NIMI FI
      weight           TEXT DEFAULT '',            -- PAINO (free text, e.g. "560 g")
      ingredients_sv   TEXT DEFAULT '',            -- SELOSTE S
      ingredients_fi   TEXT DEFAULT '',            -- SELOSTE FI
      ingredients_sv_2 TEXT DEFAULT '',            -- SELOSTE S_1 (continuation)
      ingredients_fi_2 TEXT DEFAULT '',            -- SELOSTE FI_1 (continuation)
      best_before_days INTEGER,                    -- PARASTA ENNEN (shelf life in days)
      extra_line       TEXT DEFAULT '',            -- Extra2: storage temp / allergen warning
      energy           TEXT DEFAULT '',            -- Energia
      fat              TEXT DEFAULT '',            -- Rasva
      fat_saturated    TEXT DEFAULT '',            -- RasvaTyydyt
      carbs            TEXT DEFAULT '',            -- Hiilihydraatti
      sugar            TEXT DEFAULT '',            -- Sokeri
      protein          TEXT DEFAULT '',            -- Proteiini
      salt             TEXT DEFAULT '',            -- Suola
      fiber            TEXT DEFAULT '',            -- Ravintokuitu
      notes            TEXT DEFAULT '',            -- col A: free note / status tag
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at       TIMESTAMPTZ
    )
  `;

  // ── Label printing: print queue consumed by the local agent ──
  // The bakery uses a single fixed label printer; the printer is
  // configured on the local agent, not stored per job.
  await sql`
    CREATE TABLE IF NOT EXISTS print_queue (
      id           SERIAL PRIMARY KEY,
      label_id     TEXT NOT NULL,                  -- references product_labels.id
      copies       INTEGER NOT NULL DEFAULT 1,
      status       TEXT NOT NULL DEFAULT 'pending',-- pending | printing | printed | error
      error_msg    TEXT,
      requested_by TEXT DEFAULT '',                -- Clerk user id
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      printed_at   TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_print_queue_status ON print_queue (status)`;
}
