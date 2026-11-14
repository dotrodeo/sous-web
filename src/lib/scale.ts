// Recipe scaling: rewrites the amount at the start of an ingredient line ("1 1/2
// cups flour", "½ tsp salt", "2-3 cloves garlic") and the number in a servings
// string, using exact fractions so e.g. ⅓ × 1½ cups is exactly ½ cup.

export interface ScaleStep {
    label: string
    /** Spoken name for screen readers. */
    name: string
    num: number
    den: number
}

/** The scale control's steps, as in the original app. */
export const SCALE_STEPS: ScaleStep[] = [
    { label: '¼', name: 'quarter', num: 1, den: 4 },
    { label: '⅓', name: 'third', num: 1, den: 3 },
    { label: '½', name: 'half', num: 1, den: 2 },
    { label: '1×', name: 'original', num: 1, den: 1 },
    { label: '1½', name: 'one and a half', num: 3, den: 2 },
    { label: '2×', name: 'double', num: 2, den: 1 },
    { label: '3×', name: 'triple', num: 3, den: 1 },
]
export const DEFAULT_STEP = 3

interface Frac {
    n: number
    d: number
}

const GLYPHS: Record<string, Frac> = {
    '¼': { n: 1, d: 4 },
    '½': { n: 1, d: 2 },
    '¾': { n: 3, d: 4 },
    '⅓': { n: 1, d: 3 },
    '⅔': { n: 2, d: 3 },
    '⅕': { n: 1, d: 5 },
    '⅖': { n: 2, d: 5 },
    '⅗': { n: 3, d: 5 },
    '⅘': { n: 4, d: 5 },
    '⅙': { n: 1, d: 6 },
    '⅚': { n: 5, d: 6 },
    '⅛': { n: 1, d: 8 },
    '⅜': { n: 3, d: 8 },
    '⅝': { n: 5, d: 8 },
    '⅞': { n: 7, d: 8 },
}
const GLYPH_CLASS = Object.keys(GLYPHS).join('')
/** Glyphs used when writing amounts back out, keyed by "n/d". */
const OUT_GLYPHS: Record<string, string> = {
    '1/2': '½',
    '1/3': '⅓',
    '2/3': '⅔',
    '1/4': '¼',
    '3/4': '¾',
    '1/8': '⅛',
    '3/8': '⅜',
    '5/8': '⅝',
    '7/8': '⅞',
}

// One quantity: "1 1/2", "1/2", "1½" or "1 ½", "½", "1.5", "2".
const QTY = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+\s?[${GLYPH_CLASS}]|[${GLYPH_CLASS}]|\d+(?:\.\d+)?)`
const RANGE_SEP = String.raw`\s*(?:-|–|—|to)\s*`
const LEADING_AMOUNT = new RegExp(`^(\\s*)(${QTY})(?:(${RANGE_SEP})(${QTY}))?`)
const ANY_AMOUNT = new RegExp(`(${QTY})(?:(${RANGE_SEP})(${QTY}))?`)
const HAS_NUMBER = new RegExp(`[0-9${GLYPH_CLASS}]`)

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const reduce = ({ n, d }: Frac): Frac => {
    const g = gcd(Math.abs(n), Math.abs(d)) || 1
    return { n: n / g, d: d / g }
}

function parseQuantity(text: string): Frac | null {
    const t = text.trim()
    let m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(t)
    if (m) return reduce({ n: +m[1] * +m[3] + +m[2], d: +m[3] })
    m = /^(\d+)\/(\d+)$/.exec(t)
    if (m) return +m[2] === 0 ? null : reduce({ n: +m[1], d: +m[2] })
    m = new RegExp(`^(\\d*)\\s?([${GLYPH_CLASS}])$`).exec(t)
    if (m) {
        const g = GLYPHS[m[2]]
        return reduce({ n: (m[1] ? +m[1] : 0) * g.d + g.n, d: g.d })
    }
    m = /^(\d+)(?:\.(\d+))?$/.exec(t)
    if (m) {
        const decimals = m[2] ?? ''
        const d = 10 ** decimals.length
        return reduce({ n: Math.round(parseFloat(t) * d), d })
    }
    return null
}

/** Writes a quantity as a whole number plus a common fraction, e.g. 1½, ⅔, 3. */
export function formatQuantity({ n, d }: Frac): string {
    const value = n / d
    if (value >= 10) return String(Math.round(value))
    let { n: rn, d: rd } = reduce({ n, d })
    if (!OUT_GLYPHS[`${rn % rd}/${rd}`] && rd !== 1) {
        // Not a kitchen fraction (e.g. 1/12): round to the nearest eighth or third.
        let best = { n: Math.max(1, Math.round(value * 8)), d: 8 }
        const third = { n: Math.round(value * 3), d: 3 }
        if (third.n > 0 && Math.abs(third.n / 3 - value) < Math.abs(best.n / 8 - value))
            best = third
        ;({ n: rn, d: rd } = reduce(best))
    }
    const whole = Math.floor(rn / rd)
    const rest = rn % rd
    if (rest === 0) return String(whole)
    const glyph = OUT_GLYPHS[`${rest}/${rd}`]
    return whole ? `${whole}${glyph}` : glyph
}

const multiply = (q: Frac, step: ScaleStep): Frac =>
    reduce({ n: q.n * step.num, d: q.d * step.den })

// Unit and item words directly after the amount, singular → plural.
const UNITS: Record<string, string> = {
    cup: 'cups',
    tablespoon: 'tablespoons',
    teaspoon: 'teaspoons',
    pound: 'pounds',
    ounce: 'ounces',
    clove: 'cloves',
    can: 'cans',
    pinch: 'pinches',
    dash: 'dashes',
    slice: 'slices',
    stick: 'sticks',
    sprig: 'sprigs',
    bunch: 'bunches',
    head: 'heads',
    package: 'packages',
    jar: 'jars',
    bottle: 'bottles',
    piece: 'pieces',
    quart: 'quarts',
    pint: 'pints',
    gallon: 'gallons',
    liter: 'liters',
    litre: 'litres',
    handful: 'handfuls',
    // common whole items
    egg: 'eggs',
    lemon: 'lemons',
    lime: 'limes',
    orange: 'oranges',
    onion: 'onions',
    shallot: 'shallots',
    carrot: 'carrots',
    potato: 'potatoes',
    tomato: 'tomatoes',
    apple: 'apples',
    banana: 'bananas',
    avocado: 'avocados',
    pepper: 'peppers',
    tortilla: 'tortillas',
}
const SINGULAR = Object.fromEntries(Object.entries(UNITS).map(([s, p]) => [p, s]))

/** Matches the unit word to the new amount: "1 cup" → "2 cups", "2 cups" → "½ cup". */
function fixUnit(rest: string, plural: boolean): string {
    const m = /^(\s*)([A-Za-z]+)\b/.exec(rest)
    if (!m) return rest
    const word = m[2]
    const lower = word.toLowerCase()
    const swap = plural ? UNITS[lower] : SINGULAR[lower]
    if (!swap) return rest
    const cased = word[0] === word[0].toUpperCase() ? swap[0].toUpperCase() + swap.slice(1) : swap
    return m[1] + cased + rest.slice(m[0].length)
}

export interface ScaledLine {
    text: string
    /** False when the line has a number that isn't a leading amount, so it was left as is. */
    scaled: boolean
}

/** Scales the amount at the start of an ingredient line. Lines without one are unchanged. */
export function scaleIngredient(sentence: string, step: ScaleStep): ScaledLine {
    if (step.num === step.den) return { text: sentence, scaled: true }
    const m = LEADING_AMOUNT.exec(sentence)
    const q1 = m && parseQuantity(m[2])
    if (!m || !q1) return { text: sentence, scaled: !HAS_NUMBER.test(sentence) }
    const s1 = multiply(q1, step)
    const q2 = m[4] ? parseQuantity(m[4]) : null
    const s2 = q2 && multiply(q2, step)
    const amount = formatQuantity(s1) + (s2 ? `${m[3]}${formatQuantity(s2)}` : '')
    const top = s2 ?? s1
    const rest = fixUnit(sentence.slice(m[0].length), top.n / top.d > 1)
    return { text: `${m[1]}${amount}${rest}`, scaled: true }
}

/** Scales the first number (or range) in a servings string, e.g. "4-6" × ½ → "2-3". */
export function scaleServings(servings: string, step: ScaleStep): string {
    if (step.num === step.den) return servings
    const m = ANY_AMOUNT.exec(servings)
    const q1 = m && parseQuantity(m[1])
    if (!m || !q1) return servings
    const q2 = m[3] ? parseQuantity(m[3]) : null
    const amount =
        formatQuantity(multiply(q1, step)) +
        (q2 ? `${m[2]}${formatQuantity(multiply(q2, step))}` : '')
    return servings.slice(0, m.index) + amount + servings.slice(m.index + m[0].length)
}
