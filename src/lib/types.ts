// TypeScript ports of the Swift models in sous-swift/Models.
// Field names/shapes mirror the Swift Decodable/Encodable structs 1:1 so the
// same wire contract is reused. Decodable models use `| null` for Swift
// optionals; Encodable patch types use optional `?` fields (omitted when unset).

// ── Primitives ──────────────────────────────────────────────────────────────

/** Mirrors Swift's PrismaDecimal (a Prisma.Decimal serialized as {s,e,d}). */
export interface PrismaDecimal {
    s: number
    e: number
    d: number[]
}

/** Swift `enum Rating: Int` — thumbsUp = 1, thumbsDown = -1. */
export type Rating = 1 | -1

// ── Decodable models ────────────────────────────────────────────────────────

/** RecipeTagModel.swift */
export interface RecipeTag {
    id: number
    name: string
    createdAt: string
    updatedAt: string
    householdId: number
    recipes?: Recipe[] | null
    household?: Household | null
}

/** IngredientModel.swift */
export interface Ingredient {
    id: number
    sentence: string
    item: string | null
    size: string | null
    amount: PrismaDecimal | null
    unit: string | null
    preparation: string | null
    /** Doesn't count as missing when it's not in stock (#60). Absent from soupi < 2.7.0. */
    optional?: boolean
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    recipeId: number
}

/** RecipeModel.swift */
export interface Recipe {
    id: number
    name: string
    prepTime: string | null
    cookTime: string | null
    servings: string | null
    instructions: string[] | null
    /** Free-text notes (#43). */
    notes: string | null
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    ingredients: Ingredient[] | null
    tags: RecipeTag[] | null
    household: Household | null
    householdId: number
    source: string | null
    lastMade: string | null
    rating: number
    timesMade: number
}

/** ItemCategoryModel.swift */
export interface ItemCategory {
    id: number
    name: string
    sortOrder: number
    icon: string | null
    isNonFood: boolean
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    pantryItems: PantryItem[] | null
    pantryId: number
    pantry?: Pantry | null
}

/** PantryItemModel.swift */
export interface PantryItem {
    id: number
    name: string
    quantity: string | null
    isInStock: boolean
    /** In stock but running low (only meaningful while isInStock). */
    isLow: boolean
    isFavorite: boolean
    isInShoppingList: boolean
    purchasedAt: string | null
    expiresAt: string | null
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    categoryId: number | null
    category: ItemCategory | null
    pantryId: number
    pantry?: Pantry | null
}

/** PantryModel.swift */
export interface Pantry {
    id: number
    name: string
    isDefault: boolean
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    householdId: number
    household?: Household | null
    pantryItems: PantryItem[]
    itemCategories: ItemCategory[] | null
}

/** PlanDayModel.swift */
export interface PlanDay {
    id: number
    date: string | null
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    recipes: Recipe[]
    /** Planned meals that aren't recipes (#67). Absent from soupi < 2.9.0. */
    meals?: Meal[]
    plan?: Plan | null
    planId: number
}

/** PlanModel.swift */
export interface Plan {
    id: number
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    planDays: PlanDay[]
    household?: Household | null
    householdId: number
}

/** HouseholdModel.swift */
export interface Household {
    id: number
    name: string
    joinToken: string
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    members: User[] | null
    pantries: Pantry[] | null
    recipes: Recipe[] | null
    recipeTags: RecipeTag[] | null
    plans: Plan[] | null
}

/** UserModel.swift */
export interface User {
    id: string
    clerkId: string
    email: string | null
    name: string | null
    themePreference: string | null
    defaultHouseholdId: number
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    households: Household[]
}

// ── Encodable patch / request types ─────────────────────────────────────────
// Optional fields are omitted from the JSON body when undefined (JSON.stringify
// drops `undefined`), matching how the Swift patches encode only set values.

/** RecipeModel.swift — RecipeTagPatch */
export interface RecipeTagPatch {
    id?: number
    name: string | null
}

/** RecipeModel.swift — RecipePatch (ingredients/tags are sent as patches). */
export interface RecipePatch {
    id?: number
    name?: string
    prepTime?: string
    cookTime?: string
    servings?: string
    /** Plain lines, or with the optional flag (soupi 2.7.0+). */
    ingredients?: (string | { sentence: string; optional: boolean })[]
    instructions?: string[]
    notes?: string | null
    tags?: RecipeTagPatch[]
    /** The page a recipe was imported from. */
    source?: string | null
}

/** RecipeModel.swift — RecipeImport (response from /recipes/scrape). */
export interface RecipeImport {
    name: string | null
    prepTime: string | null
    cookTime: string | null
    servings: string | null
    ingredients: string[] | null
    instructions: string[] | null
    /** Links kept from the page (the video, the full recipe) when the steps aren't
     *  written out. soupi 2.8.0+. */
    notes?: string | null
    /** Indexes into `ingredients` of optional ones (an "Optional:" section). soupi 2.8.0+. */
    optionalIngredients?: number[]
    /** The page the recipe came from (after following a link, the linked page). */
    source?: string | null
}

/** RecipeModel.swift — RecipeCompletion (POST /recipes/{id}/made).
 *  rating is optional and must be OMITTED when unset — the server rejects null. */
export interface RecipeCompletion {
    recipeId: number
    rating?: Rating
    finishedPantryItems: number[]
    /** Pantry items now running low (kept in stock). */
    lowPantryItems?: number[]
    /** A dated line added to the end of the recipe's notes, like "Nov 17: more salt". */
    note?: string
}

/**
 * PantryItemModel.swift — PantryItemPatch.
 * The Swift `_uid` (client-only optimistic-update id) is intentionally not part
 * of the wire type. Note: Swift's CodingKeys also omit `expiresAt`; we include
 * it here since it's a real column — revisit if the server rejects it.
 */
export interface PantryItemPatch {
    id?: number
    name?: string
    quantity?: string | null
    isInStock?: boolean
    isLow?: boolean
    isFavorite?: boolean
    isInShoppingList?: boolean
    purchasedAt?: string
    // expiresAt is a real, nullable column (soupi PR #8) — send null to clear it.
    expiresAt?: string | null
    categoryId?: number
}

/** ItemCategoryModel.swift — ItemCategoryPatch. */
export interface ItemCategoryPatch {
    id?: number
    name?: string
    icon?: string
    isNonFood?: boolean
    pantryId?: number
}

/** A household's fix for how an ingredient matches the pantry (#39). `name` is the
 *  ingredient's normalized name; `pantryItemId` null means "always have, don't track". */
export interface IngredientLink {
    id: number
    name: string
    householdId: number
    pantryItemId: number | null
    pantryItem: { id: number; name: string; deletedAt: string | null } | null
    createdAt: string
    updatedAt: string
}

/** A planned meal that isn't a recipe (#67): a name and the pantry items it needs,
 *  no amounts. Kept after it's made or taken off the plan, so it can be planned again. */
export interface Meal {
    id: number
    name: string
    lastMade: string | null
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    householdId: number
    items: MealItem[]
}

export interface MealItem {
    id: number
    mealId: number
    pantryItemId: number
    /** Doesn't count as missing; "shop for the plan" leaves it out. */
    optional: boolean
    pantryItem: PantryItem
}

/** POST /household/{id}/meals: create, or with `id`, replace the name and items. */
export interface MealPatch {
    id?: number
    name: string
    items: { pantryItemId: number; optional: boolean }[]
}

/** POST /household/{id}/meals/{mealId}/made */
export interface MealCompletion {
    finishedPantryItems: number[]
    lowPantryItems: number[]
}
