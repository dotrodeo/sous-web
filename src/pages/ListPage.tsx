import { useMemo, useState } from 'react'
import { CheckIcon, EditIcon, MinusCircleIcon, PlusIcon, TrashIcon } from '../components/Icons'
import { BottomSheet } from '../components/BottomSheet'
import { CategorySelect } from '../components/SheetControls'
import { usePantry, useUpsertPantryItem } from '../hooks/usePantry'
import { groupByCategory } from '../lib/pantryHelper'
import type { ItemCategory, PantryItem, PantryItemPatch } from '../lib/types'

type Mode = 'shop' | 'edit'

interface Draft {
    id: number | null
    name: string
    categoryId: number | null
    quantity: string
}

function toDraft(item: PantryItem): Draft {
    return {
        id: item.id,
        name: item.name,
        categoryId: item.categoryId,
        quantity: item.quantity ?? '',
    }
}

export function ListPage() {
    const { data: pantry } = usePantry()
    const upsert = useUpsertPantryItem()

    const [mode, setMode] = useState<Mode>('shop')
    const [draft, setDraft] = useState<Draft | null>(null)
    const [pendingDelete, setPendingDelete] = useState<Draft | null>(null)

    const items = useMemo<PantryItem[]>(() => pantry?.pantryItems ?? [], [pantry])
    const categories = useMemo<ItemCategory[]>(
        () => [...(pantry?.itemCategories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
        [pantry],
    )

    const onList = useMemo(() => items.filter((it) => it.isInShoppingList), [items])
    const remaining = onList.filter((it) => !it.isInStock).length
    const checkedCount = onList.length - remaining

    // In shop mode, "checked" == in stock (you've grabbed it); unchecked first.
    const groups = useMemo(() => {
        const source =
            mode === 'shop'
                ? [...onList].sort(
                      (a, b) =>
                          Number(a.isInStock) - Number(b.isInStock) || a.name.localeCompare(b.name),
                  )
                : [...items].sort(
                      (a, b) =>
                          Number(b.isInShoppingList) - Number(a.isInShoppingList) ||
                          a.name.localeCompare(b.name),
                  )
        return groupByCategory(source)
    }, [mode, items, onList])

    const summary =
        mode === 'shop'
            ? onList.length === 0
                ? 'nothing on the list'
                : `${onList.length} item${onList.length === 1 ? '' : 's'} · ${remaining} to buy`
            : `${items.length} item${items.length === 1 ? '' : 's'} in your catalog`

    const patchItem = (item: PantryItem, patch: PantryItemPatch) =>
        pantry &&
        upsert.mutate({ pantryId: pantry.id, patch: { id: item.id, name: item.name, ...patch } })

    const clearChecked = () => {
        if (!pantry) return
        onList
            .filter((it) => it.isInStock)
            .forEach((it) =>
                upsert.mutate({
                    pantryId: pantry.id,
                    patch: { id: it.id, name: it.name, isInShoppingList: false },
                }),
            )
    }

    const openAdd = () =>
        setDraft({ id: null, name: '', categoryId: categories[0]?.id ?? null, quantity: '' })

    const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

    const saveSheet = () => {
        if (!draft || !pantry || !draft.name.trim()) return
        const isNew = draft.id == null
        const patch: PantryItemPatch = {
            ...(draft.id != null ? { id: draft.id } : {}),
            name: draft.name.trim(),
            quantity: draft.quantity.trim() || null,
            ...(draft.categoryId != null ? { categoryId: draft.categoryId } : {}),
            // New items go straight onto the shopping list.
            ...(isNew ? { isInShoppingList: true, isInStock: false } : {}),
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
    const shop = mode === 'shop'
    const progress = onList.length ? Math.round((checkedCount / onList.length) * 100) : 0

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
                        <h1 className="page-title">list</h1>
                        <div className="summary">{summary}</div>
                    </div>
                    <button type="button" className="btn-primary" onClick={openAdd}>
                        <PlusIcon size={20} />
                        add item
                    </button>
                </div>

                <div className="page-head">
                    <h1 className="page-title">list</h1>
                    <div className="summary">{summary}</div>
                </div>

                <div className="list-controls">
                    <div className="mode-toggle">
                        <button
                            type="button"
                            className={`mode-tab${shop ? ' active' : ''}`}
                            onClick={() => setMode('shop')}
                        >
                            shop
                        </button>
                        <button
                            type="button"
                            className={`mode-tab${!shop ? ' active' : ''}`}
                            onClick={() => setMode('edit')}
                        >
                            edit
                        </button>
                    </div>
                    {shop && checkedCount > 0 && (
                        <button type="button" className="clear-checked" onClick={clearChecked}>
                            <TrashIcon size={17} />
                            clear checked
                        </button>
                    )}
                </div>

                {shop && onList.length > 0 && (
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                )}

                {groups.length === 0 ? (
                    <div className="empty-state">
                        <div className="emoji">{shop ? '🛒' : '📦'}</div>
                        <div className="title">{shop ? 'your list is empty' : 'no items yet'}</div>
                        <div>
                            {shop
                                ? 'Add an item to get started.'
                                : 'Items you add or buy show up here.'}
                        </div>
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
                                    {group.pantryItems.map((it) => {
                                        const checked = it.isInStock
                                        const history = !shop && !it.isInShoppingList
                                        const rowClass =
                                            shop && checked ? ' checked' : history ? ' history' : ''
                                        return (
                                            <div className={`cat-row${rowClass}`} key={it.id}>
                                                {shop && (
                                                    <button
                                                        type="button"
                                                        className={`check-circle${checked ? ' checked' : ''}`}
                                                        aria-label={
                                                            checked
                                                                ? 'mark not bought'
                                                                : 'mark bought'
                                                        }
                                                        onClick={() =>
                                                            patchItem(it, {
                                                                isInStock: !it.isInStock,
                                                            })
                                                        }
                                                    >
                                                        <span className="ring">
                                                            {checked && <CheckIcon size={15} />}
                                                        </span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="row-name"
                                                    onClick={() => setDraft(toDraft(it))}
                                                >
                                                    {it.name}
                                                </button>
                                                {it.quantity?.trim() && (
                                                    <span className="qty-badge">{it.quantity}</span>
                                                )}
                                                {!shop && it.isInShoppingList && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="row-icon-btn edit"
                                                            aria-label="edit"
                                                            onClick={() => setDraft(toDraft(it))}
                                                        >
                                                            <EditIcon size={20} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="row-icon-btn"
                                                            aria-label="remove from list"
                                                            title="remove from list"
                                                            onClick={() =>
                                                                patchItem(it, {
                                                                    isInShoppingList: false,
                                                                })
                                                            }
                                                        >
                                                            <MinusCircleIcon size={22} />
                                                        </button>
                                                    </>
                                                )}
                                                {history && (
                                                    <button
                                                        type="button"
                                                        className="add-pill"
                                                        aria-label="add to list"
                                                        onClick={() =>
                                                            patchItem(it, {
                                                                isInShoppingList: true,
                                                                isInStock: false,
                                                            })
                                                        }
                                                    >
                                                        <PlusIcon size={16} />
                                                        add
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
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
                        <button
                            type="button"
                            className="sheet-save"
                            disabled={!draft.name.trim()}
                            onClick={saveSheet}
                        >
                            save
                        </button>
                    </div>

                    <div className="sheet-row fields">
                        <div className="grow">
                            <label className="sheet-label">item</label>
                            <input
                                className="field"
                                autoFocus={!isEdit}
                                value={draft.name}
                                onChange={(e) => update({ name: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        saveSheet()
                                    }
                                }}
                                placeholder="red onion"
                            />
                        </div>
                        <div className="qty-col">
                            <label className="sheet-label">qty</label>
                            <input
                                className="field"
                                value={draft.quantity}
                                onChange={(e) => update({ quantity: e.target.value })}
                                placeholder="×2"
                            />
                        </div>
                    </div>

                    {categories.length > 0 && (
                        <>
                            <label className="sheet-label">category</label>
                            <CategorySelect
                                categories={categories}
                                value={draft.categoryId}
                                onChange={(categoryId) => update({ categoryId })}
                                dropUp
                            />
                        </>
                    )}

                    {isEdit && (
                        <button
                            type="button"
                            className="sheet-delete"
                            style={{ marginTop: 22 }}
                            onClick={() => setPendingDelete(draft)}
                        >
                            <TrashIcon size={20} />
                            delete permanently
                        </button>
                    )}
                </BottomSheet>
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
                            <strong>{pendingDelete.name}</strong> will be permanently deleted from
                            your saved items.
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
                                remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
