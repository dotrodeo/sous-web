import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { ChevronLeftIcon, PlusIcon, PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '../components/Icons'
import { ItemCategoryModal } from '../components/ItemCategoryModal'
import { usePantry, useCategories, useUpsertCategory, useUpdateCategorySortOrder } from '../hooks/usePantry'
import { toISOString } from '../lib/dateHelper'
import type { ItemCategory, ItemCategoryPatch } from '../lib/types'

/** Loads categories, then mounts the editor with them as initial order. */
export function EditCategoriesPage() {
  const pantryQuery = usePantry()
  const pantry = pantryQuery.data
  const categoriesQuery = useCategories(pantry?.id)

  const categories = categoriesQuery.data ?? pantry?.itemCategories ?? []

  if (pantryQuery.isLoading || (pantry && categoriesQuery.isLoading)) {
    return <Screen title="categories" loading />
  }

  return (
    <CategoriesEditor
      key={categories.map((c) => c.id).join('-')}
      pantryId={pantry?.id}
      initial={categories}
    />
  )
}

function CategoriesEditor({ pantryId, initial }: { pantryId: number | undefined; initial: ItemCategory[] }) {
  const navigate = useNavigate()
  const upsertCategory = useUpsertCategory()
  const updateSort = useUpdateCategorySortOrder()

  const [order, setOrder] = useState<ItemCategory[]>(initial)
  const [editing, setEditing] = useState<{ category: ItemCategory | null } | null>(null)

  function move(index: number, dir: -1 | 1) {
    const next = [...order]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
  }

  function saveOrder() {
    if (pantryId == null) return
    updateSort.mutate({ pantryId, categoryIds: order.map((c) => c.id) })
  }

  function deleteCategory(category: ItemCategory) {
    if (pantryId == null) return
    if (!confirm(`Delete category “${category.name}”?`)) return
    upsertCategory.mutate({ pantryId, patch: { id: category.id, name: category.name, deletedAt: toISOString() } })
    setOrder((o) => o.filter((c) => c.id !== category.id))
  }

  function saveCategory(patch: ItemCategoryPatch) {
    if (pantryId == null) return
    upsertCategory.mutate({ pantryId, patch })
    setEditing(null)
  }

  return (
    <Screen
      title="categories"
      right={
        <div className="detail-actions">
          <button className="icon-btn" type="button" aria-label="Back" onClick={() => navigate('/settings')}>
            <ChevronLeftIcon />
          </button>
          <button className="text-btn save-btn" type="button" onClick={saveOrder}>
            save
          </button>
          <button className="icon-btn" type="button" aria-label="New category" onClick={() => setEditing({ category: null })}>
            <PlusIcon />
          </button>
        </div>
      }
    >
      <div className="pantry-list">
        {order.map((category, i) => (
          <div key={category.id} className="pantry-row list-item">
            <span className="reorder-controls">
              <button className="reorder-btn" type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                <ChevronUpIcon size={16} />
              </button>
              <button className="reorder-btn" type="button" aria-label="Move down" disabled={i === order.length - 1} onClick={() => move(i, 1)}>
                <ChevronDownIcon size={16} />
              </button>
            </span>
            <span className="pantry-row-name">
              {category.icon ? `${category.icon} ` : ''}
              {category.name}
            </span>
            <span className="pantry-row-actions">
              <button className="pantry-action" type="button" aria-label="Edit" onClick={() => setEditing({ category })}>
                <PencilIcon size={18} />
              </button>
              <button className="pantry-action pantry-action-danger" type="button" aria-label="Delete" onClick={() => deleteCategory(category)}>
                <TrashIcon size={18} />
              </button>
            </span>
          </div>
        ))}
        {order.length === 0 && <p className="empty-state">No categories yet. Tap + to add one.</p>}
      </div>

      <p className="reorder-hint">Reorder with the arrows, then tap save.</p>

      {editing && (
        <ItemCategoryModal
          category={editing.category}
          onClose={() => setEditing(null)}
          onSave={saveCategory}
        />
      )}
    </Screen>
  )
}
