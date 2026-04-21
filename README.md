<div align="center">
  <h1>Wibox Dashboard & Recipe Automation System</h1>
  <p>A comprehensive kitchen management application for tracking ingredients, building dynamic recipes, calculating margins for dishes, and streamlining kitchen operations.</p>
</div>

---

## 🚀 Overview

The **Wibox Dashboard** is a custom-built solution to handle the complex ecosystem of restaurant and bakery inventory, catering costs, and kitchen workflows. Rather than manual spreadsheets, Wibox provides an interactive, state-of-the-art interface to define a master price list, structure recipes with yields and hidden costs, and compile them into fully calculated dishes with targeted margins and adjustable VAT settings. 

Built with safety in mind, it includes full undo support, soft-deletion handling, and data backup mechanisms.

## ✨ Core Features

### 🥕 Master Price List (Ingredients)
- **Live Updating**: Centralized ingredients list with dynamic pricing per Kg (`€/kg`) or per Unit (`€/unit`).
- **Search & Sort**: Fully searchable tables and real-time sorting by name, supplier, and update dates.
- **Global Impact**: Any price adjustment cascades instantly across all connected recipes and dishes.

### 👨‍🍳 Recipe Management
- **Dynamic Costing**: Tracks raw ingredient costs alongside structural "Hidden Costs" (electricity, labor, packaging).
- **Workflow Tools**: Integrates **Work Time (minutes)**, **Yield %**, and **Kitchen Presets** (e.g., standardizing sizes like "18cm Cake" or "Individual Portion").
- **Folder Organization**: Custom user-defined folders with icons and color palettes to group recipes easily.
- **Advanced UX**: Interactive, full-screen editing modals featuring autocomplete searchable ingredient comboboxes.

### 🍽️ Dish Building & Margin Tracking
- **Complex Hierarchies**: Compile final dishes using multiple "Recipe Components" combined with "Direct Ingredients".
- **Margin Calculator**: See real-time "Food Cost %" and "Profit Margin %". It includes a live calculator to simulate selling prices based on a target margin (e.g., Target 70% Margin).
- **Tax Management**: Compact inline breakdown showing prices excluding and including VAT, with customizable VAT rates per dish (default 13.5%).
- **Visual Intelligence**: Automated color-coding indicates whether a dish is highly profitable (green) or falling behind threshold margins (red / amber).

### 🛡️ Human Error Safety & Data Persistence
- **Trash & Recovery System**: Deletes are never permanent by default. Trashed ingredients, recipes, and dishes are sent to a "Trash View", where they can be restored seamlessly.
- **Undo Stack**: Accidentally changed a yield or price? Use the sidebar "Undo" button or press `Ctrl + Z` to revert back (up to 20 levels of history).
- **Fail-Safe Data**: Operates seamlessly across local client caching (`localStorage`) and API-driven JSON file syncing. You can also export or import `.json` database backups right from the sidebar.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Types**: Thoroughly typed utilizing modern **TypeScript** patterns.

---

## ⚙️ Running Locally

### Prerequisites

Make sure you have Node.js installed on your machine.

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/Napster13Nord/Wibox-dashboard-app.git
   cd Wibox-dashboard-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

### Application Data

Data is persisted in two places to prevent data loss:
1. Locally in the browser via `localStorage` (key: `wibox-data`).
2. Server-side via a background API POST to `data/wibox-data.json`. 

You can backup and download your entire database anytime from the bottom section of the application sidebar.

---

## 📁 Repository Structure

```
├── app/
│   ├── api/data/route.ts       # Backend persistence API
│   ├── layout.tsx              # Main Next.js layout configuration
│   └── page.tsx                # Dashboard routing entrypoint
├── components/
│   ├── ConfirmDialog.tsx       # Reusable safe-action modal
│   ├── DashboardView.tsx       # Landing analytics view
│   ├── DishesView.tsx          # Margin & dish constructor interface
│   ├── IngredientCombobox.tsx  # Optimized search combobox form input
│   ├── IngredientsView.tsx     # Master price list component
│   ├── KitchenView.tsx         # Scale implementation & live tracking
│   ├── RecipesView.tsx         # Multi-tiered recipe builder component
│   ├── Sidebar.tsx             # Main navigation & backup interface
│   └── TrashView.tsx           # Soft-delete & item recovery UI
├── lib/
│   ├── calculations.ts         # Math logic for multi-level yield/costs/tax
│   ├── context.tsx             # React Context (State, Undo/Redo, Syncing)
│   └── types.ts                # App-wide TypeScript interfaces
└── data/                       
    └── wibox-data.json         # (Auto-generated) Server-side persistent storage
```

---

<div align="center">
  <i>Designed for efficiency, clarity, and precision in professional kitchen operations.</i>
</div>
