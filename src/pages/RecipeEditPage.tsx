import { useEffect, useMemo, useRef, useState, type FocusEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SaveButton } from '../components/SaveButton'
import {
    AlertCircleIcon,
    CheckIcon,
    LinkIcon,
    MoreIcon,
    PlusIcon,
    TrashIcon,
    XIcon,
} from '../components/Icons'
import { SortableList, SortableRow } from '../components/Sortable'
import { useImportRecipe, useRecipe, useRecipeTags, useUpsertRecipe } from '../hooks/useRecipes'
import { hasTag, isNewTag, normalizeTag, resolveTag, suggestTags } from '../lib/tags'
import { mentionsOptional } from '../lib/recipeHelper'
import type { RecipePatch } from '../lib/types'

interface Row {
    id: string
    text: string
    /** Ingredients only (#60): doesn't count as missing when it's out of stock. */
    optional?: boolean
    /** The owner set `optional` by hand; until then it follows the text ("…, optional"). */
    optionalSet?: boolean
}

/** An ingredient row; optional follows the text unless the saved flag disagrees with it. */
const ingredientRow = (id: string, text: string, optional?: boolean): Row => {
    const detected = mentionsOptional(text)
    return {
        id,
        text,
        optional: optional ?? detected,
        optionalSet: optional != null && optional !== detected,
    }
}

const describeIngredient = (row: Row) => row.text.trim() || 'blank ingredient'
/** A step for the drag handle's label and screen-reader announcements. */
const describeStep = (row: Row) => {
    const text = row.text.trim()
    if (!text) return 'blank step'
    return text.length > 40 ? `step “${text.slice(0, 40)}…”` : `step “${text}”`
}

interface FormInitial {
    name: string
    prep: string
    cook: string
    servings: string
    ingredients: Row[]
    instructions: Row[]
    notes: string
    tags: string[]
}

/** Loads the recipe (edit) or seeds an empty form (new), then key-remounts the
 *  form so its initial state is set once without a setState-in-effect. */
export function RecipeEditPage() {
    const { id } = useParams()
    const recipeId = id ? Number(id) : undefined
    const { data: recipe, isLoading } = useRecipe(recipeId)

    if (recipeId == null) {
        return (
            <RecipeEditForm
                key="new"
                recipeId={undefined}
                initial={{
                    name: '',
                    prep: '',
                    cook: '',
                    servings: '',
                    ingredients: [{ id: 'ing0', text: '' }],
                    instructions: [{ id: 'ins0', text: '' }],
                    notes: '',
                    tags: [],
                }}
            />
        )
    }

    if (!recipe) {
        return (
            <div className="content edit">
                <div className="empty-state">
                    <div className="title">{isLoading ? 'loading…' : 'recipe not found'}</div>
                </div>
            </div>
        )
    }

    return (
        <RecipeEditForm
            key={recipe.id}
            recipeId={recipe.id}
            initial={{
                name: recipe.name,
                prep: recipe.prepTime ?? '',
                cook: recipe.cookTime ?? '',
                servings: recipe.servings ?? '',
                ingredients: (recipe.ingredients ?? []).map((i, n) =>
                    ingredientRow(`ing${n}`, i.sentence, i.optional),
                ),
                instructions: (recipe.instructions ?? []).map((t, n) => ({
                    id: `ins${n}`,
                    text: t,
                })),
                notes: recipe.notes ?? '',
                tags: (recipe.tags ?? []).map((t) => t.name),
            }}
        />
    )
}

function RecipeEditForm({
    recipeId,
    initial,
}: {
    recipeId: number | undefined
    initial: FormInitial
}) {
    const navigate = useNavigate()
    const upsertRecipe = useUpsertRecipe()
    const importRecipe = useImportRecipe()
    const seq = useRef(100)
    const nextId = (p: string) => `${p}${seq.current++}`

    const isNew = recipeId == null
    const title = isNew ? 'new recipe' : 'edit recipe'

    const [name, setName] = useState(initial.name)
    const [prep, setPrep] = useState(initial.prep)
    const [cook, setCook] = useState(initial.cook)
    const [servings, setServings] = useState(initial.servings)
    const [ingredients, setIngredients] = useState<Row[]>(
        initial.ingredients.length ? initial.ingredients : [{ id: 'ing0', text: '' }],
    )
    const [instructions, setInstructions] = useState<Row[]>(
        initial.instructions.length ? initial.instructions : [{ id: 'ins0', text: '' }],
    )
    const [notes, setNotes] = useState(initial.notes)
    const [tags, setTags] = useState<string[]>(initial.tags)
    /** Phones: the ingredient whose ⋯ menu (optional toggle) is open. */
    const [optMenu, setOptMenu] = useState<string | null>(null)
    useEffect(() => {
        if (!optMenu) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOptMenu(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [optMenu])
    /** Sets an ingredient optional (or not) by hand; it no longer follows the text. */
    const toggleOptional = (id: string) =>
        setIngredients((prev) =>
            prev.map((x) => (x.id === id ? { ...x, optional: !x.optional, optionalSet: true } : x)),
        )
    const [addingTag, setAddingTag] = useState(false)
    const [newTag, setNewTag] = useState('')
    const tagInputRef = useRef<HTMLInputElement>(null)
    const tagSuggestionsRef = useRef<HTMLDivElement>(null)
    const { data: householdTags } = useRecipeTags()
    const tagNames = useMemo(() => (householdTags ?? []).map((t) => t.name), [householdTags])
    const tagSuggestions = addingTag ? suggestTags(newTag, tagNames, tags) : []
    const canCreateTag = addingTag && isNewTag(newTag, tagNames, tags)
    // The tag field is at the bottom of the form: bring the suggestions into view
    // (above the bottom nav and the phone keyboard) when the picker opens.
    useEffect(() => {
        if (!addingTag) return
        const id = window.setTimeout(() => {
            const el = tagSuggestionsRef.current
            if (!el) return
            // Visible bottom: above the phone keyboard (visualViewport) and the bottom nav.
            const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect()
            const navHeight = nav && nav.top < window.innerHeight ? window.innerHeight - nav.top : 0
            const visibleBottom = (window.visualViewport?.height ?? window.innerHeight) - navHeight
            const overflow = el.getBoundingClientRect().bottom + 16 - visibleBottom
            if (overflow > 0) window.scrollBy({ top: overflow, behavior: 'smooth' })
        }, 250)
        return () => window.clearTimeout(id)
    }, [addingTag])

    const [importOpen, setImportOpen] = useState(false)
    const [importUrl, setImportUrl] = useState('')
    const [importError, setImportError] = useState('')

    // A recipe needs a name and at least one ingredient (empty rows are dropped
    // on save, so a blank ingredient list must not be saveable).
    const hasIngredient = ingredients.some((i) => i.text.trim().length > 0)
    const canSave = name.trim().length > 0 && hasIngredient

    /** Adds a tag, reusing the household's spelling when it already exists. */
    const addTag = (raw: string) => {
        const v = resolveTag(raw, tagNames)
        if (v) setTags((prev) => (hasTag(prev, v) ? prev : [...prev, v]))
    }
    const commitTag = () => {
        addTag(newTag)
        setNewTag('')
        setAddingTag(false)
    }
    /** A suggestion was picked: add it and keep the picker open for more. */
    const pickTag = (name: string) => {
        addTag(name)
        setNewTag('')
        tagInputRef.current?.focus()
    }
    /** Focus moving between the text box and its suggestions isn't leaving the picker. */
    const leavingTagPicker = (e: FocusEvent) =>
        !(e.relatedTarget as HTMLElement | null)?.closest('[data-tag-picker]')

    const save = async () => {
        if (!canSave) throw new Error('nothing to save')
        const patch: RecipePatch = {
            ...(recipeId != null ? { id: recipeId } : {}),
            name: name.trim(),
            prepTime: prep.trim(),
            cookTime: cook.trim(),
            servings: servings.trim(),
            ingredients: ingredients
                .filter((i) => i.text.trim())
                .map((i) => ({ sentence: i.text.trim(), optional: !!i.optional })),
            instructions: instructions.map((i) => i.text.trim()).filter(Boolean),
            notes: notes.trim() || null,
            tags: tags.map((t) => ({ name: t })),
        }
        return upsertRecipe.mutateAsync(patch)
    }

    const runImport = () => {
        const url = importUrl.trim()
        if (!url) {
            setImportError('Paste a recipe URL first.')
            return
        }
        setImportError('')
        importRecipe.mutate(url, {
            onSuccess: (data) => {
                if (!data) {
                    setImportError(
                        'Could not read a recipe from that link. Check the URL and try again.',
                    )
                    return
                }
                if (data.name) setName(data.name)
                if (data.prepTime) setPrep(data.prepTime)
                if (data.cookTime) setCook(data.cookTime)
                if (data.servings) setServings(data.servings)
                if (data.ingredients?.length) {
                    const optional = new Set(data.optionalIngredients ?? [])
                    setIngredients(
                        data.ingredients.map((t, i) =>
                            // An "Optional:" section marks its lines; others go by their text.
                            ingredientRow(nextId('ing'), t, optional.has(i) ? true : undefined),
                        ),
                    )
                }
                // Keep anything already typed in the notes.
                if (data.notes)
                    setNotes((prev) =>
                        prev.trim() ? `${prev.trim()}\n${data.notes}` : data.notes!,
                    )
                if (data.instructions?.length) {
                    setInstructions(data.instructions.map((t) => ({ id: nextId('ins'), text: t })))
                }
                setImportOpen(false)
                setImportUrl('')
            },
            onError: () =>
                setImportError(
                    'Could not read a recipe from that link. Check the URL and try again.',
                ),
        })
    }

    return (
        <>
            <div className="blob">
                <div className="blob-actions" />
            </div>

            <div className="content edit">
                {/* Sticky: the title and save stay reachable however far the form scrolls. */}
                <div className="edit-bar">
                    <h1 className="edit-title">{title}</h1>
                    <div className="edit-bar-actions">
                        {isNew && (
                            <button
                                type="button"
                                className="btn-text"
                                onClick={() => setImportOpen(true)}
                            >
                                import
                            </button>
                        )}
                        <SaveButton
                            onSave={save}
                            onSaved={(saved) => navigate(`/recipes/${saved.id}`)}
                            disabled={!canSave}
                        />
                    </div>
                </div>

                <div className="form-field">
                    <label className="form-label" htmlFor="r-name">
                        name
                    </label>
                    <input
                        id="r-name"
                        className="field"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="hot tamales"
                    />
                </div>

                <div className="meta-grid">
                    <div>
                        <label className="form-label" htmlFor="r-prep">
                            prep time
                        </label>
                        <input
                            id="r-prep"
                            className="field"
                            value={prep}
                            onChange={(e) => setPrep(e.target.value)}
                            placeholder="15 minutes"
                        />
                    </div>
                    <div>
                        <label className="form-label" htmlFor="r-cook">
                            cook time
                        </label>
                        <input
                            id="r-cook"
                            className="field"
                            value={cook}
                            onChange={(e) => setCook(e.target.value)}
                            placeholder="30 minutes"
                        />
                    </div>
                    <div>
                        <label className="form-label" htmlFor="r-serv">
                            servings
                        </label>
                        <input
                            id="r-serv"
                            className="field"
                            value={servings}
                            onChange={(e) => setServings(e.target.value)}
                            placeholder="5-6"
                        />
                    </div>
                </div>

                <div className="form-section">
                    <label className="form-label">ingredients</label>
                    <div className="edit-rows">
                        <SortableList
                            items={ingredients}
                            getId={(row) => row.id}
                            describe={describeIngredient}
                            onReorder={setIngredients}
                        >
                            {ingredients.map((row) => (
                                <SortableRow
                                    key={row.id}
                                    id={row.id}
                                    className="edit-row"
                                    label={describeIngredient(row)}
                                    disabled={ingredients.length < 2}
                                >
                                    <div className="ing-field">
                                        <input
                                            className="field"
                                            value={row.text}
                                            onChange={(e) =>
                                                setIngredients((prev) =>
                                                    prev.map((x) =>
                                                        x.id !== row.id
                                                            ? x
                                                            : {
                                                                  ...x,
                                                                  text: e.target.value,
                                                                  // Follows the text until set by hand.
                                                                  optional: x.optionalSet
                                                                      ? x.optional
                                                                      : mentionsOptional(
                                                                            e.target.value,
                                                                        ),
                                                              },
                                                    ),
                                                )
                                            }
                                            placeholder="1 cup flour"
                                        />
                                        {/* Phones show the state here; desktop has the pill. */}
                                        {row.optional && (
                                            <span className="opt-caption">optional</span>
                                        )}
                                    </div>
                                    {/* Desktop: the toggle itself. */}
                                    <button
                                        type="button"
                                        className={`opt-toggle${row.optional ? ' on' : ''}`}
                                        aria-pressed={!!row.optional}
                                        aria-label={`optional: ${describeIngredient(row)}`}
                                        title="optional: doesn't count as missing"
                                        onClick={() => toggleOptional(row.id)}
                                    >
                                        optional
                                    </button>
                                    {/* Phones: behind a ⋯ menu, to leave room for the text. */}
                                    <div className="opt-menu-wrap">
                                        <button
                                            type="button"
                                            className="opt-menu-btn"
                                            aria-label={`options: ${describeIngredient(row)}`}
                                            aria-haspopup="menu"
                                            aria-expanded={optMenu === row.id}
                                            onClick={() =>
                                                setOptMenu((open) =>
                                                    open === row.id ? null : row.id,
                                                )
                                            }
                                        >
                                            <MoreIcon size={20} />
                                        </button>
                                        {optMenu === row.id && (
                                            <>
                                                <div
                                                    className="menu-backdrop"
                                                    onClick={() => setOptMenu(null)}
                                                />
                                                <div className="opt-menu" role="menu">
                                                    <button
                                                        type="button"
                                                        role="menuitemcheckbox"
                                                        aria-checked={!!row.optional}
                                                        className="menu-item"
                                                        autoFocus
                                                        onClick={() => {
                                                            toggleOptional(row.id)
                                                            setOptMenu(null)
                                                        }}
                                                    >
                                                        <span className="opt-menu-text">
                                                            optional
                                                            <span className="hint">
                                                                doesn’t count as missing
                                                            </span>
                                                        </span>
                                                        <span
                                                            className={`opt-check${row.optional ? ' on' : ''}`}
                                                        >
                                                            {row.optional && (
                                                                <CheckIcon size={16} />
                                                            )}
                                                        </span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-remove"
                                        aria-label="remove ingredient"
                                        onClick={() =>
                                            setIngredients((prev) =>
                                                prev.filter((x) => x.id !== row.id),
                                            )
                                        }
                                    >
                                        <TrashIcon size={22} />
                                    </button>
                                </SortableRow>
                            ))}
                        </SortableList>
                        <button
                            type="button"
                            className="btn-dashed"
                            onClick={() =>
                                setIngredients((prev) => [...prev, { id: nextId('ing'), text: '' }])
                            }
                        >
                            <PlusIcon size={18} />
                            add ingredient
                        </button>
                    </div>
                </div>

                <div className="form-section">
                    <label className="form-label">instructions</label>
                    <div className="edit-rows">
                        <SortableList
                            items={instructions}
                            getId={(row) => row.id}
                            describe={describeStep}
                            onReorder={setInstructions}
                        >
                            {instructions.map((row) => (
                                <SortableRow
                                    key={row.id}
                                    id={row.id}
                                    className="edit-row top"
                                    label={describeStep(row)}
                                    disabled={instructions.length < 2}
                                >
                                    <textarea
                                        className="field"
                                        value={row.text}
                                        onChange={(e) =>
                                            setInstructions((prev) =>
                                                prev.map((x) =>
                                                    x.id === row.id
                                                        ? { ...x, text: e.target.value }
                                                        : x,
                                                ),
                                            )
                                        }
                                        placeholder="Preheat the oven…"
                                    />
                                    <button
                                        type="button"
                                        className="btn-remove top"
                                        aria-label="remove instruction"
                                        onClick={() =>
                                            setInstructions((prev) =>
                                                prev.filter((x) => x.id !== row.id),
                                            )
                                        }
                                    >
                                        <TrashIcon size={22} />
                                    </button>
                                </SortableRow>
                            ))}
                        </SortableList>
                        <button
                            type="button"
                            className="btn-dashed"
                            onClick={() =>
                                setInstructions((prev) => [
                                    ...prev,
                                    { id: nextId('ins'), text: '' },
                                ])
                            }
                        >
                            <PlusIcon size={18} />
                            add instruction
                        </button>
                    </div>
                </div>

                <div className="form-section">
                    <label className="form-label" htmlFor="r-notes">
                        notes
                    </label>
                    <textarea
                        id="r-notes"
                        className="field notes-field"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Use half the chili, double the garlic…"
                    />
                </div>

                <div className="form-section">
                    <label className="form-label">tags</label>
                    <div className="tag-wrap">
                        {tags.map((tag, i) => (
                            <span className="tag-pill" key={`${tag}-${i}`}>
                                {tag}
                                <button
                                    type="button"
                                    className="tag-remove"
                                    aria-label="remove tag"
                                    onClick={() =>
                                        setTags((prev) => prev.filter((_, j) => j !== i))
                                    }
                                >
                                    <XIcon size={11} />
                                </button>
                            </span>
                        ))}
                        {addingTag ? (
                            <input
                                ref={tagInputRef}
                                className="tag-input"
                                data-tag-picker
                                autoFocus
                                value={newTag}
                                placeholder="tag name"
                                aria-label="tag name"
                                onChange={(e) => setNewTag(e.target.value)}
                                onBlur={(e) => {
                                    if (leavingTagPicker(e)) commitTag()
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        commitTag()
                                    } else if (e.key === 'Escape') {
                                        setAddingTag(false)
                                        setNewTag('')
                                    }
                                }}
                            />
                        ) : (
                            <button
                                type="button"
                                className="btn-dashed pill"
                                onClick={() => {
                                    setNewTag('')
                                    setAddingTag(true)
                                }}
                            >
                                <PlusIcon size={16} />
                                add tag
                            </button>
                        )}
                    </div>
                    {(tagSuggestions.length > 0 || canCreateTag) && (
                        <div
                            ref={tagSuggestionsRef}
                            className="tag-suggestions"
                            data-tag-picker
                            role="group"
                            aria-label="tag suggestions"
                            onBlur={(e) => {
                                if (leavingTagPicker(e)) commitTag()
                            }}
                        >
                            {tagSuggestions.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className="tag-suggest"
                                    // Keep focus in the text box so it doesn't commit what's typed.
                                    onPointerDown={(e) => e.preventDefault()}
                                    onClick={() => pickTag(t)}
                                >
                                    {t}
                                </button>
                            ))}
                            {canCreateTag && (
                                <button
                                    type="button"
                                    className="tag-suggest create"
                                    onPointerDown={(e) => e.preventDefault()}
                                    onClick={() => pickTag(newTag)}
                                >
                                    <PlusIcon size={14} />
                                    create “{normalizeTag(newTag)}”
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {importOpen && (
                <div className="modal-backdrop" style={{ zIndex: 70 }}>
                    <div
                        className="modal-scrim"
                        onClick={() => !importRecipe.isPending && setImportOpen(false)}
                    />
                    <div className="modal-card wide">
                        <div className="import-head">
                            <div className="modal-badge info">
                                <LinkIcon size={24} />
                            </div>
                            <div className="import-title">import recipe</div>
                        </div>
                        <div className="import-body">
                            Paste a link to a recipe and we’ll pull out the ingredients, steps, and
                            details for you.
                        </div>
                        <input
                            className="field"
                            style={{ marginTop: 18 }}
                            type="url"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    runImport()
                                }
                            }}
                            placeholder="https://…"
                        />
                        {importError && (
                            <div className="import-error">
                                <AlertCircleIcon size={18} style={{ flex: 'none', marginTop: 1 }} />
                                <span>{importError}</span>
                            </div>
                        )}
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-chip"
                                onClick={() => setImportOpen(false)}
                            >
                                cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                style={{ flex: 1, justifyContent: 'center' }}
                                disabled={importRecipe.isPending}
                                onClick={runImport}
                            >
                                {importRecipe.isPending ? (
                                    <>
                                        <span className="spinner" />
                                        importing…
                                    </>
                                ) : (
                                    'import recipe'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
