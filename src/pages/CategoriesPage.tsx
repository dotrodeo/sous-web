import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronUpIcon,
    EditIcon,
    PlusIcon,
    TrashIcon,
} from '../components/Icons'
import { Switch } from '../components/SheetControls'
import { usePantry, useUpsertCategory, useUpdateCategorySortOrder } from '../hooks/usePantry'
import type { ItemCategory, ItemCategoryPatch } from '../lib/types'

const EMOJIS = [
    '🥦',
    '🍞',
    '🧀',
    '🥪',
    '💊',
    '🍗',
    '🥫',
    '🧂',
    '🧊',
    '🥛',
    '🍎',
    '🥬',
    '🫙',
    '🧴',
    '🧻',
    '🍝',
    '🥚',
    '🐟',
    '🍫',
    '☕',
    '🧅',
    '🌶️',
    '🍋',
    '🧄',
]

interface Draft {
    id: number | null
    name: string
    icon: string
    isNonFood: boolean
}

export function CategoriesPage() {
    const navigate = useNavigate()
    const { data: pantry } = usePantry()
    const upsert = useUpsertCategory()
    const updateOrder = useUpdateCategorySortOrder()

    const pantryId = pantry?.id
    const categories = useMemo<ItemCategory[]>(() => pantry?.itemCategories ?? [], [pantry])

    // Order is derived from the server (sortOrder); reordering persists and the
    // refetch reflects it. Kept as a plain derived value — no local mirror.
    const ordered = useMemo(
        () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
        [categories],
    )

    const [draft, setDraft] = useState<Draft | null>(null)
    const [emojiOpen, setEmojiOpen] = useState(false)
    const [pendingDelete, setPendingDelete] = useState<ItemCategory | null>(null)

    const move = (index: number, dir: -1 | 1) => {
        const j = index + dir
        if (j < 0 || j >= ordered.length || !pantryId) return
        const ids = ordered.map((c) => c.id)
        ;[ids[index], ids[j]] = [ids[j], ids[index]]
        updateOrder.mutate({ pantryId, categoryIds: ids })
    }

    const openAdd = () => {
        setEmojiOpen(false)
        setDraft({ id: null, name: '', icon: '🍽️', isNonFood: false })
    }
    const openEdit = (c: ItemCategory) => {
        setEmojiOpen(false)
        setDraft({ id: c.id, name: c.name, icon: c.icon ?? '🍽️', isNonFood: c.isNonFood })
    }
    const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

    const save = () => {
        if (!draft || !pantryId || !draft.name.trim()) return
        const patch: ItemCategoryPatch = {
            ...(draft.id != null ? { id: draft.id } : {}),
            name: draft.name.trim(),
            icon: draft.icon,
            isNonFood: draft.isNonFood,
        }
        upsert.mutate({ pantryId, patch }, { onSuccess: () => setDraft(null) })
    }

    const confirmDelete = () => {
        if (!pendingDelete || !pantryId) return
        upsert.mutate(
            {
                pantryId,
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
            <div className="blob between">
                <div className="blob-actions">
                    <button
                        type="button"
                        className="fab"
                        aria-label="back"
                        onClick={() => navigate('/settings')}
                    >
                        <ChevronLeftIcon size={24} />
                    </button>
                    <button
                        type="button"
                        className="fab"
                        aria-label="add category"
                        onClick={openAdd}
                    >
                        <PlusIcon size={24} />
                    </button>
                </div>
            </div>

            <div className="content">
                <div className="detail-header">
                    <div className="detail-header-left">
                        <button
                            type="button"
                            className="btn-round"
                            aria-label="back"
                            onClick={() => navigate('/settings')}
                        >
                            <ChevronLeftIcon size={22} />
                        </button>
                        <h1 className="detail-title">categories</h1>
                    </div>
                    <button type="button" className="btn-primary" onClick={openAdd}>
                        <PlusIcon size={20} />
                        add category
                    </button>
                </div>

                <h1 className="detail-mobile-title">categories</h1>

                <div className="cat-edit-list">
                    {ordered.map((c, i) => (
                        <div className="cat-edit-row" key={c.id}>
                            <div className="cat-reorder">
                                <button
                                    type="button"
                                    className="reorder-btn"
                                    aria-label="move up"
                                    disabled={i === 0}
                                    onClick={() => move(i, -1)}
                                >
                                    <ChevronUpIcon size={15} />
                                </button>
                                <button
                                    type="button"
                                    className="reorder-btn"
                                    aria-label="move down"
                                    disabled={i === ordered.length - 1}
                                    onClick={() => move(i, 1)}
                                >
                                    <ChevronDownIcon size={15} />
                                </button>
                            </div>
                            <span className="cat-edit-emoji">{c.icon ?? '🍽️'}</span>
                            <span className="cat-edit-name">{c.name}</span>
                            {c.isNonFood && <span className="nonfood-badge">non-food</span>}
                            <button
                                type="button"
                                className="row-icon-btn edit"
                                aria-label="edit"
                                onClick={() => openEdit(c)}
                            >
                                <EditIcon size={20} />
                            </button>
                            <button
                                type="button"
                                className="row-icon-btn"
                                aria-label="delete"
                                onClick={() => setPendingDelete(c)}
                            >
                                <TrashIcon size={20} />
                            </button>
                        </div>
                    ))}

                    {ordered.length === 0 && (
                        <div className="empty-state">
                            <div className="emoji">🗂️</div>
                            <div className="title">no categories yet</div>
                            <div>Add one to organize your pantry and list.</div>
                        </div>
                    )}

                    <button type="button" className="btn-dashed block" onClick={openAdd}>
                        <PlusIcon size={18} />
                        add a category
                    </button>
                </div>
            </div>

            {draft && (
                <div className="sheet-overlay">
                    <div className="modal-scrim" onClick={() => setDraft(null)} />
                    <div className="sheet-card">
                        <div className="sheet-grabber" />
                        <div className="sheet-head">
                            <span className="sheet-title">
                                {isEdit ? 'edit category' : 'new category'}
                            </span>
                            <button
                                type="button"
                                className="sheet-save"
                                disabled={!draft.name.trim()}
                                onClick={save}
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
                                placeholder="produce"
                            />
                            <button
                                type="button"
                                className="cat-emoji-btn"
                                aria-label="choose emoji"
                                onClick={() => setEmojiOpen((o) => !o)}
                            >
                                {draft.icon}
                            </button>
                        </div>

                        {emojiOpen && (
                            <div className="emoji-panel">
                                <div className="emoji-grid">
                                    {EMOJIS.map((g) => (
                                        <button
                                            type="button"
                                            key={g}
                                            className={`emoji-cell${g === draft.icon ? ' active' : ''}`}
                                            onClick={() => {
                                                update({ icon: g })
                                                setEmojiOpen(false)
                                            }}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="toggle-row bordered">
                            <div>
                                <div style={{ fontSize: 18 }}>non-food category</div>
                                <div style={{ fontSize: 14, color: 'var(--ink-40)', marginTop: 2 }}>
                                    won’t affect cooking or pantry stock
                                </div>
                            </div>
                            <Switch
                                on={draft.isNonFood}
                                label="toggle non-food"
                                onChange={(on) => update({ isNonFood: on })}
                            />
                        </div>

                        {isEdit && (
                            <button
                                type="button"
                                className="sheet-delete"
                                onClick={() =>
                                    setPendingDelete({
                                        id: draft.id as number,
                                        name: draft.name,
                                    } as ItemCategory)
                                }
                            >
                                <TrashIcon size={20} />
                                delete category
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
                        <div className="modal-title">delete category?</div>
                        <div className="modal-text">
                            <strong>{pendingDelete.name}</strong> will be removed. Items in it
                            become uncategorized.
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
