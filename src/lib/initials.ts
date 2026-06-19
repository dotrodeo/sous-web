/** Two-letter avatar initials from a name (or email fallback). */
export function initials(name?: string | null, email?: string | null): string {
    const src = (name || email || '').trim()
    if (!src) return '·'
    const parts = src.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return src.slice(0, 2).toUpperCase()
}
