import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CookIcon,
    EditIcon,
    ListIcon,
    MoreIcon,
    PlusIcon,
    ThumbDownIcon,
    ThumbUpIcon,
    TrashIcon,
    XIcon,
} from '../components/Icons'
import { useCompleteRecipe, useDeleteRecipe, useRecipe } from '../hooks/useRecipes'
import { usePantry, useUpsertPantryItem } from '../hooks/usePantry'
import { matchIngredientsToPantry, type PantryMatchedIngredient } from '../lib/recipeHelper'
import { highlight } from '../lib/instructionHighlighter'
import type { PantryItem, Rating, RecipeCompletion } from '../lib/types'

type IngStatus = 'stock' | 'list' | 'add'

function statusOf(item: PantryItem | null): IngStatus {
    if (item?.isInStock) return 'stock'
    if (item?.isInShoppingList) return 'list'
    return 'add'
}

const STATUS_LABEL: Record<IngStatus, string> = {
    stock: 'in stock',
    list: 'on shopping list',
    add: 'add to shopping list',
}

export function RecipeDetailPage() {
    const { id } = useParams()
    const recipeId = Number(id)
    const navigate = useNavigate()

    const { data: recipe, isLoading } = useRecipe(recipeId)
    const { data: pantry } = usePantry()
    const upsertItem = useUpsertPantryItem()
    const deleteRecipe = useDeleteRecipe()
    const completeRecipe = useCompleteRecipe()

    const [menuOpen, setMenuOpen] = useState(false)
    const [cookOpen, setCookOpen] = useState(false)
    const [stepIndex, setStepIndex] = useState(0)
    const [pendingDelete, setPendingDelete] = useState(false)
    const [madeOpen, setMadeOpen] = useState(false)
    const [verdict, setVerdict] = useState<'up' | 'down' | null>(null)
    const [finishedIds, setFinishedIds] = useState<Record<number, boolean>>({})
    const [toast, setToast] = useState<string | null>(null)

    const pantryItems = useMemo<PantryItem[]>(() => pantry?.pantryItems ?? [], [pantry])
    const matched = useMemo<PantryMatchedIngredient[]>(
        () => (recipe ? matchIngredientsToPantry(recipe, pantryItems) : []),
        [recipe, pantryItems],
    )
    const instructions = useMemo<string[]>(() => recipe?.instructions ?? [], [recipe])
    const ingredientStrings = useMemo<string[]>(
        () => (recipe?.ingredients ?? []).map((i) => i.sentence),
        [recipe],
    )
    /** Only pantry-backed ingredients can be "used up" → moved to the list. */
    const finishable = useMemo(() => matched.filter((m) => m.pantryItem), [matched])

    const total = instructions.length
    const cookSegments = useMemo(
        () => highlight(ingredientStrings, instructions[stepIndex] ?? ''),
        [ingredientStrings, instructions, stepIndex],
    )

    const step = useCallback(
        (delta: number) =>
            setStepIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0))),
        [total],
    )

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (pendingDelete) setPendingDelete(false)
                else if (madeOpen) setMadeOpen(false)
                else if (cookOpen) setCookOpen(false)
                else if (menuOpen) setMenuOpen(false)
            }
            if (cookOpen && e.key === 'ArrowRight') step(1)
            if (cookOpen && e.key === 'ArrowLeft') step(-1)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [pendingDelete, madeOpen, cookOpen, menuOpen, step])

    if (!recipe) {
        return (
            <div className="content detail">
                <div className="empty-state">
                    <div className="title">{isLoading ? 'loading…' : 'recipe not found'}</div>
                </div>
            </div>
        )
    }

    const toggleShop = (m: PantryMatchedIngredient) => {
        const status = statusOf(m.pantryItem)
        if (status === 'stock' || !pantry) return
        if (m.pantryItem) {
            const toList = status === 'add'
            upsertItem.mutate({
                pantryId: pantry.id,
                patch: {
                    id: m.pantryItem.id,
                    name: m.pantryItem.name,
                    isInShoppingList: toList,
                    ...(toList ? { isInStock: false } : {}),
                },
            })
        } else {
            upsertItem.mutate({
                pantryId: pantry.id,
                patch: { name: m.ingredient.item ?? m.ingredient.sentence, isInShoppingList: true },
            })
        }
    }

    const confirmDelete = () =>
        deleteRecipe.mutate(recipe.id, { onSuccess: () => navigate('/recipes') })

    const logMade = () => {
        const finished = finishable
            .filter((m) => m.pantryItem && finishedIds[m.pantryItem.id])
            .map((m) => m.pantryItem!.id)
        const rating: Rating | undefined =
            verdict === 'up' ? 1 : verdict === 'down' ? -1 : undefined
        const completion: RecipeCompletion = {
            recipeId: recipe.id,
            ...(rating !== undefined ? { rating } : {}),
            finishedPantryItems: finished,
        }
        completeRecipe.mutate({ recipeId: recipe.id, completion })
        const emoji = verdict === 'up' ? '👍 · ' : verdict === 'down' ? '👎 · ' : ''
        setToast(
            `cooked! ${emoji}${finished.length ? `${finished.length} moved to list` : 'logged'}`,
        )
        setMadeOpen(false)
        window.setTimeout(() => setToast(null), 3200)
    }

    const finCount = Object.values(finishedIds).filter(Boolean).length
    const ratingLabel =
        verdict === 'up' ? 'loved it' : verdict === 'down' ? 'not for me' : 'tap to react'

    const moreMenu = (
        <>
            <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="more-menu" role="menu">
                <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                        setMenuOpen(false)
                        setMadeOpen(true)
                    }}
                >
                    <span className="lead">
                        <CheckIcon size={20} />
                    </span>
                    I made this
                </button>
                <button
                    type="button"
                    className="menu-item"
                    onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                >
                    <EditIcon size={20} />
                    edit recipe
                </button>
                <button
                    type="button"
                    className="menu-item danger"
                    onClick={() => {
                        setMenuOpen(false)
                        setPendingDelete(true)
                    }}
                >
                    <TrashIcon size={20} />
                    delete recipe
                </button>
            </div>
        </>
    )

    return (
        <>
            <div className="blob between">
                <div className="blob-actions">
                    <button
                        type="button"
                        className="fab"
                        aria-label="back"
                        onClick={() => navigate('/recipes')}
                    >
                        <ChevronLeftIcon size={24} />
                    </button>
                    <button
                        type="button"
                        className="fab"
                        aria-label="more"
                        onClick={() => setMenuOpen((o) => !o)}
                    >
                        <MoreIcon size={22} />
                    </button>
                </div>
            </div>

            <div className="content detail">
                <div className="detail-header">
                    <div className="detail-header-left">
                        <button
                            type="button"
                            className="btn-round"
                            aria-label="back"
                            onClick={() => navigate('/recipes')}
                        >
                            <ChevronLeftIcon size={22} />
                        </button>
                        <h1 className="detail-title">{recipe.name}</h1>
                    </div>
                    <div className="detail-actions">
                        <button
                            type="button"
                            className="btn-outline"
                            onClick={() => setMadeOpen(true)}
                        >
                            <CheckIcon size={20} style={{ color: 'var(--stocked)' }} />I made this
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => {
                                setStepIndex(0)
                                setCookOpen(true)
                            }}
                        >
                            <CookIcon size={20} />
                            cook mode
                        </button>
                        <button
                            type="button"
                            className="btn-round"
                            aria-label="more"
                            onClick={() => setMenuOpen((o) => !o)}
                        >
                            <MoreIcon size={22} />
                        </button>
                    </div>
                </div>

                <h1 className="detail-mobile-title">{recipe.name}</h1>

                <div className="stats-row">
                    <div>
                        <div className="stat-label">prep time</div>
                        <div className="stat-value">{recipe.prepTime || '—'}</div>
                    </div>
                    <div>
                        <div className="stat-label">cook time</div>
                        <div className="stat-value">{recipe.cookTime || '—'}</div>
                    </div>
                    <div>
                        <div className="stat-label">servings</div>
                        <div className="stat-value">{recipe.servings || '—'}</div>
                    </div>
                </div>

                <div className="detail-grid">
                    <div className="ingredients-col">
                        <div className="col-head">
                            <h2>ingredients</h2>
                            <span className="col-hint">tap to shop</span>
                        </div>
                        <div className="ingredient-card">
                            {matched.length === 0 && (
                                <div className="ingredient-row">
                                    <span className="text" style={{ color: 'var(--ink-40)' }}>
                                        no ingredients
                                    </span>
                                </div>
                            )}
                            {matched.map((m) => {
                                const status = statusOf(m.pantryItem)
                                return (
                                    <div className="ingredient-row" key={m.ingredient.id}>
                                        <span className="text">{m.ingredient.sentence}</span>
                                        <button
                                            type="button"
                                            className={`ing-status ${status}`}
                                            aria-label={STATUS_LABEL[status]}
                                            title={STATUS_LABEL[status]}
                                            onClick={() => toggleShop(m)}
                                        >
                                            {status === 'stock' && <CheckIcon size={18} />}
                                            {status === 'list' && <ListIcon size={17} />}
                                            {status === 'add' && <PlusIcon size={18} />}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <div className="col-head">
                            <h2>instructions</h2>
                            <button
                                type="button"
                                className="btn-cook-mobile"
                                onClick={() => {
                                    setStepIndex(0)
                                    setCookOpen(true)
                                }}
                            >
                                <CookIcon size={19} />
                                cook mode
                            </button>
                        </div>
                        <div className="steps">
                            {instructions.map((text, i) => (
                                <button
                                    type="button"
                                    className="step"
                                    key={i}
                                    onClick={() => {
                                        setStepIndex(i)
                                        setCookOpen(true)
                                    }}
                                >
                                    <span className="num">{i + 1}</span>
                                    <p className="text">{text}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {menuOpen && moreMenu}

            {cookOpen && (
                <div className="cook-overlay">
                    <button
                        type="button"
                        className="cook-close"
                        aria-label="close"
                        onClick={() => setCookOpen(false)}
                    >
                        <XIcon size={22} />
                    </button>
                    <div className="cook-body">
                        <div className="cook-num">{stepIndex + 1}</div>
                        <p className="cook-text">
                            {cookSegments.map((seg) => (
                                <span key={seg.id} className={seg.isHighlighted ? 'kw' : undefined}>
                                    {seg.text}
                                </span>
                            ))}
                        </p>
                    </div>
                    <div className="cook-foot">
                        <button
                            type="button"
                            className="cook-nav"
                            aria-label="previous"
                            disabled={stepIndex <= 0}
                            onClick={() => step(-1)}
                        >
                            <ChevronLeftIcon size={22} />
                        </button>
                        <span className="cook-counter">
                            {stepIndex + 1} / {total}
                        </span>
                        <button
                            type="button"
                            className="cook-nav"
                            aria-label="next"
                            disabled={stepIndex >= total - 1}
                            onClick={() => step(1)}
                        >
                            <ChevronRightIcon size={22} />
                        </button>
                    </div>
                </div>
            )}

            {pendingDelete && (
                <div className="modal-backdrop">
                    <div className="modal-scrim" onClick={() => setPendingDelete(false)} />
                    <div className="modal-card">
                        <div className="modal-badge danger">
                            <TrashIcon size={26} />
                        </div>
                        <div className="modal-title">delete recipe?</div>
                        <div className="modal-text">
                            <strong>{recipe.name}</strong> will be permanently removed. This can’t
                            be undone.
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-chip"
                                style={{ flex: 1 }}
                                onClick={() => setPendingDelete(false)}
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={deleteRecipe.isPending}
                                onClick={confirmDelete}
                            >
                                delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {madeOpen && (
                <div className="made-overlay">
                    <div className="modal-scrim" onClick={() => setMadeOpen(false)} />
                    <div className="made-card">
                        <div className="made-head">
                            <div>
                                <div className="h">you made this!</div>
                                <div className="sub">{recipe.name}</div>
                            </div>
                            <button
                                type="button"
                                className="made-close"
                                aria-label="close"
                                onClick={() => setMadeOpen(false)}
                            >
                                <XIcon size={20} />
                            </button>
                        </div>

                        <div className="made-section">
                            <div className="section-label">how was it?</div>
                            <div className="rating-row">
                                <button
                                    type="button"
                                    className={`thumb up${verdict === 'up' ? ' active' : ''}`}
                                    aria-label="thumbs up"
                                    onClick={() => setVerdict((v) => (v === 'up' ? null : 'up'))}
                                >
                                    <ThumbUpIcon size={24} />
                                </button>
                                <button
                                    type="button"
                                    className={`thumb down${verdict === 'down' ? ' active' : ''}`}
                                    aria-label="thumbs down"
                                    onClick={() =>
                                        setVerdict((v) => (v === 'down' ? null : 'down'))
                                    }
                                >
                                    <ThumbDownIcon size={24} />
                                </button>
                                <span className="rating-label">{ratingLabel}</span>
                            </div>
                        </div>

                        {finishable.length > 0 && (
                            <div className="made-section">
                                <div className="finished-head">
                                    <div className="section-label">used anything up?</div>
                                    <span className="col-hint">
                                        {finCount === 0 ? 'none yet' : `${finCount} marked`}
                                    </span>
                                </div>
                                <div className="finished-sub">
                                    tick what you finished — we’ll move it to your shopping list.
                                </div>
                                <div className="finished-list">
                                    <div className="finished-scroll">
                                        {finishable.map((m) => {
                                            const pid = m.pantryItem!.id
                                            const done = !!finishedIds[pid]
                                            return (
                                                <button
                                                    type="button"
                                                    key={m.ingredient.id}
                                                    className={`finished-row${done ? ' done' : ''}`}
                                                    onClick={() =>
                                                        setFinishedIds((f) => ({
                                                            ...f,
                                                            [pid]: !f[pid],
                                                        }))
                                                    }
                                                >
                                                    <span className="finished-check">
                                                        {done && <CheckIcon size={15} />}
                                                    </span>
                                                    <span className="label">
                                                        {m.ingredient.sentence}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="made-actions">
                            <button
                                type="button"
                                className="btn-chip"
                                onClick={() => setMadeOpen(false)}
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                disabled={completeRecipe.isPending}
                                onClick={logMade}
                            >
                                log it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="toast">
                    <span className="toast-check">
                        <CheckIcon size={18} />
                    </span>
                    <span className="text">{toast}</span>
                </div>
            )}
        </>
    )
}
