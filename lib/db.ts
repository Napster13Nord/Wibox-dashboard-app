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
      hidden_costs     NUMERIC(10,2) DEFAULT 0,
      folder_id        TEXT,
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at       TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id              TEXT PRIMARY KEY,
      recipe_id       TEXT NOT NULL,
      ingredient_id   TEXT NOT NULL,
      quantity_grams  NUMERIC(10,2) NOT NULL DEFAULT 0
    )
  `;

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
}
