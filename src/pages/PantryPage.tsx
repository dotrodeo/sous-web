import { useMemo, useState } from 'react'
import {
    CalendarAlertIcon,
    CheckIcon,
    PlusIcon,
    RestockIcon,
    SearchIcon,
    ShoppingCartIcon,
    TrashIcon,
} from '../components/Icons'
import { BottomSheet } from '../components/BottomSheet'
import { SaveButton } from '../components/SaveButton'
import { CategorySelect, Switch } from '../components/SheetControls'
import { useDeletePantryItem, usePantry, useUpsertPantryItem } from '../hooks/usePantry'
import { groupByCategory, inPantry, isExpiringSoon } from '../lib/pantryHelper'
import type { ItemCategory, PantryItem, PantryItemPatch } from '../lib/types'

type Stock = 'in' | 'low' | 'out'

const STOCK_OPTIONS: Stock[] = ['in', 'low', 'out']

const stockOf = (item: PantryItem): Stock => (!item.isInStock ? 'out' : item.isLow ? 'low' : 'in')

interface Draft {
    id: number | null
    name: string
    categoryId: number | null
    quantity: string
    stock: Stock
    isFavorite: boolean
    isInShoppingList: boolean
    expiresAt: string // YYYY-MM-DD or ''
}

function toDraft(item: PantryItem): Draft {
    return {
        id: item.id,
        name: item.name,
        categoryId: item.categoryId,
        quantity: item.quantity ?? '',
        stock: stockOf(item),
        isFavorite: item.isFavorite,
        isInShoppingList: item.isInShoppingList,
        expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : '',
    }
}

export function PantryPage() {
    const { data: pantry } = usePantry()
    const upsert = useUpsertPantryItem()
    const remove = useDeletePantryItem()

    const [query, setQuery] = useState('')
    const [draft, setDraft] = useState<Draft | null>(null)
    const [pendingDelete, setPendingDelete] = useState<Draft | null>(null)

    const items = useMemo<PantryItem[]>(() => pantry?.pantryItems ?? [], [pantry])
    const categories = useMemo<ItemCategory[]>(
        () => [...(pantry?.itemCategories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
        [pantry],
    )

    const base = useMemo(() => inPantry(items, query), [items, query])
    const groups = useMemo(() => groupByCategory(base), [base])

    const summary = useMemo(() => {
        const exp = base.filter(isExpiringSoon).length
        const low = base.filter((it) => it.isInStock && it.isLow).length
        let s = `${base.length} item${base.length === 1 ? '' : 's'}`
        if (low) s += ` · ${low} low`
        if (exp) s += ` · ${exp} expiring`
        return s
    }, [base])

    const patchItem = (item: PantryItem, patch: PantryItemPatch) =>
        pantry &&
        upsert.mutate({ pantryId: pantry.id, patch: { id: item.id, name: item.name, ...patch } })

    const toggleStock = (item: PantryItem) => {
        const patch: PantryItemPatch = { isInStock: !item.isInStock }
        // Mirror sous-swift markOutOfStock: a staple that runs out auto-joins
        // the shopping list (non-staples are left for the user to add).
        if (item.isInStock && item.isFavorite) patch.isInShoppingList = true
        patchItem(item, patch)
    }

    const openAdd = () =>
        setDraft({
            id: null,
            name: '',
            categoryId: categories[0]?.id ?? null,
            quantity: '',
            stock: 'in',
            isFavorite: false,
            isInShoppingList: false,
            expiresAt: '',
        })

    const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

    const saveSheet = async () => {
        if (!draft || !pantry || !draft.name.trim()) throw new Error('nothing to save')
        const patch: PantryItemPatch = {
            ...(draft.id != null ? { id: draft.id } : {}),
            name: draft.name.trim(),
            quantity: draft.quantity.trim() || null,
            isInStock: draft.stock !== 'out',
            isLow: draft.stock === 'low',
            isFavorite: draft.isFavorite,
            isInShoppingList: draft.isInShoppingList,
            expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
            ...(draft.categoryId != null ? { categoryId: draft.categoryId } : {}),
        }
        return upsert.mutateAsync({ pantryId: pantry.id, patch })
    }

    const confirmDelete = () => {
        if (!pendingDelete || !pantry || pendingDelete.id == null) return
        remove.mutate(
            { pantryId: pantry.id, itemId: pendingDelete.id },
            {
                onSuccess: () => {
                    setPendingDelete(null)
                    setDraft(null)
                },
            },
        )
    }
    const closeDelete = () => {
        remove.reset()
        setPendingDelete(null)
    }

    const isEdit = draft?.id != null

    return (
        <>
            <div className="blob">
                <div className="blob-actions">
                    <button type="button" className="fab" aria-label="add item" onClick={openAdd}>
                        <PlusIcon size={24} />
                    </button>
                </div>
            </div>

            <div className="content wide">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">pantry</h1>
                        <div className="summary">{summary}</div>
                    </div>
                    <button type="button" className="btn-primary" onClick={openAdd}>
                        <PlusIcon size={20} />
                        add item
                    </button>
                </div>

                <div className="page-head">
                    <h1 className="page-title">pantry</h1>
                    <div className="summary">{summary}</div>
                </div>

                <div className="search-bar" style={{ marginTop: 18 }}>
                    <SearchIcon size={22} />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="search your pantry"
                        aria-label="search your pantry"
                    />
                </div>

                {groups.length === 0 ? (
                    <div className="empty-state">
                        <div className="emoji">🧺</div>
                        <div className="title">nothing here</div>
                        <div>Try a different search or filter.</div>
                    </div>
                ) : (
                    <div className="cat-groups">
                        {groups.map((group) => (
                            <div className="cat-group" key={group.category?.id ?? 'uncategorized'}>
                                <div className="cat-group-head">
                                    <span className="emoji">{group.category?.icon ?? '🗂️'}</span>
                                    {group.name}
                                    <span className="count">{group.pantryItems.length}</span>
                                </div>
                                <div className="cat-card">
                                    {group.pantryItems.map((it) => (
                                        <div className="cat-row" key={it.id}>
                                            <button
                                                type="button"
                                                className={`stock-dot${it.isInStock ? ' stocked' : ''}${it.isInStock && it.isLow ? ' low' : ''}`}
                                                aria-label={
                                                    !it.isInStock
                                                        ? 'out — tap to mark in stock'
                                                        : it.isLow
                                                          ? 'running low — tap to mark out'
                                                          : 'in stock — tap to mark out'
                                                }
                                                onClick={() => toggleStock(it)}
                                            >
                                                <span className="dot">
                                                    {it.isInStock && <CheckIcon size={12} />}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className="row-name"
                                                onClick={() => setDraft(toDraft(it))}
                                            >
                                                {it.name}
                                            </button>
                                            {it.isInStock && it.isLow && (
                                                <span className="low-badge">low</span>
                                            )}
                                            {it.isInShoppingList && (
                                                <span
                                                    className="cart-badge"
                                                    title="on the shopping list"
                                                >
                                                    <ShoppingCartIcon size={17} />
                                                </span>
                                            )}
                                            {isExpiringSoon(it) && (
                                                <span
                                                    className="expiring-badge"
                                                    title="expiring soon"
                                                >
                                                    <CalendarAlertIcon size={17} />
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                className={`restock-btn${it.isFavorite ? ' on' : ''}`}
                                                aria-label={
                                                    it.isFavorite ? 'staple on' : 'staple off'
                                                }
                                                title={
                                                    it.isFavorite
                                                        ? 'staple — restock'
                                                        : 'mark as staple'
                                                }
                                                onClick={() =>
                                                    patchItem(it, { isFavorite: !it.isFavorite })
                                                }
                                            >
                                                <RestockIcon size={22} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {draft && (
                <BottomSheet onClose={() => setDraft(null)}>
                    <div className="sheet-head">
                        <span className="sheet-title">{isEdit ? 'edit item' : 'add item'}</span>
                        <SaveButton
                            onSave={saveSheet}
                            onSaved={() => setDraft(null)}
                            disabled={!draft.name.trim()}
                        />
                    </div>

                    <label className="sheet-label">name</label>
                    <div className="sheet-row">
                        <input
                            className="field grow"
                            autoFocus={!isEdit}
                            value={draft.name}
                            onChange={(e) => update({ name: e.target.value })}
                            placeholder="fresh sage"
                        />
                        <button
                            type="button"
                            className={`restock-round${draft.isFavorite ? ' on' : ''}`}
                            aria-label={draft.isFavorite ? 'staple on' : 'staple off'}
                            title="mark as staple"
                            onClick={() => update({ isFavorite: !draft.isFavorite })}
                        >
                            <RestockIcon size={22} />
                        </button>
                    </div>

                    {categories.length > 0 && (
                        <>
                            <label className="sheet-label">category</label>
                            <CategorySelect
                                categories={categories}
                                value={draft.categoryId}
                                onChange={(categoryId) => update({ categoryId })}
                            />
                        </>
                    )}

                    <div className="sheet-field" style={{ marginTop: 14 }}>
                        <label className="sheet-label">expires (optional)</label>
                        <input
                            className="field"
                            type="date"
                            value={draft.expiresAt}
                            onChange={(e) => update({ expiresAt: e.target.value })}
                        />
                    </div>

                    <div className="toggle-row">
                        <span id="stock-label">stock</span>
                        <div
                            className="seg stock-seg"
                            role="radiogroup"
                            aria-labelledby="stock-label"
                        >
                            {STOCK_OPTIONS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    role="radio"
                                    aria-checked={draft.stock === s}
                                    className={draft.stock === s ? 'active' : undefined}
                                    onClick={() => update({ stock: s })}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="toggle-row bordered">
                        <span>in shopping list</span>
                        <Switch
                            on={draft.isInShoppingList}
                            label="toggle in shopping list"
                            onChange={(on) => update({ isInShoppingList: on })}
                        />
                    </div>

                    {isEdit && (
                        <button
                            type="button"
                            className="sheet-delete"
                            onClick={() => setPendingDelete(draft)}
                        >
                            <TrashIcon size={20} />
                            delete item
                        </button>
                    )}
                </BottomSheet>
            )}

            {pendingDelete && (
                <div className="modal-backdrop">
                    <div className="modal-scrim" onClick={closeDelete} />
                    <div className="modal-card">
                        <div className="modal-badge danger">
                            <TrashIcon size={26} />
                        </div>
                        <div className="modal-title">delete item?</div>
                        <div className="modal-text">
                            <strong>{pendingDelete.name}</strong> will be removed from your pantry.
                        </div>
                        {remove.isError && (
                            <p className="form-error modal-error" role="alert">
                                couldn’t delete — check your connection and try again.
                            </p>
                        )}
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-chip"
                                style={{ flex: 1 }}
                                onClick={closeDelete}
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={remove.isPending}
                                onClick={confirmDelete}
                            >
                                delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
