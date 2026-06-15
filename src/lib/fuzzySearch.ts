// Port of FuzzySearch.swift — diacritic-insensitive Levenshtein matching.

export interface FuzzyMatchResult<T> {
  item: T
  score: number
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1)
      }
    }
  }
  return dp[m][n]
}

/** Generic fuzzy search over items keyed by a string accessor. */
export class FuzzySearch<T> {
  private items: T[]
  private key: (item: T) => string

  constructor(items: T[], key: (item: T) => string) {
    this.items = items
    this.key = key
  }

  /** Returns matches with score ≤ maxScore (lower is better), sorted ascending. */
  search(query: string, maxScore = 0.6): FuzzyMatchResult<T>[] {
    const nq = normalize(query)
    const results: FuzzyMatchResult<T>[] = []
    for (const item of this.items) {
      const value = normalize(this.key(item))
      const distance = levenshtein(nq, value)
      const maxLen = Math.max(nq.length, value.length)
      const score = maxLen === 0 ? 0 : distance / maxLen
      if (score <= maxScore) results.push({ item, score })
    }
    return results.sort((a, b) => a.score - b.score)
  }
}
