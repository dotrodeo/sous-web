import { useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
    CheckIcon,
    EditIcon,
    MinusCircleIcon,
    PlusIcon,
    SearchIcon,
    TrashIcon,
} from '../components/Icons'
import { BottomSheet } from '../components/BottomSheet'
import { SaveButton } from '../components/SaveButton'
import { CategorySelect } from '../components/SheetControls'
import { useDeletePantryItem, usePantry, useUpsertPantryItem } from '../hooks/usePantry'
import { useActiveHousehold } from '../hooks/useUser'
import { PANTRY_PATCH, useOnline, type PantryPatchVars } from '../lib/offline'
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
    const remove = useDeletePantryItem()
    const household = useActiveHousehold()
    const online = useOnline()
    // Quick changes to existing items (check off, put on or take off the list)
    // work offline: they show at once and sync when the connection is back.
    const quickPatch = useMutation<unknown, Error, PantryPatchVars>({ mutationKey: PANTRY_PATCH })

    const [mode, setMode] = useState<Mode>('shop')
    const [draft, setDraft] = useState<Draft | null>(null)
    const [pendingDelete, setPendingDelete] = useState<Draft | null>(null)
    /** Edit mode: filters the catalog by name. */
    const [query, setQuery] = useState('')

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
                : items
                      .filter((it) => matchesSearch(it.name, query))
                      .sort(
                          (a, b) =>
                              Number(b.isInShoppingList) - Number(a.isInShoppingList) ||
                              a.name.localeCompare(b.name),
                      )
        return groupByCategory(source)
    }, [mode, items, onList, query])

    // Offer to create what was typed unless an item already has exactly that name.
    const typed = query.trim()
    const canCreate =
        mode === 'edit' &&
        typed.length > 0 &&
        !items.some((it) => it.name.trim().toLowerCase() === typed.toLowerCase())

    const summary =
        mode === 'shop'
            ? onList.length === 0
                ? 'nothing on the list'
                : `${onList.length} item${onList.length === 1 ? '' : 's'} · ${remaining} to buy`
            : `${items.length} item${items.length === 1 ? '' : 's'} in your catalog`

    const patchItem = (item: PantryItem, patch: PantryItemPatch, onDone?: () => void) => {
        if (!pantry || !household) return
        quickPatch.mutate({
            householdId: household.id,
            pantryId: pantry.id,
            patch: { id: item.id, name: item.name, ...patch },
        })
        onDone?.()
    }

    const clearChecked = () => {
        onList
            .filter((it) => it.isInStock)
            .forEach((it) => patchItem(it, { isInShoppingList: false }))
    }

    const openAdd = (name = '') =>
        setDraft({ id: null, name, categoryId: categories[0]?.id ?? null, quantity: '' })

    const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

    const saveButtonRef = useRef<HTMLButtonElement>(null)
    const saveSheet = async () => {
        if (!draft || !pantry || !draft.name.trim()) throw new Error('nothing to save')
        const isNew = draft.id == null
        const patch: PantryItemPatch = {
            ...(draft.id != null ? { id: draft.id } : {}),
            name: draft.name.trim(),
            quantity: draft.quantity.trim() || null,
            ...(draft.categoryId != null ? { categoryId: draft.categoryId } : {}),
            // New items go straight onto the shopping list.
            ...(isNew ? { isInShoppingList: true, isInStock: false } : {}),
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
    const draftItem = isEdit ? items.find((it) => it.id === draft?.id) : undefined

    /** Takes the item off the list without touching its stock state. */
    const removeFromList = () => {
        if (!draftItem) return
        patchItem(draftItem, { isInShoppingList: false }, () => setDraft(null))
    }
    const shop = mode === 'shop'
    const progress = onList.length ? Math.round((checkedCount / onList.length) * 100) : 0

    return (
        <>
            <div className="blob">
                <div className="blob-actions">
                    <button
                        type="button"
                        className="fab"
                        aria-label="add item"
                        onClick={() => openAdd()}
                    >
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
                    <button type="button" className="btn-primary" onClick={() => openAdd()}>
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
                            onClick={() => {
                                setMode('shop')
                                setQuery('')
                            }}
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

                {!shop && (
                    <div className="search-bar list-search">
                        <SearchIcon size={22} />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setQuery('')
                                if (e.key === 'Enter' && canCreate) openAdd(typed)
                            }}
                            placeholder="search items"
                            aria-label="search items"
                            enterKeyHint={canCreate ? 'done' : 'search'}
                        />
                    </div>
                )}
                {canCreate && (
                    <button type="button" className="create-row" onClick={() => openAdd(typed)}>
                        <PlusIcon size={18} />
                        <span>
                            add “<strong>{typed}</strong>”
                        </span>
                    </button>
                )}

                {shop && onList.length > 0 && (
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                )}

                {groups.length === 0 && !shop && typed ? (
                    <div className="empty-state compact">
                        <div>No items match “{typed}”.</div>
                    </div>
                ) : groups.length === 0 ? (
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
                        <SaveButton
                            ref={saveButtonRef}
                            onSave={saveSheet}
                            onSaved={() => {
                                if (draft?.id == null) setQuery('')
                                setDraft(null)
                            }}
                            disabled={!draft.name.trim() || !online}
                        />
                    </div>
                    {!online && (
                        <p className="sheet-offline" role="note">
                            you’re offline. {isEdit ? 'editing' : 'adding'} items needs a
                            connection; checking items off still works.
                        </p>
                    )}

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
                                        saveButtonRef.current?.click()
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

                    {draftItem?.isInShoppingList && (
                        <button
                            type="button"
                            className="sheet-secondary"
                            style={{ marginTop: 22 }}
                            onClick={removeFromList}
                        >
                            <MinusCircleIcon size={20} />
                            remove from list
                        </button>
                    )}

                    {isEdit && (
                        <button
                            type="button"
                            className="sheet-delete"
                            style={{ marginTop: draftItem?.isInShoppingList ? 12 : 22 }}
                            disabled={!online}
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
                    <div className="modal-scrim" onClick={closeDelete} />
                    <div className="modal-card">
                        <div className="modal-badge danger">
                            <TrashIcon size={26} />
                        </div>
                        <div className="modal-title">delete item?</div>
                        <div className="modal-text">
                            <strong>{pendingDelete.name}</strong> will be permanently deleted from
                            your saved items.
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

/** Every word typed appears in the name, ignoring case. */
function matchesSearch(name: string, query: string): boolean {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const n = name.toLowerCase()
    return words.every((w) => n.includes(w))
}
