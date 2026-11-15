// Tag picking for the recipe editor: tags match case-insensitively, so typing an
// existing tag in any case reuses it; new tags are saved lowercase and trimmed.

/** "  Weeknight  Meals " → "weeknight meals". */
export function normalizeTag(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ').toLowerCase()
}

const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** The household's spelling of a tag if it exists (ignoring case), else the normalized name. */
export function resolveTag(raw: string, existing: string[]): string {
    const name = normalizeTag(raw)
    return existing.find((t) => sameTag(t, name)) ?? name
}

export function hasTag(tags: string[], name: string): boolean {
    return tags.some((t) => sameTag(t, name))
}

/**
 * Existing tags not already on the recipe that contain the query, names starting
 * with it first, then A→Z.
 */
export function suggestTags(query: string, existing: string[], selected: string[], limit = 15) {
    const q = normalizeTag(query)
    return existing
        .filter((t) => !hasTag(selected, t) && t.toLowerCase().includes(q))
        .sort((a, b) => {
            const pa = a.toLowerCase().startsWith(q) ? 0 : 1
            const pb = b.toLowerCase().startsWith(q) ? 0 : 1
            return pa - pb || a.localeCompare(b)
        })
        .slice(0, limit)
}

/** True when the typed name is new: not an existing household tag nor already on the recipe. */
export function isNewTag(query: string, existing: string[], selected: string[]): boolean {
    const q = normalizeTag(query)
    return q.length > 0 && !hasTag(existing, q) && !hasTag(selected, q)
}
