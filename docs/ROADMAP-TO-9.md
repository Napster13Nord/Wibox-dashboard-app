# Wibox Dashboard — Roadmap to "9/10" (Handoff for a fresh Claude Code session)

> **Read this whole file before touching code.** It is self-contained: it assumes
> you have **no prior context** on this project. The goal is to take the codebase
> from a solid **7/10** to a **9/10 without breaking anything**.
>
> **Golden rule:** every change must keep the app behaving the same for the user
> unless an item explicitly says otherwise. Small, reviewable, committed steps —
> never a big-bang rewrite.

---

## 0. How to use this document

- Work **top to bottom by phase**. Phases are ordered so each one makes the next safer.
- Do **one item at a time**. After each item: run the [Verification ritual](#3-verification-ritual-run-after-every-item), then commit with a clear message.
- If an item turns out bigger or riskier than described, **stop and report** instead of pushing through.
- Tick items off by editing this file's checkboxes as you complete them (and commit that too).

---

## 1. Project overview

**What it is:** "Wibox" — a recipe-costing & production dashboard for a Nordic bakery.
Managers build **Ingredients → Recipes → Dishes**, see live cost / food-cost % / margin / VAT,
print **product labels** (EAN + nutrition, SV/FI), and kitchen staff use a **Kitchen Scale**
view to scale recipes by target weight. Everything is **trilingual (EN / SV / FI)** with
auto-translation.

**Users / roles:**
- **Manager** — full app (all tabs). Gated by Clerk role check.
- **Kitchen** — only the Kitchen Scale view.

**Stack (all current, modern — do not "upgrade" anything as part of this work):**
- Next.js **15.4** (App Router) · React **19** · TypeScript **5.9**
- Tailwind CSS **4** · lucide-react icons · `motion` (framer-motion)
- **Neon Postgres** via `@neondatabase/serverless` **1.1** (HTTP driver)
- **Clerk** auth (`@clerk/nextjs` 7)
- **DeepL** (`deepl-node`) + Google GenAI for translation
- Host target: `output: 'standalone'`

**Build gates (important):** `next.config.ts` sets `eslint.ignoreDuringBuilds: true`
(lint does **not** fail the build) and `typescript.ignoreBuildErrors: false`
(**tsc DOES fail the build**). So: **`tsc --noEmit` is the hard gate.** Keep it green.

**Environment:** Windows + PowerShell. Git default branch is `main`. Local dev may not
have `DATABASE_URL`/Clerk keys — don't assume you can run a full `next build` against the
DB; rely on `tsc` + targeted lint + reading code. (`npx tsc --noEmit` needs no env.)

---

## 2. Repo map (the files you'll touch most)

```
app/
  page.tsx                 # tab router (manager vs kitchen); renders <SyncStatusBanner/>
  layout.tsx               # Clerk + I18nProvider + AppProvider wrappers
  api/
    state/route.ts         # GET = assemble whole state from tables; POST = ATOMIC full sync
    recipes|dishes|ingredients|folders/route.ts   # granular POST/PATCH/DELETE writes only
    labels/route.ts, translate/route.ts, trash/route.ts, backup/route.ts,
    db/migrate/route.ts, lemonsoft/route.ts, set-role/route.ts, data/route.ts (legacy)
lib/
  context.tsx              # AppProvider: ALL client state + optimistic writes + undo + sync status
  calculations.ts          # PURE domain math: cost/weight/dish cost/metrics  ← test target #1
  fuzzySearch.ts           # multilingual fuzzy search  ← test target #2
  db.ts                    # getSQL() + ensureTables() (DDL)
  types.ts                 # Ingredient/Recipe/Dish/Folder/ProductLabel/TrashedItem + TranslationMap
  i18n.tsx                 # I18nProvider/useI18n; dictionaries from locales/{en,sv,fi}.ts
  utils.ts                 # cn(), newId()  (crypto.randomUUID)
  constants.ts             # DEFAULT_VAT_RATE
  folders.ts               # FOLDER_COLORS / FOLDER_ICONS (shared palette)
  translate.ts             # translateName/translateAndSave/saveTranslations
hooks/
  useTranslatedName.ts     # resolves entity name in active locale
  useRole.ts               # Clerk manager check
components/
  RecipesView.tsx (~1.1k lines)   DishesView.tsx (~1.6k lines)   KitchenView.tsx (~800)
  IngredientsView.tsx  ReportsView.tsx  LabelsView.tsx  TrashView.tsx  DashboardView.tsx
  EntityCombobox.tsx (generic) + IngredientCombobox/RecipeCombobox (thin wrappers)
  FolderDialog.tsx (shared)  ConfirmDialog.tsx  TranslationEditor.tsx
  RecipeDetailModal.tsx  LabelDetailModal.tsx  SyncStatusBanner.tsx  Sidebar.tsx
locales/  en.ts  sv.ts  fi.ts   # keep all three in sync when adding keys
```

**Data flow (how persistence works — understand before changing it):**
1. On mount, `AppProvider` loads state: `GET /api/state` → fallback `GET /api/data` → fallback `localStorage`.
2. Every mutation goes through `doUpdate(updater, apiAction)` in `context.tsx`:
   optimistic local `setState` → save to `localStorage` → fire the granular API write.
3. The granular write promise is **tracked**; on failure `syncError` flips and the
   red `<SyncStatusBanner/>` offers **Retry** (which re-pushes the whole local state via
   the atomic `POST /api/state`).
4. `undo` pops history, sets state, and re-pushes the full state atomically.

---

## 3. Verification ritual (run after EVERY item)

```powershell
npx tsc --noEmit                 # MUST be clean — this is the build gate
npx eslint .                     # should not introduce NEW errors (warnings tolerated)
npx vitest run                   # once tests exist (Phase 1) — MUST stay green
```

Then, for anything touching UI/behavior, do a **manual smoke check** of the affected flow
(create/edit a recipe & dish, switch folders, search, kitchen-scale, print). If a `run`/`verify`
skill is available, use it to launch the app and eyeball the change.

**Commit discipline:** one logical item per commit. End every commit message with:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

Do **not** push without the user asking; do **not** amend shared history.

---

## 4. What was JUST done (do not redo — context only)

Recent hardening already shipped on `main` (most recent first):
- `cab34de` use `calculateDishMetrics` in DishModal; round Work Time to integer
- `cf2cf6b` shared `FolderDialog` + `lib/folders.ts` palette
- `fdfa804` generic `EntityCombobox` (Ingredient/Recipe combobox unified)
- `46a0187` removed dead GET handlers + orphaned `loadTranslations`
- `8944564` single `DEFAULT_VAT_RATE` (was split 13.5 vs 14)
- `6b05eb5` collision-resistant ids via `newId()`/`crypto.randomUUID()`
- `78da187` atomic full-state sync (single `sql.transaction`)
- `90c07f1` surface failed server writes via `SyncStatusBanner` + retry

**Current score ≈ 7/10.** Stack and domain fit are strong; the gaps holding it back are
**no tests**, **`any` at the boundaries**, **triplicated UI**, **giant components**, and a
**fragile dual source of truth**. This roadmap closes those.

---

## 5. The plan to reach 9/10

> Rationale for ordering: **build the safety net first (tests)**, then make the type system
> protect you (kill `any`), then do the structural refactors (dedup, split) under that net,
> then the architecture, then polish. Each phase de-risks the next.

### Phase 1 — Test foundation  ⭐ highest leverage (raises score the most)

There are **zero** automated tests. For an app that computes price/cost/VAT this is the #1 risk.

- [x] **1.1 Add Vitest.** Install dev deps and a config.
  ```powershell
  npm i -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
  ```
  Add `vitest.config.ts` (jsdom env, path alias `@` → repo root) and scripts to `package.json`:
  `"test": "vitest"`, `"test:run": "vitest run"`, `"coverage": "vitest run --coverage"`.
  Make sure `@` alias matches `tsconfig.json` `paths`.
- [x] **1.2 Unit-test `lib/calculations.ts`** (pure, high value): `calculateRecipeCost`
  (perKg vs perUnit pricing), `calculateRecipeWeight` (yield %), `calculateDishCost`
  (recipe components cost-per-gram + direct ingredients), `calculateDishMetrics`
  (cost/portion, food-cost %, margin; portions=0 guard). Cover edge cases: missing
  ingredient/recipe ids, zero weight, empty arrays.
- [x] **1.3 Unit-test `lib/fuzzySearch.ts`**: diacritic folding (`Glögg`↔`glogg`),
  cross-language match (search EN finds SV/FI), multi-word AND, subsequence typo tolerance,
  ranking order, empty query returns all.
- [x] **1.4 (optional, if smooth) Component test** of `EntityCombobox` with
  `@testing-library/react`: select → onChange fires; parent clears `value` → input clears.
- **Acceptance:** `vitest run` green; calculations + fuzzySearch at high coverage.
- **Risk:** none (additive). **This phase alone is ~+0.5.**

### Phase 2 — Kill `any` at the boundaries (type safety)

Types exist in `lib/types.ts` but are bypassed exactly where bugs hide.

- [ ] **2.1 DB row mappers.** In `app/api/state/route.ts` (and any remaining route) the
  `rows.map((r: any) => …)` lose all safety. Introduce small **row types** (snake_case
  shape returned by Neon) and typed mapper functions `rowToIngredient`, `rowToRecipe`,
  `rowToDish`, `rowToFolder`. Keep runtime behavior identical (still `Number(...)` coercions).
- [ ] **2.2 Modal props.** `DishModal`/`DishRecipesEditor`/`DishIngredientsEditor` in
  `DishesView.tsx` use `initialData?: any`, `recipes: any[]`, `onSave: (dish: any)`.
  Replace with `Dish`, `Recipe[]`, `Ingredient[]`, and a proper `onSave` payload type.
  Do the same for `RecipeModal` in `RecipesView.tsx`.
- **Acceptance:** `tsc` green; no new `any` introduced; behavior unchanged.
- **Risk:** low–medium (tsc will surface mismatches — fix them, don't `as any` around them).
  Do it **incrementally**, one mapper / one modal per commit.

### Phase 3 — De-duplicate the triplicated UI (the big structural win)

The folder-grid + folder-tabs + entity-card list is copy-pasted across **RecipesView**,
**DishesView**, **KitchenView** (~300 similar lines each), and the print block is duplicated.
This is the largest remaining "AI-slop" surface. **Do this carefully — it touches all three
main screens, so verify each visually.**

- [ ] **3.1 Extract `<FolderGrid>`** (the Step-0 landing grid of folder cards + "All" +
  "Uncategorized" + "New folder" card). Props: folders, counts, color/icon, onPick, onEdit,
  onDelete, labels. Use in all three views. Note KitchenView hides empty folders and has no
  edit/delete — support via props/flags.
- [ ] **3.2 Extract `<FolderTabs>`** (the in-folder tab row). Same idea.
- [ ] **3.3 Extract `<PrintableRecipe>`** — the `print-only` summary+ingredients+presets+notes
  block duplicated in `RecipesView.tsx` and `KitchenView.tsx`.
- **Acceptance:** all three screens look and behave **identically** to before; `tsc`+tests green;
  manual smoke on Recipes, Dishes, Kitchen (folder nav, search, cards, print preview).
- **Risk:** medium (shared UI). One component per commit; screenshot/compare before & after.

### Phase 4 — Split the giant components

`DishesView.tsx` (~1.6k) and `RecipesView.tsx` (~1.1k) mix modal, editors, dialogs and the
main view in one file.

- [ ] **4.1** Move `DishModal` + `DishRecipesEditor` + `DishIngredientsEditor` + `VatRow` +
  `MarginCalculator` into their own files under `components/dishes/`.
- [ ] **4.2** Move `RecipeModal` into `components/recipes/`.
- **Acceptance:** pure file moves + imports; `tsc`+tests green; zero behavior change.
- **Risk:** low (mechanical), but do it after Phase 2 so types travel with the code.

### Phase 5 — Firm up the architecture (state / persistence / undo)

Today there are two sources of truth (localStorage + Postgres) reconciled by hand. The
write-failure path is now visible (banner) and the full sync is atomic, but divergence can
still happen silently between writes. **Improve, do not rewrite.**

- [ ] **5.1 Heal-on-reconnect/focus.** In `AppProvider`, refetch `GET /api/state` when the
  window regains focus or the network comes back online (`visibilitychange` / `online`
  events), and reconcile — so a missed write self-corrects. Guard against clobbering
  in-flight local edits.
- [ ] **5.2 De-duplicate translation work.** Creating an entity currently translates **twice**:
  the granular `POST` route calls `translateAndSave` **and** the client calls
  `PUT /api/translate` (`autoTranslateEntity` in `context.tsx`). Pick one path (recommend
  keeping the server-side one and dropping the client PUT, or vice-versa) and remove the other.
- [ ] **5.3 (optional) Redo** to complement undo, if cheap.
- **Acceptance:** no regression in save/undo; translations still populate; `tsc`+tests green.
- **Risk:** medium — test the offline→online and failed-write→retry flows by hand.

### Phase 6 — Polish

- [ ] **6.1 Move DDL out of the read path.** `ensureTables()` (DDL + `ALTER`) runs on every
  `GET /api/state` (`app/api/state/route.ts`). Make it run once (idempotent guard / a dedicated
  migrate route) instead of per-read. Don't break first-boot table creation.
- [ ] **6.2 Remove stray `console.log`** from production paths (e.g. `context.tsx`
  translation OK log, `state/route.ts`). Keep `console.error` for real failures.
- [ ] **6.3 `work_time_min`**: already rounded in the UI (commit `cab34de`); confirm the
  column type and any report display matches integer minutes.
- [ ] **6.4 Sweep remaining `any`** found during Phase 2 (routes like `dishes`, `ingredients`,
  `folders`, `labels`, `backup`, `db/migrate`).

---

## 6. Definition of done (scoring rubric to hit 9)

| Area | Now | Target 9 | Closed by |
|------|-----|----------|-----------|
| Tests | 2 | 8 | Phase 1 |
| TypeScript | 6 | 8.5 | Phase 2, 6.4 |
| Code quality / dedup | 6.5 | 8.5 | Phase 3, 4 |
| Architecture / state | 6.5 | 8 | Phase 5 |
| DB hygiene | 7.5 | 8.5 | Phase 6.1 |
| Stack / domain / UX | 8.5–9 | keep | — (already strong) |

**You are "done to 9" when:** Vitest suite is green and meaningful (calculations + search +
at least one component), there are no `any` in route mappers or modal props, the folder
grid/tabs/print blocks exist once, the two big views are split into modules, state self-heals
on reconnect, and `tsc`/`eslint`/`vitest` all pass.

---

## 7. Landmines / gotchas (read these — they will bite you)

- **Neon HTTP transactions are non-interactive.** `sql.transaction([q1, q2, …])` runs an array
  of queries with **no reads between writes**. The full-sync in `state/route.ts` relies on this.
  Don't `await` the individual `sql\`…\`` queries you intend to batch — push them unawaited.
- **`ensureTables()` uses `CREATE TABLE IF NOT EXISTS`** — changing a column `DEFAULT` in
  `db.ts` does **not** alter an existing table. `DEFAULT_VAT_RATE` is the runtime source of
  truth; the DDL default is cosmetic (see comment in `lib/db.ts`).
- **Keep all three locale files in sync.** Adding a key to `locales/en.ts` without `sv.ts`/`fi.ts`
  will `tsc`-fail (the `Translations` type is `typeof en`).
- **Components without `"use client"` that use hooks** are fine here because they're only
  imported by client components (the directive is inherited). `EntityCombobox`/`FolderDialog`
  follow this pattern intentionally.
- **`number` inputs + locale:** use `toFixed`, not `toLocaleString`, for values bound to
  `type="number"` (PT/SV locales use commas which number inputs reject). See the note in
  `KitchenView.tsx`.
- **Git/Windows:** you'll see `LF will be replaced by CRLF` warnings — harmless.
- **Don't run destructive SQL locally** assuming a DB is attached; `POST /api/state` wipes &
  re-seeds (atomically). Treat it as production-affecting.
- **`as any` is not a fix.** If `tsc` complains during Phase 2, model the type correctly.

---

## 8. Suggested commit sequence

```
test: add vitest + unit tests for calculations
test: add unit tests for fuzzySearch
refactor(types): type DB row mappers in /api/state
refactor(types): type RecipeModal/DishModal props
refactor(ui): extract shared FolderGrid
refactor(ui): extract shared FolderTabs
refactor(ui): extract PrintableRecipe
refactor(dishes): split DishModal/editors into components/dishes/*
refactor(recipes): split RecipeModal into components/recipes/*
feat(sync): reconcile state on focus/reconnect
refactor(translate): drop duplicate client-side auto-translate
refactor(db): run ensureTables once instead of per-read
chore: remove stray console.log in production paths
```

Each line = one commit, each preceded by a green [Verification ritual](#3-verification-ritual-run-after-every-item).

---

*Prepared at score ≈7/10. Execute top-down, keep `tsc` green, commit small, verify each step,
and stop-and-ask if anything fights back. Target: 9/10, nothing broken.*
