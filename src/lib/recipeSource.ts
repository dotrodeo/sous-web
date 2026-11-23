// The page a recipe was imported from, as a link: only http(s) addresses, labelled
// by their site ("https://www.budgetbytes.com/x" → "budgetbytes.com").
export function sourceLink(
    source: string | null | undefined,
): { href: string; site: string } | null {
    if (!source) return null
    let url: URL
    try {
        url = new URL(source)
    } catch {
        return null
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return { href: url.href, site: url.hostname.replace(/^www\./, '') }
}
