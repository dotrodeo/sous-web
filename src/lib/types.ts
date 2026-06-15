// TypeScript ports of the Swift models in sous-swift/Models.
// Only the fields needed for the Phase 1 spike are typed strictly; the rest
// mirror the Swift Decodable structs 1:1 so they can be reused as we expand.

/** Mirrors Swift's PrismaDecimal (a Prisma.Decimal serialized as {s,e,d}). */
export interface PrismaDecimal {
  s: number
  e: number
  d: number[]
}

/** Mirrors RecipeTagModel.swift (RecipeTag). */
export interface RecipeTag {
  id: number
  name: string
  createdAt: string
  updatedAt: string
  householdId: number
}

/** Mirrors IngredientModel.swift (Ingredient). */
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

/** Mirrors RecipeModel.swift (Recipe). */
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
  householdId: number
  source: string | null
  lastMade: string | null
  rating: number
  timesMade: number
}

/** Minimal Household — only what the bootstrap flow needs for now. */
export interface Household {
  id: number
  name: string
}

/** Mirrors UserModel.swift (User). */
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
