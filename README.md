# sous-web

A progressive-web-app rewrite of the `sous` iOS app (SwiftUI → React). The native
app is a thin presentation layer over a REST + SSE backend, so the migration is
mostly re-implementing the UI and the API/auth glue on the web.

> **Status: Phase 1 spike.** Proves the riskiest end-to-end path — Clerk auth →
> resolve household → render the Recipes list from the live backend — before
> committing to a full port. See the migration decision doc for the phased plan.

## Stack

- **Vite + React + TypeScript**
- **@clerk/clerk-react** — same Clerk instance as the iOS app (auth ports 1:1)
- **@tanstack/react-query** — server state; maps onto the Swift "ViewModel fetches
  from a service" pattern, with SSE invalidation slated for a later phase
- **vite-plugin-pwa** — installed, wired up in the PWA-shell phase

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:5173
```

### Environment (`.env.local`)

Values mirror `Debug.xcconfig` in the `sous-swift` project:

| Var | Notes |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk *publishable* key — client-side by design, safe to expose |
| `VITE_API_BASE_URL` | `https://soupi-development.up.railway.app` |

## How it maps to the Swift app

| Web | Swift source of truth |
| --- | --- |
| `src/lib/api.ts` | `Utils/APIHelper.swift` (Bearer injection, JSON, non-2xx throws) |
| `src/lib/useApi.ts` | `clerk.session?.getToken()?.jwt` → `useAuth().getToken()` |
| `src/lib/types.ts` | `Models/*.swift` (Recipe, Ingredient, RecipeTag, User) |
| `src/hooks/useUser.ts` | `SessionManager.handleAuthEvent()` (GET /user, fallback /user/sync; resolve household from `defaultHouseholdId`) |
| `src/hooks/useRecipes.ts` | `RecipeService.fetchRecipes()` (`GET /household/{id}/recipes`) |

## Verified in this spike

- ✅ Type-checks and production-builds clean (`npm run build`)
- ✅ Dev server serves the app shell
- ✅ Backend reachable; **CORS open to the web origin** (`access-control-allow-origin: *`,
  `authorization` header allowed) — confirmed via preflight from `localhost:5173`
- ⏳ **Manual, needs a real browser + your Clerk login:** sign in, then confirm the
  Recipes list renders real household data. (Cannot be done headlessly.)

## Next phases

2. Port remaining models + services into typed query hooks
3. SSE layer (`/events/{householdId}` → `queryClient.invalidateQueries`)
4. Feature parity tab-by-tab (Recipes → Pantry → List → Plan → Profile)
5. PWA shell (manifest, service worker, install prompt, fonts, palette)
6. Deploy + cutover
