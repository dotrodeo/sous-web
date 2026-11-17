// Recipe notes (#43).
/** A made-it note as a dated line for the recipe's notes, like "Nov 17: more salt". */
export function datedNote(text: string, date = new Date()): string {
    const day = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    return `${day}: ${text.trim().replace(/\s*\n\s*/g, ' ')}`
}
