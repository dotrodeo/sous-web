import { useMemo, useState } from 'react'
import {
    CalendarAlertIcon,
    CheckIcon,
    PlusIcon,
    RestockIcon,
    SearchIcon,
    TrashIcon,
} from '../components/Icons'
import { CategorySelect, Switch } from '../components/SheetControls'
import { usePantry, useUpsertPantryItem } from '../hooks/usePantry'
import { groupByCategory, inPantry, isExpiringSoon } from '../lib/pantryHelper'
import type { ItemCategory, PantryItem, PantryItemPatch } from '../lib/types'

type Filter = 'all' | 'low' | 'expiring' | 'staples'

const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'all' },
    { key: 'low', label: 'low / out' },
    { key: 'expiring', label: 'expiring' },
    { key: 'staples', label: 'staples' },
]

interface Draft {
    id: number | null
    name: string
    categoryId: number | null
    quantity: string
    isInStock: boolean
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
        isInStock: item.isInStock,
        isFavorite: item.isFavorite,
        isInShoppingList: item.isInShoppingList,
        expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : '',
    }
}

export function PantryPage() {
    const { data: pantry } = usePantry()
    const upsert = useUpsertPantryItem()

    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<Filter>('all')
    const [draft, setDraft] = useState<Draft | null>(null)
    const [pendingDelete, setPendingDelete] = useState<Draft | null>(null)

    const items = useMemo<PantryItem[]>(() => pantry?.pantryItems ?? [], [pantry])
    const categories = useMemo<ItemCategory[]>(
        () => [...(pantry?.itemCategories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
        [pantry],
    )

    const base = useMemo(() => inPantry(items, query), [items, query])
    const filtered = useMemo(() => {
        switch (filter) {
            case 'low':
                return base.filter((it) => !it.isInStock)
            case 'expiring':
                return base.filter(isExpiringSoon)
            case 'staples':
                return base.filter((it) => it.isFavorite)
            default:
                return base
        }
    }, [base, filter])
    const groups = useMemo(() => groupByCategory(filtered), [filtered])

    const summary = useMemo(() => {
        const low = base.filter((it) => !it.isInStock).length
        const exp = base.filter(isExpiringSoon).length
        let s = `${base.length} item${base.length === 1 ? '' : 's'}`
        if (low) s += ` · ${low} low`
        if (exp) s += ` · ${exp} expiring`
        return s
    }, [base])

    const patchItem = (item: PantryItem, patch: PantryItemPatch) =>
        pantry &&
        upsert.mutate({ pantryId: pantry.id, patch: { id: item.id, name: item.name, ...patch } })

    const openAdd = () =>
        setDraft({
            id: null,
            name: '',
            categoryId: categories[0]?.id ?? null,
            quantity: '',
            isInStock: true,
            isFavorite: false,
            isInShoppingList: false,
            expiresAt: '',
        })

    const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

    const saveSheet = () => {
        if (!draft || !pantry || !draft.name.trim()) return
        const patch: PantryItemPatch = {
            ...(draft.id != null ? { id: draft.id } : {}),
            name: draft.name.trim(),
            quantity: draft.quantity.trim() || null,
            isInStock: draft.isInStock,
            isFavorite: draft.isFavorite,
            isInShoppingList: draft.isInShoppingList,
            expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
            ...(draft.categoryId != null ? { categoryId: draft.categoryId } : {}),
        }
        upsert.mutate({ pantryId: pantry.id, patch }, { onSuccess: () => setDraft(null) })
    }

    const confirmDelete = () => {
        if (!pendingDelete || !pantry || pendingDelete.id == null) return
        upsert.mutate(
            {
                pantryId: pantry.id,
                patch: {
                    id: pendingDelete.id,
                    name: pendingDelete.name,
                    deletedAt: new Date().toISOString(),
                },
            },
            {
                onSuccess: () => {
                    setPendingDelete(null)
                    setDraft(null)
                },
            },
        )
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

                <div className="chip-rail">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            className={`chip${filter === f.key ? ' active' : ''}`}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
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
                                                className={`stock-dot${it.isInStock ? ' stocked' : ''}`}
                                                aria-label={
                                                    it.isInStock
                                                        ? 'in stock — tap to mark out'
                                                        : 'out — tap to mark in stock'
                                                }
                                                onClick={() =>
                                                    patchItem(it, { isInStock: !it.isInStock })
                                                }
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
                <div className="sheet-overlay">
                    <div className="modal-scrim" onClick={() => setDraft(null)} />
                    <div className="sheet-card">
                        <div className="sheet-grabber" />
                        <div className="sheet-head">
                            <span className="sheet-title">{isEdit ? 'edit item' : 'add item'}</span>
                            <button
                                type="button"
                                className="sheet-save"
                                disabled={!draft.name.trim()}
                                onClick={saveSheet}
                            >
                                save
                            </button>
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
                            <span>in stock</span>
                            <Switch
                                on={draft.isInStock}
                                label="toggle in stock"
                                onChange={(on) => update({ isInStock: on })}
                            />
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
                    </div>
                </div>
            )}

            {pendingDelete && (
                <div className="modal-backdrop">
                    <div className="modal-scrim" onClick={() => setPendingDelete(null)} />
                    <div className="modal-card">
                        <div className="modal-badge danger">
                            <TrashIcon size={26} />
                        </div>
                        <div className="modal-title">delete item?</div>
                        <div className="modal-text">
                            <strong>{pendingDelete.name}</strong> will be removed from your pantry.
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-chip"
                                style={{ flex: 1 }}
                                onClick={() => setPendingDelete(null)}
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={upsert.isPending}
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
