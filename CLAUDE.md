# sous-web

The web client for **Sous**, a shared household cooking app (recipes, meal plan,
pantry, shopping list). It's an installable PWA and the **only** client: the native
iOS app (`sous-swift`) is retired. Code comments that cite `sous-swift` files explain
where the logic came from; they aren't a spec to stay in sync with.

The backend is **soupi** (`dotrodeo/soupi`): REST plus a per-household SSE stream,
with Clerk for auth.

## Stack

Vite + React 19 + TypeScript, TanStack Query for server state, React Router,
`@clerk/clerk-react`, `vite-plugin-pwa`, `lucide-react` icons. Plain CSS, no CSS
framework. There are no tests; CI runs format, lint, build and a Docker build.

## Layout

- `src/lib/api.ts`: fetch client. It adds `Authorization: Bearer <Clerk JWT>` to
  every request and throws `ApiError` (with `status`) on non-2xx. `useApi()` binds
  it to the current Clerk session.
- `src/lib/services.ts`: typed endpoint functions, grouped by resource.
- `src/lib/types.ts`: API types. Keep them in sync with soupi's Prisma models and
  Zod schemas. soupi silently drops fields its schema doesn't know, so a field added
  here without the backend change is lost without an error.
- `src/hooks/`: query and mutation hooks. Query keys are
  `[resource, householdId, ...]` (`recipes`, `recipe`, `recipeTags`, `pantry`,
  `categories`, `plan`), plus `['user']`.
- `src/hooks/useUser.ts`: `GET /user`, falling back to `POST /user/sync` **only on
  404**. Falling back on other errors caused a request storm (sync broadcasts
  `user_update`, which refetches `['user']`), so keep that guard.
- `src/hooks/useHouseholdEvents.ts` + `src/lib/sse.ts`: SSE over fetch
  (`@microsoft/fetch-event-source`, because native `EventSource` can't send the
  auth header). Events invalidate the matching query keys. Add a case here when
  soupi gains a new event type.
- `src/pages/`: one file per screen. `src/components/`: app shell (bottom nav on
  mobile, sidebar at 900px and up), bottom sheets, icons, QR join scanner.
- `src/index.css`: design tokens (`--brand`, `--ink`, `--canvas`, …).
  `src/ui.css`: layout and shared primitives. Mobile-first.

Conventions: Prettier with 4-space indent and no semicolons (2 spaces for
JSON/YAML/Markdown), single quotes, 100-char lines. UI copy is lowercase.

## Checks

```bash
npm run format:check
npm run lint
npm run build        # tsc -b && vite build
```

## Environment

`VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL` are **build-time**: Vite inlines
them, so each environment is its own image and changing either needs a rebuild.
Both are public by design, but the `.env.*` files also hold the tunnel token, so
never print or commit them. `VITE_API_BASE_URL` must be the soupi environment's
**public** URL, because the browser calls it directly.

## Deploy

Docker Compose, one stack per environment: `sous-web-dev` and `sous-web-prod`,
each with `web` (nginx serving the static build) and `tunnel` (cloudflared).
Container names are `sous_web_<env>_{app,tunnel}`.

- Pass `--env-file .env.dev` or `--env-file .env.prod` on **every** `docker compose`
  command.
- Rebuild only the app: `docker compose --env-file .env.<env> up -d --build web`.
  Avoid `npm run deploy`, which runs `up -d --build` for the whole stack.
- Before a prod deploy, tag the current image so it can be rolled back
  (`docker tag sous-web:prod sous-web:prod-pre-<change>`).
- The service worker is `autoUpdate` and precaches only the app shell (API and SSE
  are never cached). nginx serves `sw.js`, `index.html` and the manifest with
  `no-cache`, so clients pick up a new build on their next load.
- When a change needs a new soupi field or endpoint, deploy soupi first.
