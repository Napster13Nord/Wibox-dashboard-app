<div align="center">
  <h1>🍞 Wibox Dashboard</h1>
  <p><strong>Professional Kitchen Management & Recipe Costing System</strong></p>
  <p>Track ingredients, build recipes, calculate margins, and streamline kitchen operations — built for multi-user bakery & restaurant environments.</p>

  <br/>

  ![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
  ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
  ![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
</div>

---

## 🚀 Overview

**Wibox** is a custom-built solution for managing the complex ecosystem of bakery & restaurant inventory, recipe costing, and kitchen workflows. Instead of error-prone spreadsheets, Wibox provides an interactive, real-time interface to define a master price list, structure recipes with yields and hidden costs, and compile them into fully calculated dishes with targeted margins and adjustable VAT settings.

Built for **production use** with normalized PostgreSQL tables, multi-user support (manager + kitchen roles), and a prepared integration path with the **Lemonsoft ERP** system.

---

## ✨ Core Features

### 🥕 Master Price List (Ingredients)
- **Live Updating** — centralized ingredients with dynamic pricing per Kg or per Unit
- **Search & Sort** — fully searchable with real-time sorting by name, supplier, and date
- **Global Cascade** — any price change propagates instantly across all connected recipes and dishes
- **Lemonsoft-ready** — each ingredient supports a `lemonsoftId` for ERP article mapping

### 👨‍🍳 Recipe Management
- **Dynamic Costing** — tracks raw ingredient costs plus structural "Hidden Costs" (electricity, labor, packaging)
- **Workflow Tools** — work time, yield %, and kitchen presets (e.g. "18cm Cake", "Individual Roll 60g")
- **Folder Organization** — custom folders with icons and color palettes
- **Full-Screen Editor** — interactive modals with autocomplete ingredient search

### 🍽️ Dish Building & Margin Tracking
- **Complex Hierarchies** — combine multiple recipe components with direct ingredients
- **Margin Calculator** — real-time food cost %, profit margin %, and target-margin simulator
- **VAT Management** — inline breakdown with customizable VAT rates per dish
- **Visual Intelligence** — automated color-coding: green = profitable, red = below threshold

### ⚖️ Kitchen Scale
- **Recipe Scaling** — select a recipe and preset, get exact scaled ingredient quantities
- **Production Ready** — designed for tablet use in the kitchen

### 🛡️ Data Safety & Multi-User
- **Soft Delete** — trashed items can be restored from the Trash View
- **Undo Stack** — revert changes with sidebar button or `Ctrl+Z` (up to 20 levels)
- **Multi-User Safe** — normalized database with granular API calls prevents race conditions
- **Backup** — export/import full JSON backups from the sidebar

---

## 🏗️ Architecture

### Database (Normalized PostgreSQL via Neon)

```
┌─────────────────┐     ┌───────────────────────┐     ┌──────────────────┐
│   ingredients    │     │   recipe_ingredients   │     │     recipes      │
│─────────────────│     │───────────────────────│     │──────────────────│
│ id, name, price │◄────│ recipe_id, ingredient_ │────►│ id, name, yield  │
│ supplier, type  │     │ id, quantity_grams     │     │ work_time, costs │
│ lemonsoft_id    │     └───────────────────────┘     │ folder           │
└─────────────────┘                                    └──────────────────┘
        │                ┌───────────────────────┐              │
        │                │    recipe_presets      │              │
        │                │───────────────────────│              │
        │                │ recipe_id, name,      │◄─────────────┘
        │                │ target_weight_grams   │
        │                └───────────────────────┘
        │
        │                ┌───────────────────────┐     ┌──────────────────┐
        │                │   dish_ingredients     │     │     dishes       │
        └───────────────►│ dish_id, ingredient_id │────►│ id, name, price  │
                         │ quantity               │     │ portions, vat    │
                         └───────────────────────┘     │ folder           │
                         ┌───────────────────────┐     └──────────────────┘
                         │    dish_recipes        │              │
                         │───────────────────────│              │
                         │ dish_id, recipe_id,   │◄─────────────┘
                         │ quantity_grams         │
                         └───────────────────────┘

                         ┌───────────────────────┐
                         │     folders            │
                         │───────────────────────│
                         │ id, type, name,       │
                         │ color, icon            │
                         └───────────────────────┘

                         ┌───────────────────────┐
                         │     sync_log           │
                         │───────────────────────│
                         │ source, direction,    │
                         │ items_synced, status  │
                         └───────────────────────┘
```

### API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/state` | `GET`, `POST` | Full state read / undo sync |
| `/api/ingredients` | `GET`, `POST`, `PATCH`, `DELETE` | Ingredients CRUD |
| `/api/recipes` | `GET`, `POST`, `PUT`, `DELETE` | Recipes CRUD (with nested data) |
| `/api/dishes` | `GET`, `POST`, `PUT`, `DELETE` | Dishes CRUD (with nested data) |
| `/api/folders` | `GET`, `POST`, `DELETE` | Folder management |
| `/api/trash` | `GET`, `POST`, `DELETE` | Trash restore & permanent delete |
| `/api/backup` | `GET`, `POST` | JSON export/import |
| `/api/lemonsoft` | `GET`, `POST` | Price list & ERP sync (placeholder) |
| `/api/db/migrate` | `POST` | One-time blob→tables migration |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) |
| Database | [Neon PostgreSQL](https://neon.tech/) (serverless) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Language | TypeScript 5 (strict) |

---

## ⚙️ Running Locally

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)

### Installation

```bash
# Clone
git clone https://github.com/Napster13Nord/Wibox-dashboard-app.git
cd Wibox-dashboard-app

# Install
npm install

# Configure environment
cp .env.example .env
# Add your DATABASE_URL to .env

# Start dev server
npm run dev
```

Open `http://localhost:3000` in your browser.

### First-Time Setup

After starting the app, run the database migration once:

```bash
curl -X POST http://localhost:3000/api/db/migrate
```

This creates all normalized tables and migrates any existing legacy data.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `LEMONSOFT_API_URL` | ❌ | Lemonsoft ERP API base URL (future) |
| `LEMONSOFT_API_KEY` | ❌ | Lemonsoft API authentication key (future) |

---

## 📁 Repository Structure

```
├── app/
│   ├── api/
│   │   ├── backup/route.ts        # JSON export/import
│   │   ├── data/route.ts          # Legacy blob API (backward compat)
│   │   ├── db/migrate/route.ts    # One-time migration endpoint
│   │   ├── dishes/route.ts        # Dishes CRUD
│   │   ├── folders/route.ts       # Folders CRUD
│   │   ├── ingredients/route.ts   # Ingredients CRUD
│   │   ├── lemonsoft/route.ts     # ERP price list & sync
│   │   ├── recipes/route.ts       # Recipes CRUD
│   │   ├── state/route.ts         # Full state assembly
│   │   └── trash/route.ts         # Trash management
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Dashboard entrypoint
├── components/
│   ├── ConfirmDialog.tsx           # Reusable confirmation modal
│   ├── DashboardView.tsx           # Overview analytics
│   ├── DishesView.tsx              # Dish builder & margins
│   ├── IngredientCombobox.tsx      # Autocomplete search input
│   ├── IngredientsView.tsx         # Master price list
│   ├── KitchenView.tsx             # Kitchen scale & presets
│   ├── RecipesView.tsx             # Recipe builder
│   ├── Sidebar.tsx                 # Navigation (responsive)
│   └── TrashView.tsx               # Soft-delete recovery
├── lib/
│   ├── calculations.ts            # Cost, yield, VAT math
│   ├── context.tsx                # Global state + granular API sync
│   ├── db.ts                      # DB connection + table schemas
│   └── types.ts                   # TypeScript interfaces
└── public/
    └── assets/                    # Logo and static assets
```

---

## 🗺️ Roadmap

### ✅ Completed
- [x] Master Price List with search, sort, supplier tracking
- [x] Recipe builder with yield %, hidden costs, kitchen presets
- [x] Dish builder with margin calculator, VAT management
- [x] Kitchen Scale for production scaling
- [x] Undo/redo system (20 levels)
- [x] Soft-delete trash system with recovery
- [x] JSON backup export/import
- [x] **Database normalization** — migrated from JSONB blob to 9 normalized PostgreSQL tables
- [x] **Multi-user safe** — granular API calls, no more full-state race conditions
- [x] **Lemonsoft endpoint** — `GET /api/lemonsoft` returns price list in ERP format
- [x] **Responsive mobile layout** — hamburger menu, horizontal scroll tables

### 🔜 Next Up
- [ ] **🌍 Internationalization (i18n)** — full translation support for 3 languages:
  - 🇬🇧 English (current)
  - 🇸🇪 Swedish (Svenska)
  - 🇫🇮 Finnish (Suomi)
- [ ] **🔗 Lemonsoft ERP Integration** — automated price sync when API credentials are provided
- [ ] **👥 Role-Based Access** — Manager (full edit) vs Kitchen (read-only) views
- [ ] **📊 Dashboard Analytics** — cost trends, margin history, top-performing dishes
- [ ] **📱 PWA Support** — installable app for kitchen tablets
- [ ] **🔔 Price Alert System** — notifications when ingredient prices change significantly

---

## 🔌 Lemonsoft Integration (Prepared)

The system is pre-wired for integration with **Lemonsoft ERP** (Finland):

- `GET /api/lemonsoft` — returns the full ingredient price list in ERP-compatible format
- `POST /api/lemonsoft` — placeholder endpoint ready for price import automation
- Each ingredient has a `lemonsoftId` field for article mapping

**To activate** (when credentials are available):
1. Add `LEMONSOFT_API_URL` and `LEMONSOFT_API_KEY` to `.env`
2. Uncomment the sync logic in `/app/api/lemonsoft/route.ts`
3. Map ingredients to Lemonsoft article IDs

---

## 📄 License

Private project — all rights reserved.

---

<div align="center">
  <i>Built for professional kitchen operations — efficiency, clarity, and precision.</i>
  <br/><br/>
  <strong>Wibox</strong> · Made with ☕ in Finland
</div>
