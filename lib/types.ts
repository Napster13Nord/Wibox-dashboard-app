export type TranslationMap = {
  en?: string;
  sv?: string;
  fi?: string;
};

export type Ingredient = {
  id: string;
  name: string;
  pricePerKg: number;
  priceType: 'perKg' | 'perUnit';
  supplier?: string;          // supplier company name (e.g. "Arla")
  supplierProduct?: string;   // exact purchasing product line (e.g. "Arla Sininen Maitojuoma 1L LF") — shown only in the ingredient list, never in recipes/scale
  lastUpdate?: string; // ISO date string
  lemonsoftId?: string; // Lemonsoft ERP article ID (for API sync)
  translations?: TranslationMap;
};

export type RecipeIngredient = {
  id: string;
  ingredientId: string;
  quantityInGrams: number;
};

export type RecipePreset = {
  id: string;
  name: string;            // e.g. "18cm Cake", "Individual Portion (55g)"
  targetWeightGrams: number;
};

export type Recipe = {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  yieldPercentage: number;
  workTimeMinutes: number;
  presets: RecipePreset[];
  folder?: string;         // folder id for organising recipes
  notes?: string;          // notes / instructions
  translations?: TranslationMap;
};

export type DishRecipe = {
  id: string;
  recipeId: string;
  quantityInGrams: number;
};

export type DishIngredient = {
  id: string;
  ingredientId: string;
  quantity: number;
};

export type Dish = {
  id: string;
  name: string;
  recipes: DishRecipe[];
  directIngredients: DishIngredient[];
  sellingPrice: number;
  portions: number;
  priceIncludesVat: boolean;
  folder?: string;         // folder id for organising dishes
  vatRate?: number;        // custom VAT rate, defaults to 13.5 if unset
  translations?: TranslationMap;
};

// ── Folder type (shared by Recipes & Dishes) ──
export type Folder = {
  id: string;
  name: string;
  color: string;   // hex or tailwind-compatible color
  icon: string;    // emoji or icon name
  translations?: TranslationMap;
};

// ── Label printing ──
export type ProductLabel = {
  id: string;
  dishId?: string;           // optional link to a Wibox dish
  tuotenro?: string;         // product number
  eanCode?: string;          // EAN barcode
  nameSv: string;
  nameFi: string;
  weight?: string;           // free text, e.g. "560 g"
  ingredientsSv?: string;
  ingredientsFi?: string;
  ingredientsSv2?: string;   // continuation line
  ingredientsFi2?: string;
  bestBeforeDays?: number;   // shelf life in days
  extraLine?: string;        // storage temp / allergen warning
  energy?: string;
  fat?: string;
  fatSaturated?: string;
  carbs?: string;
  sugar?: string;
  protein?: string;
  salt?: string;
  fiber?: string;
  notes?: string;
  updatedAt?: string;
};

export type PrintJobStatus = 'pending' | 'printing' | 'printed' | 'error';

export type PrintJob = {
  id: number;
  labelId: string;
  copies: number;
  status: PrintJobStatus;
  errorMsg?: string;
  requestedBy?: string;
  createdAt?: string;
  printedAt?: string;
};

// ── Trash system ──
export type TrashedItem = {
  id: string;
  originalType: 'ingredient' | 'recipe' | 'dish';
  data: Ingredient | Recipe | Dish;
  deletedAt: string; // ISO date string
};
