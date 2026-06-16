import { useMemo, useState } from 'react'
import { Screen } from '../components/Screen'
import { SearchBar } from '../components/SearchBar'
import { PlusIcon, CheckIcon, ListBulletIcon } from '../components/Icons'
import { ShoppingListRow } from '../components/ShoppingListRow'
import { PantryItemModal } from '../components/PantryItemModal'
import { usePantry, useCategories, useUpsertPantryItem } from '../hooks/usePantry'
import { inShoppingList, groupByCategory } from '../lib/pantryHelper'
import { toISOString } from '../lib/dateHelper'
import type { PantryItem, PantryItemPatch } from '../lib/types'

type Editing = { item: PantryItem | null } | null

export function ListPage() {
  const pantryQuery = usePantry()
  const pantry = pantryQuery.data
  const categoriesQuery = useCategories(pantry?.id)
  const upsert = useUpsertPantryItem()

  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)

  const items = useMemo(() => pantry?.pantryItems ?? [], [pantry])
  const groups = useMemo(
    () => groupByCategory(inShoppingList(items, search, showAll)),
    [items, search, showAll],
  )
  const categories = categoriesQuery.data ?? pantry?.itemCategories ?? []
  const pantryId = pantry?.id

  function apply(patch: PantryItemPatch) {
    if (pantryId == null) return
    upsert.mutate({ pantryId, patch })
  }

  // Every write includes `name` — the server requires it present.
  function purchase(item: PantryItem) {
    apply({ id: item.id, name: item.name, isInStock: true, isInShoppingList: false, purchasedAt: toISOString() })
  }

  function addToList(item: PantryItem) {
    apply({ id: item.id, name: item.name, isInShoppingList: true })
  }

  function deleteItem(item: PantryItem) {
    apply({ id: item.id, name: item.name, isInShoppingList: false, deletedAt: toISOString() })
  }

  function saveItem(patch: PantryItemPatch) {
    apply(patch)
    setEditing(null)
  }

  return (
    <Screen
      title="shopping list"
      loading={pantryQuery.isLoading}
      right={
        <>
          <button
            className="icon-btn"
            type="button"
            aria-label={showAll ? 'Done adding' : 'Add from items'}
            aria-pressed={showAll}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? <CheckIcon /> : <ListBulletIcon />}
          </button>
          <button className="icon-btn" type="button" aria-label="New list item" onClick={() => setEditing({ item: null })}>
            <PlusIcon />
          </button>
        </>
      }
      search={<SearchBar value={search} onChange={setSearch} placeholder="search items" />}
    >
      {pantryQuery.isError && <p className="empty-state">Couldn’t load your list.</p>}

      {pantryQuery.isSuccess && groups.length === 0 && (
        <p className="empty-state">
          {showAll ? 'No items found.' : 'Your list is empty. Tap + to add something.'}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.name} className="pantry-section">
          <h2 className="category-header">
            {group.category?.icon ? `${group.category.icon} ` : ''}
            {group.name.toLowerCase()}
          </h2>
          <div className="pantry-list">
            {group.pantryItems.map((item) => (
              <ShoppingListRow
                key={item.id}
                item={item}
                showAll={showAll}
                onPurchase={() => purchase(item)}
                onAddToList={() => addToList(item)}
                onEdit={() => setEditing({ item })}
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
