// Thin HTTP client mirroring sous-swift/Utils/APIHelper.swift:
//  - base URL from env
//  - Authorization: Bearer <jwt> from Clerk on every request
//  - JSON encode/decode, throw on non-2xx
//
// Pair with the useApi() hook, which binds this to Clerk's getToken().

const BASE_URL = import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  status: number
  body?: string

  constructor(status: number, message: string, body?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export type GetToken = () => Promise<string | null>

type Query = Record<string, string | undefined>

function buildUrl(endpoint: string, query?: Query): string {
  const url = new URL(BASE_URL.replace(/\/$/, '') + endpoint)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null) url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

export function createApiClient(getToken: GetToken) {
  async function request<T>(
    method: string,
    endpoint: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<T> {
    const token = await getToken()
    if (!token) throw new ApiError(401, 'Not authenticated (no Clerk session token)')

    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

    const res = await fetch(buildUrl(endpoint, opts.query), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new ApiError(res.status, `${method} ${endpoint} → ${res.status}`, body)
    }

    // Some endpoints (POST/DELETE) return empty bodies.
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
  }

  return {
    get: <T>(endpoint: string, query?: Query) => request<T>('GET', endpoint, { query }),
    post: <T>(endpoint: string, body?: unknown) => request<T>('POST', endpoint, { body }),
    delete: (endpoint: string, query?: Query) => request<void>('DELETE', endpoint, { query }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
