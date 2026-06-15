// Port of InstructionHighlighter.swift — highlights ingredient mentions inside
// an instruction string using multi-word fuzzy phrase matching.

import { FuzzySearch, type FuzzyMatchResult } from './fuzzySearch'

export interface IngredientKeyword {
  keyword: string
  fullIngredient: string
}

export interface HighlightedSegment {
  id: string
  text: string
  isHighlighted: boolean
  match?: FuzzyMatchResult<IngredientKeyword>
}

const STOPWORDS = new Set<string>([
  'a', 'an', 'and', 'or', 'but', 'the', 'in', 'on', 'at', 'to', 'for',
  'with', 'from', 'of', 'by', 'as',
  'is', 'was', 'are', 'be', 'been', 'into', 'over', 'until', 'add',
  'heat', 'cook', 'stir', 'mix',
  'chop', 'dice', 'slice', 'pour', 'place', 'put', 'set', 'let', 'low',
  'medium', 'high', 'large',
  'small', 'more', 'less', 'cup', 'cups', 'tablespoon', 'tablespoons',
  'teaspoon', 'teaspoons',
  'tsp', 'tbsp', 'oz', 'ounce', 'ounces', 'pound', 'pounds', 'gram',
  'grams', 'liter', 'liters',
  'ml', 'lb', 'lbs', 'pinches', 'pinch', 'dash', 'finish', 'serve',
  'proof', 'melt', 'divide',
  'season', 'needed', 'spoon',
])

const MAX_PHRASE_LEN = 4
const WORD_RE = /^[\w'-]+$/
const PUNCT_RE = /^[^\w'-]+$/

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractIngredientKeywords(ingredients: string[]): IngredientKeyword[] {
  const seen = new Set<string>()
  const list: IngredientKeyword[] = []
  for (const full of ingredients) {
    const cleaned = full.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    const tokens = cleaned
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    for (const token of tokens) {
      const key = `${token}|${full}`
      if (!seen.has(key)) {
        seen.add(key)
        list.push({ keyword: token, fullIngredient: full })
      }
    }
  }
  return list
}

/**
 * Returns merged segments covering the full instruction, with matched
 * ingredient spans flagged isHighlighted (and carrying the matched keyword).
 */
export function highlight(
  ingredients: string[],
  instruction: string,
  threshold = 0.4,
): HighlightedSegment[] {
  const keywordMap = extractIngredientKeywords(ingredients)
  const fuse = new FuzzySearch(keywordMap, (k) => k.keyword)

  // Tokenize, keeping words, punctuation runs, and whitespace runs as tokens.
  const tokens = instruction.match(/\b[\w'-]+\b|[^\w\s]+|\s+/g) ?? []

  const result: HighlightedSegment[] = []
  let i = 0
  let segId = 0

  while (i < tokens.length) {
    const token = tokens[i]

    // Pass whitespace / punctuation straight through.
    if (token.trim() === '' || PUNCT_RE.test(token)) {
      result.push({ id: `s${segId++}`, text: token, isHighlighted: false })
      i += 1
      continue
    }

    let bestMatch: FuzzyMatchResult<IngredientKeyword> | undefined
    let bestLen = 0

    // Try phrases length 4→1; a passing shorter phrase overwrites (matches Swift).
    for (let len = MAX_PHRASE_LEN; len > 0; len--) {
      const window = tokens.slice(i, Math.min(i + len, tokens.length))
      const phraseTokens = window.filter((t) => WORD_RE.test(t))
      if (phraseTokens.length === 0) continue

      const phrase = phraseTokens.join(' ').toLowerCase()
      if (len === 1 && STOPWORDS.has(phrase)) continue

      const top = fuse.search(phrase, threshold)[0]
      if (!top) continue

      const keyword = top.item.keyword
      // The keyword must appear as a whole word within the phrase.
      if (!new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(phrase)) continue

      const words = phrase.split(' ')
      if (STOPWORDS.has(words[0])) continue
      if (STOPWORDS.has(words[words.length - 1])) continue

      bestMatch = top
      bestLen = len
    }

    if (bestMatch) {
      const matchedText = tokens.slice(i, i + bestLen).join('')
      result.push({ id: `s${segId++}`, text: matchedText, isHighlighted: true, match: bestMatch })
      i += bestLen
    } else {
      result.push({ id: `s${segId++}`, text: token, isHighlighted: false })
      i += 1
    }
  }

  // Merge adjacent segments of the same highlight state.
  const merged: HighlightedSegment[] = []
  for (const seg of result) {
    const last = merged[merged.length - 1]
    if (last && last.isHighlighted === seg.isHighlighted) {
      last.text += seg.text
      if (seg.isHighlighted && !last.match) last.match = seg.match
    } else {
      merged.push({ ...seg })
    }
  }
  return merged
}
