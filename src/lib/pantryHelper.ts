// Port of the pantry grouping/filtering logic in PantryViewModel.swift
// (inPantry + pantryItemsByCategory). CategoryWithItems is shared with the
// List tab (ListViewModel.swift).

import type { ItemCategory, PantryItem } from './types'

export interface CategoryWithItems {
    name: string
    category: ItemCategory | null
    pantryItems: PantryItem[]
}

/** Food items in stock or favorited, search-filtered, in-stock first then A→Z. */
export function inPantry(items: PantryItem[], searchText: string): PantryItem[] {
    const q = searchText.trim().toLowerCase()
    return items
        .filter((it) => (q ? it.name.toLowerCase().includes(q) : true))
        .filter((it) => !(it.category?.isNonFood ?? false) && (it.isInStock || it.isFavorite))
        .sort((a, b) => {
            if (a.isInStock !== b.isInStock) return a.isInStock ? -1 : 1
            return a.name.localeCompare(b.name)
        })
}

/** Shopping-list items (or all, in add mode), search-filtered, A→Z (ListViewModel). */
export function inShoppingList(
    items: PantryItem[],
    searchText: string,
    showAll: boolean,
): PantryItem[] {
    const q = searchText.trim().toLowerCase()
    return items
        .filter((it) => (q ? it.name.toLowerCase().includes(q) : true))
        .filter((it) => showAll || it.isInShoppingList)
        .sort((a, b) => a.name.localeCompare(b.name))
}

/** Group items by category (sorted by sortOrder); trailing "Uncategorized". */
export function groupByCategory(items: PantryItem[]): CategoryWithItems[] {
    const groups = new Map<number, { category: ItemCategory; items: PantryItem[] }>()
    for (const item of items) {
        const cat = item.category
        if (!cat) continue
        if (!groups.has(cat.id)) groups.set(cat.id, { category: cat, items: [] })
        groups.get(cat.id)!.items.push(item)
    }

    const result: CategoryWithItems[] = [...groups.values()].map((g) => ({
        name: g.category.name,
        category: g.category,
        pantryItems: g.items,
    }))

    const uncategorized = items.filter((it) => !it.category)
    if (uncategorized.length > 0) {
        result.push({ name: 'Uncategorized', category: null, pantryItems: uncategorized })
    }

    return result.sort(
        (a, b) => (a.category?.sortOrder ?? Infinity) - (b.category?.sortOrder ?? Infinity),
    )
}
