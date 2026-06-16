import { useMemo, useState } from 'react'
import { Screen } from '../components/Screen'
import { SearchBar } from '../components/SearchBar'
import { PlusIcon } from '../components/Icons'
import { PantryItemRow } from '../components/PantryItemRow'
import { PantryItemModal } from '../components/PantryItemModal'
import { usePantry, useCategories, useUpsertPantryItem } from '../hooks/usePantry'
import { inPantry, groupByCategory } from '../lib/pantryHelper'
import { toISOString } from '../lib/dateHelper'
import type { PantryItem, PantryItemPatch } from '../lib/types'

type Editing = { item: PantryItem | null } | null

export function PantryPage() {
  const pantryQuery = usePantry()
  const pantry = pantryQuery.data
  const categoriesQuery = useCategories(pantry?.id)
  const upsert = useUpsertPantryItem()

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Editing>(null)

  const items = useMemo(() => pantry?.pantryItems ?? [], [pantry])
  const groups = useMemo(() => groupByCategory(inPantry(items, search)), [items, search])
  const categories = categoriesQuery.data ?? pantry?.itemCategories ?? []

  const pantryId = pantry?.id

  function apply(patch: PantryItemPatch) {
    if (pantryId == null) return
    upsert.mutate({ pantryId, patch })
  }

  // The server requires `name` present on every pantry write (the native app
  // sends it because Swift encodes nil optionals as null; JSON omits undefined).
  function toggleFavorite(item: PantryItem) {
    apply({
      id: item.id,
      name: item.name,
      isFavorite: !item.isFavorite,
      // Un-favoriting moves the item onto the shopping list (PantryViewModel).
      ...(item.isFavorite ? { isInShoppingList: true } : {}),
    })
  }

  function markOutOfStock(item: PantryItem) {
    apply({
      id: item.id,
      name: item.name,
      isInStock: false,
      ...(item.isFavorite ? { isInShoppingList: true } : {}),
    })
  }

  function deleteItem(item: PantryItem) {
    apply({ id: item.id, name: item.name, isInStock: false, deletedAt: toISOString() })
  }

  function saveItem(patch: PantryItemPatch) {
    apply(patch)
    setEditing(null)
  }

  return (
    <Screen
      title="pantry"
      loading={pantryQuery.isLoading}
      right={
        <button className="icon-btn" type="button" aria-label="New pantry item" onClick={() => setEditing({ item: null })}>
          <PlusIcon />
        </button>
      }
      search={<SearchBar value={search} onChange={setSearch} placeholder="search pantry" />}
    >
      {pantryQuery.isError && <p className="empty-state">Couldn’t load your pantry.</p>}

      {pantryQuery.isSuccess && groups.length === 0 && (
        <p className="empty-state">Your pantry is empty. Tap + to add something.</p>
      )}

      {groups.map((group) => (
        <section key={group.name} className="pantry-section">
          <h2 className="category-header">
            {group.category?.icon ? `${group.category.icon} ` : ''}
            {group.name.toLowerCase()}
          </h2>
          <div className="pantry-list">
            {group.pantryItems.map((item) => (
              <PantryItemRow
                key={item.id}
                item={item}
                onTap={() => setEditing({ item })}
                onToggleFavorite={() => toggleFavorite(item)}
                onMarkOutOfStock={() => markOutOfStock(item)}
                onDelete={() => deleteItem(item)}
              />
            ))}
          </div>
        </section>
      ))}

      {editing && (
        <PantryItemModal
          item={editing.item}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={saveItem}
        />
      )}
    </Screen>
  )
}
