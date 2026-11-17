import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CookIcon,
    EditIcon,
    ListIcon,
    MoreIcon,
    NoteIcon,
    PlusIcon,
    ThumbDownIcon,
    ThumbUpIcon,
    TrashIcon,
    XIcon,
} from '../components/Icons'
import { useCompleteRecipe, useDeleteRecipe, useRecipe } from '../hooks/useRecipes'
import { usePantry, useUpsertPantryItem } from '../hooks/usePantry'
import {
    ingredientKey,
    matchIngredientsToPantry,
    normalizeIngredientName,
    type PantryMatchedIngredient,
} from '../lib/recipeHelper'
import { IngredientMatchSheet } from '../components/IngredientMatchSheet'
import { datedNote } from '../lib/notes'
import { useIngredientLinks } from '../hooks/useIngredientLinks'
import {
    highlight,
    mergeIngredientMentions,
    splitTimeMentions,
    type HighlightedSegment,
} from '../lib/instructionHighlighter'
import { DEFAULT_STEP, SCALE_STEPS, scaleIngredient, scaleServings } from '../lib/scale'
import { formatDuration, startTimer } from '../lib/timers'
import { useWakeLock } from '../hooks/useWakeLock'
import type { PantryItem, Rating, RecipeCompletion } from '../lib/types'

type IngStatus = 'stock' | 'low' | 'list' | 'add' | 'untracked'

function statusOf(m: PantryMatchedIngredient): IngStatus {
    if (m.untracked) return 'untracked'
    const item = m.pantryItem
    if (item?.isInStock && !item.isLow) return 'stock'
    if (item?.isInShoppingList) return 'list'
    if (item?.isInStock && item.isLow) return 'low'
    return 'add'
}

/** The ingredient popover in cook mode, anchored to the word that opened it. */
interface IngredientPopover {
    segId: string
    step: number
    text: string
    anchor: DOMRect
    /** Opened by a tap or click, so it stays open until dismissed (not just on hover). */
    pinned: boolean
}

const STATUS_LABEL: Record<IngStatus, string> = {
    stock: 'in stock',
    low: 'running low — add to shopping list',
    list: 'on shopping list',
    add: 'add to shopping list',
    untracked: 'always have (not tracked)',
}

/** What a row says about its match when it isn't obvious from its own name. */
function matchNote(m: PantryMatchedIngredient): string | null {
    if (m.untracked) return 'always have'
    if (!m.pantryItem) return null
    return normalizeIngredientName(m.pantryItem.name) === ingredientKey(m.ingredient)
        ? null
        : `pantry: ${m.pantryItem.name}`
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
    const [matching, setMatching] = useState<PantryMatchedIngredient | null>(null)
    const { data: linkData } = useIngredientLinks()
    const [cookOpen, setCookOpen] = useState(false)
    const [stepIndex, setStepIndex] = useState(0)
    const [pendingDelete, setPendingDelete] = useState(false)
    const [madeOpen, setMadeOpen] = useState(false)
    const [verdict, setVerdict] = useState<'up' | 'down' | null>(null)
    /** "I made this": an optional line for the recipe's notes. */
    const [madeNote, setMadeNote] = useState('')
    /** Cook mode: the recipe's notes are shown over the step. */
    const [cookNotesOpen, setCookNotesOpen] = useState(false)
    /** "I made this": pantry items now running low or used up, by pantry item id. */
    const [usage, setUsage] = useState<Record<number, 'low' | 'out'>>({})
    const toggleUsage = (pid: number, value: 'low' | 'out') =>
        setUsage((u) => {
            const next = { ...u }
            if (next[pid] === value) delete next[pid]
            else next[pid] = value
            return next
        })
    const [toast, setToast] = useState<string | null>(null)
    // Scale index into SCALE_STEPS. Not persisted: every visit opens at 1×.
    const [scaleIndex, setScaleIndex] = useState(DEFAULT_STEP)
    const [scaledFor, setScaledFor] = useState(recipeId)
    if (scaledFor !== recipeId) {
        setScaledFor(recipeId)
        setScaleIndex(DEFAULT_STEP)
    }
    const scaleStep = SCALE_STEPS[scaleIndex]
    const isScaled = scaleIndex !== DEFAULT_STEP

    const pantryItems = useMemo<PantryItem[]>(() => pantry?.pantryItems ?? [], [pantry])
    const matched = useMemo<PantryMatchedIngredient[]>(
        () => (recipe ? matchIngredientsToPantry(recipe, pantryItems, linkData ?? []) : []),
        [recipe, pantryItems, linkData],
    )
    const instructions = useMemo<string[]>(() => recipe?.instructions ?? [], [recipe])
    /** Each ingredient's line at the current scale, by ingredient id. */
    const scaledLines = useMemo(
        () =>
            new Map(
                (recipe?.ingredients ?? []).map((i) => [
                    i.id,
                    scaleIngredient(i.sentence, scaleStep),
                ]),
            ),
        [recipe, scaleStep],
    )
    const lineFor = (ingredientId: number, fallback: string) =>
        scaledLines.get(ingredientId)?.text ?? fallback
    const ingredientStrings = useMemo<string[]>(
        () => [...scaledLines.values()].map((l) => l.text),
        [scaledLines],
    )
    /** Only pantry-backed ingredients can be "used up" → moved to the list. */
    const finishable = useMemo(() => matched.filter((m) => m.pantryItem), [matched])

    const total = instructions.length
    const cookSegments = useMemo(
        () =>
            splitTimeMentions(
                mergeIngredientMentions(
                    highlight(ingredientStrings, instructions[stepIndex] ?? ''),
                ),
            ),
        [ingredientStrings, instructions, stepIndex],
    )
    const [popover, setPopover] = useState<IngredientPopover | null>(null)
    // Keep the screen on for the whole of cook mode.
    useWakeLock(cookOpen)
    const popoverRef = useRef<HTMLDivElement>(null)
    // The popover belongs to the step it was opened on; changing steps hides it.
    const shownPopover = cookOpen && popover?.step === stepIndex ? popover : null

    const openPopover = (seg: HighlightedSegment, el: HTMLElement, pinned: boolean) => {
        if (!seg.match) return
        setPopover({
            segId: seg.id,
            step: stepIndex,
            text: seg.match.item.fullIngredient,
            anchor: el.getBoundingClientRect(),
            pinned,
        })
    }
    /** Tap or click: pin the popover open, or close it if it's already pinned. */
    const togglePopover = (seg: HighlightedSegment, el: HTMLElement) => {
        if (shownPopover?.segId === seg.id && shownPopover.pinned) setPopover(null)
        else openPopover(seg, el, true)
    }
    const closeUnpinned = (segId: string) =>
        setPopover((p) => (p && p.segId === segId && !p.pinned ? null : p))

    // Place the popover under its word (above it near the bottom of the screen),
    // kept inside the viewport.
    useLayoutEffect(() => {
        const el = popoverRef.current
        if (!el || !shownPopover) return
        const { anchor } = shownPopover
        const margin = 12
        const left = Math.min(
            Math.max(anchor.left + anchor.width / 2 - el.offsetWidth / 2, margin),
            window.innerWidth - el.offsetWidth - margin,
        )
        const below = anchor.bottom + 10
        const top =
            below + el.offsetHeight > window.innerHeight - margin
                ? anchor.top - el.offsetHeight - 10
                : below
        el.style.left = `${left}px`
        el.style.top = `${top}px`
    }, [shownPopover])

    const step = useCallback(
        (delta: number) =>
            setStepIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0))),
        [total],
    )

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (shownPopover) setPopover(null)
                else if (cookOpen && cookNotesOpen) setCookNotesOpen(false)
                else if (pendingDelete) setPendingDelete(false)
                else if (madeOpen) setMadeOpen(false)
                else if (cookOpen) setCookOpen(false)
                else if (menuOpen) setMenuOpen(false)
            }
            if (cookOpen && e.key === 'ArrowRight') step(1)
            if (cookOpen && e.key === 'ArrowLeft') step(-1)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [shownPopover, pendingDelete, madeOpen, cookOpen, cookNotesOpen, menuOpen, step])

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
        const status = statusOf(m)
        if (status === 'stock' || status === 'untracked' || !pantry) return
        if (m.pantryItem) {
            // A low item goes on the list but stays in stock (there's still some).
            const toList = status === 'add' || status === 'low'
            upsertItem.mutate({
                pantryId: pantry.id,
                patch: {
                    id: m.pantryItem.id,
                    name: m.pantryItem.name,
                    isInShoppingList: toList,
                    ...(status === 'add' ? { isInStock: false } : {}),
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
            .filter((m) => m.pantryItem && usage[m.pantryItem.id] === 'out')
            .map((m) => m.pantryItem!.id)
        const low = finishable
            .filter((m) => m.pantryItem && usage[m.pantryItem.id] === 'low')
            .map((m) => m.pantryItem!.id)
        const rating: Rating | undefined =
            verdict === 'up' ? 1 : verdict === 'down' ? -1 : undefined
        const completion: RecipeCompletion = {
            recipeId: recipe.id,
            ...(rating !== undefined ? { rating } : {}),
            finishedPantryItems: finished,
            ...(low.length ? { lowPantryItems: low } : {}),
            ...(madeNote.trim() ? { note: datedNote(madeNote) } : {}),
        }
        completeRecipe.mutate({ recipeId: recipe.id, completion })
        const emoji = verdict === 'up' ? '👍 · ' : verdict === 'down' ? '👎 · ' : ''
        setToast(
            `cooked! ${emoji}${
                [
                    finished.length && `${finished.length} used up`,
                    low.length && `${low.length} low`,
                    madeNote.trim() && 'note added',
                ]
                    .filter(Boolean)
                    .join(', ') || 'logged'
            }`,
        )
        setMadeOpen(false)
        setUsage({})
        setMadeNote('')
        window.setTimeout(() => setToast(null), 3200)
    }

    const finCount = Object.keys(usage).length
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
                        setStepIndex(0)
                        setCookOpen(true)
                    }}
                >
                    <CookIcon size={20} />
                    cook mode
                </button>
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
                        <div
                            className={`stat-value${isScaled && recipe.servings ? ' scaled' : ''}`}
                        >
                            {recipe.servings ? scaleServings(recipe.servings, scaleStep) : '—'}
                        </div>
                    </div>
                </div>

                <div className="scale-row">
                    <span className="stat-label" id="scale-label">
                        scale
                    </span>
                    <div className="seg scale-seg" role="radiogroup" aria-labelledby="scale-label">
                        {SCALE_STEPS.map((s, i) => (
                            <button
                                key={s.label}
                                type="button"
                                role="radio"
                                aria-label={s.name}
                                aria-checked={i === scaleIndex}
                                className={i === scaleIndex ? 'active' : undefined}
                                onClick={() => setScaleIndex(i)}
                            >
                                {s.label}
                            </button>
                        ))}
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
                                const status = statusOf(m)
                                const note = matchNote(m)
                                return (
                                    <div className="ingredient-row" key={m.ingredient.id}>
                                        {/* Tap to fix how it matches the pantry (#39). */}
                                        <button
                                            type="button"
                                            className="text ing-text"
                                            aria-label={`${lineFor(m.ingredient.id, m.ingredient.sentence)}: change pantry match`}
                                            onClick={() => setMatching(m)}
                                        >
                                            {lineFor(m.ingredient.id, m.ingredient.sentence)}
                                            {scaledLines.get(m.ingredient.id)?.scaled === false && (
                                                <span className="unscaled"> · not scaled</span>
                                            )}
                                            {note && <span className="ing-match">{note}</span>}
                                        </button>
                                        <button
                                            type="button"
                                            className={`ing-status ${status}`}
                                            aria-label={STATUS_LABEL[status]}
                                            title={STATUS_LABEL[status]}
                                            onClick={() => toggleShop(m)}
                                        >
                                            {status === 'stock' && <CheckIcon size={18} />}
                                            {status === 'low' && (
                                                <span className="low-mark">low</span>
                                            )}
                                            {status === 'list' && <ListIcon size={17} />}
                                            {status === 'add' && <PlusIcon size={18} />}
                                            {status === 'untracked' && <CheckIcon size={18} />}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                        {recipe.notes && (
                            <section className="notes-block" aria-labelledby="notes-head">
                                <div className="col-head">
                                    <h2 id="notes-head">notes</h2>
                                </div>
                                <p className="notes-card">{recipe.notes}</p>
                            </section>
                        )}
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

            {matching && (
                <IngredientMatchSheet
                    match={matching}
                    line={lineFor(matching.ingredient.id, matching.ingredient.sentence)}
                    pantryItems={pantryItems}
                    onClose={() => setMatching(null)}
                />
            )}

            {cookOpen && (
                <div
                    className="cook-overlay"
                    onPointerDown={(e) => {
                        const target = e.target as HTMLElement
                        if (shownPopover && !target.closest('.kw, .kw-popover')) setPopover(null)
                    }}
                >
                    <div className="cook-top">
                        {recipe.notes ? (
                            <button
                                type="button"
                                className={`cook-notes-btn${cookNotesOpen ? ' on' : ''}`}
                                aria-expanded={cookNotesOpen}
                                aria-controls="cook-notes"
                                onClick={() => setCookNotesOpen((o) => !o)}
                            >
                                <NoteIcon size={18} />
                                notes
                            </button>
                        ) : (
                            <span />
                        )}
                        <button
                            type="button"
                            className="cook-close"
                            aria-label="close"
                            onClick={() => {
                                setCookOpen(false)
                                setCookNotesOpen(false)
                            }}
                        >
                            <XIcon size={22} />
                        </button>
                    </div>
                    {cookNotesOpen && recipe.notes && (
                        <div
                            id="cook-notes"
                            className="cook-notes"
                            role="region"
                            aria-label="notes"
                        >
                            {recipe.notes}
                        </div>
                    )}
                    <div className="cook-body">
                        <div className="cook-num">{stepIndex + 1}</div>
                        <p className="cook-text">
                            {cookSegments.map((seg) => {
                                if (seg.time) {
                                    const seconds = seg.time.seconds
                                    return (
                                        <button
                                            key={seg.id}
                                            type="button"
                                            className="kw-time"
                                            aria-label={`start a ${seg.text} timer`}
                                            onClick={() =>
                                                startTimer({
                                                    key: `${recipe.id}:${stepIndex}:${seg.text}`,
                                                    label: `step ${stepIndex + 1} · ${formatDuration(seconds)}`,
                                                    detail: recipe.name,
                                                    recipeId: recipe.id,
                                                    seconds,
                                                })
                                            }
                                        >
                                            {seg.text}
                                        </button>
                                    )
                                }
                                if (!seg.isHighlighted || !seg.match) {
                                    return <span key={seg.id}>{seg.text}</span>
                                }
                                const open = shownPopover?.segId === seg.id
                                return (
                                    <button
                                        key={seg.id}
                                        type="button"
                                        className={`kw${open ? ' open' : ''}`}
                                        aria-expanded={open}
                                        aria-describedby={open ? 'kw-popover' : undefined}
                                        onPointerEnter={(e) => {
                                            if (e.pointerType === 'mouse') {
                                                openPopover(seg, e.currentTarget, false)
                                            }
                                        }}
                                        onPointerLeave={(e) => {
                                            if (e.pointerType === 'mouse') closeUnpinned(seg.id)
                                        }}
                                        onFocus={(e) => {
                                            if (!open) openPopover(seg, e.currentTarget, false)
                                        }}
                                        onBlur={() => closeUnpinned(seg.id)}
                                        onClick={(e) => togglePopover(seg, e.currentTarget)}
                                    >
                                        {seg.text}
                                    </button>
                                )
                            })}
                        </p>
                    </div>
                    {shownPopover && (
                        <div id="kw-popover" role="tooltip" className="kw-popover" ref={popoverRef}>
                            {shownPopover.text}
                        </div>
                    )}
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
                            {isScaled && (
                                <span className="cook-scale"> · {scaleStep.label} recipe</span>
                            )}
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

                        <div className="made-section">
                            <label className="section-label" htmlFor="made-note">
                                anything to remember?
                            </label>
                            <textarea
                                id="made-note"
                                className="field made-note"
                                rows={2}
                                maxLength={900}
                                value={madeNote}
                                onChange={(e) => setMadeNote(e.target.value)}
                                placeholder="needed 5 more minutes…"
                            />
                            <div className="finished-sub">
                                added to the recipe’s notes, with today’s date.
                            </div>
                        </div>

                        {finishable.length > 0 && (
                            <div className="made-section">
                                <div className="finished-head">
                                    <div className="section-label">running low or used up?</div>
                                    <span className="col-hint">
                                        {finCount === 0 ? 'none yet' : `${finCount} marked`}
                                    </span>
                                </div>
                                <div className="finished-sub">
                                    mark what’s running low or finished. finished staples go on your
                                    shopping list.
                                </div>
                                <div className="finished-list">
                                    <div className="finished-scroll">
                                        {finishable.map((m) => {
                                            const pid = m.pantryItem!.id
                                            const state = usage[pid]
                                            return (
                                                <div
                                                    key={m.ingredient.id}
                                                    className={`finished-row${state ? ` ${state}` : ''}`}
                                                >
                                                    <span className="label">
                                                        {lineFor(
                                                            m.ingredient.id,
                                                            m.ingredient.sentence,
                                                        )}
                                                    </span>
                                                    <span className="usage-pills">
                                                        <button
                                                            type="button"
                                                            className={`usage-pill low${state === 'low' ? ' on' : ''}`}
                                                            aria-pressed={state === 'low'}
                                                            onClick={() => toggleUsage(pid, 'low')}
                                                        >
                                                            low
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`usage-pill out${state === 'out' ? ' on' : ''}`}
                                                            aria-pressed={state === 'out'}
                                                            onClick={() => toggleUsage(pid, 'out')}
                                                        >
                                                            used up
                                                        </button>
                                                    </span>
                                                </div>
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
