/**
 * Default VAT rate (%) applied to a dish when none is explicitly set.
 *
 * Single source of truth — used by the UI, the API routes and the DB seed
 * fallbacks. NOTE: the `vat_rate` column DEFAULT in lib/db.ts must be kept in
 * sync with this value manually (a DDL DEFAULT clause can't import a constant).
 *
 * If the bakery's correct rate is the Finnish food VAT (14%), change it here.
 */
export const DEFAULT_VAT_RATE = 13.5;
