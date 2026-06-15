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
  isInStock: boolean
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
  ingredients?: string[]
  instructions?: string[]
  tags?: RecipeTagPatch[]
  source?: string
  deletedAt?: string
}

/** RecipeModel.swift — RecipeImport (response from /recipes/scrape). */
export interface RecipeImport {
  name: string | null
  prepTime: string | null
  cookTime: string | null
  servings: string | null
  ingredients: string[] | null
  instructions: string[] | null
}

/** RecipeModel.swift — RecipeCompletion (POST /recipes/{id}/made). */
export interface RecipeCompletion {
  recipeId: number
  rating: Rating | null
  finishedPantryItems: number[]
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
  isInStock?: boolean
  isFavorite?: boolean
  isInShoppingList?: boolean
  purchasedAt?: string
  expiresAt?: string
  deletedAt?: string
  categoryId?: number
}

/** ItemCategoryModel.swift — ItemCategoryPatch. */
export interface ItemCategoryPatch {
  id?: number
  name?: string
  icon?: string
  isNonFood?: boolean
  deletedAt?: string
  pantryId?: number
}
