import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRecipe } from '../hooks/useRecipes'
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons'
import { highlight, type HighlightedSegment } from '../lib/instructionHighlighter'

/** Immersive, paginated cooking view with tappable ingredient highlights. */
export function BigModePage() {
  const { id } = useParams()
  const recipeId = id ? Number(id) : undefined
  const navigate = useNavigate()

  const recipeQuery = useRecipe(recipeId)
  const recipe = recipeQuery.data

  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<HighlightedSegment | null>(null)

  const instructions = useMemo(() => recipe?.instructions ?? [], [recipe])
  const ingredientSentences = useMemo(
    () => (recipe?.ingredients ?? []).map((i) => i.sentence),
    [recipe],
  )

  const segments = useMemo(() => {
    const text = instructions[page]
    if (!text) return []
    return highlight(ingredientSentences, text)
  }, [instructions, page, ingredientSentences])

  if (!recipe) {
    return <div className="bigmode bigmode-loading">loading…</div>
  }

  const total = instructions.length

  return (
    <div className="bigmode" onClick={() => setSelected(null)}>
      <button className="bigmode-close" type="button" aria-label="Close" onClick={() => navigate(`/recipes/${recipe.id}`)}>
        <CloseIcon size={28} />
      </button>

      <div className="bigmode-body">
        <span className="bigmode-num">{page + 1}</span>
        <p className="bigmode-text">
          {segments.map((seg) =>
            seg.isHighlighted ? (
              <button
                key={seg.id}
                className="bigmode-highlight"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(seg)
                }}
              >
                {seg.text}
              </button>
            ) : (
              <span key={seg.id}>{seg.text}</span>
            ),
          )}
        </p>
      </div>

      {selected?.match && (
        <div className="bigmode-popup" onClick={(e) => e.stopPropagation()}>
          {selected.match.item.fullIngredient}
        </div>
      )}

      <div className="bigmode-nav">
        <button type="button" disabled={page === 0} aria-label="Previous step" onClick={(e) => { e.stopPropagation(); setSelected(null); setPage((p) => Math.max(0, p - 1)) }}>
          <ChevronLeftIcon size={26} />
        </button>
        <span className="bigmode-progress">
          {page + 1} / {total}
        </span>
        <button type="button" disabled={page >= total - 1} aria-label="Next step" onClick={(e) => { e.stopPropagation(); setSelected(null); setPage((p) => Math.min(total - 1, p + 1)) }}>
          <ChevronRightIcon size={26} />
        </button>
      </div>
    </div>
  )
}
