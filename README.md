# Sous

Sous is a cooking app for households. Everyone in the household shares one recipe
box, meal plan, pantry and shopping list, and changes show up on everyone's devices
as they happen.

This repository is the web app: an installable progressive web app (PWA) for phones
and desktops. It needs the [soupi](https://github.com/dotrodeo/soupi) API server
behind it.

## What it does

**Recipes**

- Import a recipe from a URL, or write one by hand. Imported ingredient lines are
  split into amount, unit and item.
- Search, filter by tag, and sort by how much of each recipe your pantry covers.
- Each ingredient shows whether it's in the pantry, on the shopping list, or
  missing. One tap adds a missing ingredient to the list.
- Cook mode shows one step at a time in large type, with the step's ingredients
  highlighted.
- "I made this" records a rating, marks the ingredients you used up as out of
  stock, and removes the recipe from the meal plan.

**Meal plan**

- Add days and put recipes on them. Each recipe shows how much of it the pantry
  covers.

**Pantry**

- Items grouped by category, with stock status, quantity and expiration date.
  Items expiring soon are flagged.
- Mark items as staples. A staple that runs out goes on the shopping list
  automatically.

**Shopping list**

- Grouped by category. Add items directly or pick them from the pantry.
- Shopping mode: check items off as you get them (which marks them in stock), then
  clear the checked ones.

**Household**

- Share your household with a QR code or join code. Others join by scanning it or
  typing it in.
- Reorder, add, rename and remove categories, and mark categories as non-food.
- Every change syncs live to the other members.

Sign-in is by email and password. Sous needs a network connection: only the app
itself is cached for offline startup, not your data.

## How it fits together

```
browser (sous-web) ──HTTPS──▶ soupi API ──▶ Postgres
        │                        │
        └──── Clerk (sign-in) ◀──┘
```

- The browser calls soupi directly, with the user's Clerk session token.
- soupi pushes changes back over a Server-Sent Events stream, and the app refreshes
  the affected data.
- sous-web is a static build served by nginx. It has no server-side code.

## Run it locally

You need Node 22, a running soupi (see its
[README](https://github.com/dotrodeo/soupi#run-it-locally)), and the publishable key
of the Clerk application soupi uses.

```bash
npm install
cp .env.example .env.local     # fill in the two values below
npm run dev                    # http://localhost:5173
```

| Variable                     | Description                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Publishable key of the Clerk application soupi uses.                         |
| `VITE_API_BASE_URL`          | soupi's URL, such as `http://localhost:8080`. The browser calls it directly. |

If soupi sets `CORS_ORIGINS`, include `http://localhost:5173`.

Scanning a join code needs camera access, which browsers allow only on HTTPS or
`localhost`.

## Self-hosting

Deploy [soupi](https://github.com/dotrodeo/soupi#self-hosting) first: sous-web needs
its public URL at build time.

`docker-compose.yml` builds the app and serves it with nginx (service `web`), with an
optional bundled [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
(service `tunnel`). One env file defines one environment, and names are suffixed
with its `ENV`, so several environments can run on one host.

1. Copy the template and fill it in:

   ```bash
   cp .env.deploy.example .env.prod
   ```

   Set `ENV=prod`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` (soupi's
   **public** URL) and `WEB_PORT` (the host port, bound to `127.0.0.1`).

2. Build and start it. Pass `--env-file` on **every** `docker compose` command.

   ```bash
   docker compose --env-file .env.prod up -d --build          # with the tunnel
   docker compose --env-file .env.prod up -d --build web      # without it
   ```

3. Serve it over HTTPS, which installing the app and scanning join codes require.
   Either:
   - set `TUNNEL_TOKEN` to a Cloudflare Tunnel token and route the tunnel's public
     hostname to `http://sous_web_<ENV>_app:80`, or
   - put your own reverse proxy in front of `127.0.0.1:<WEB_PORT>`.

4. Add this URL to soupi's `CORS_ORIGINS` and restart soupi's `api` service.

The `VITE_*` values are compiled into the build. Changing them, or pulling new code,
means rebuilding:

```bash
docker compose --env-file .env.prod up -d --build web
```

Open apps pick up a new build on their next load.

## Development

| Command           | What it does                       |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Dev server with hot reload         |
| `npm run build`   | Type-check and build to `dist/`    |
| `npm run preview` | Serve the production build locally |
| `npm run lint`    | ESLint                             |
| `npm run format`  | Prettier                           |

Stack: Vite, React 19, TypeScript, TanStack Query, React Router, Clerk, and
vite-plugin-pwa, with plain CSS.

```
src/pages/        One component per screen
src/components/   App shell, bottom sheets, icons, QR scanner
src/hooks/        Data queries and mutations, live-update listener
src/lib/          API client, endpoint functions, types, helpers
src/index.css     Design tokens (colors, font)
src/ui.css        Layout and shared components
```

Data is fetched and cached with TanStack Query, keyed by household. When a live
update arrives, `src/hooks/useHouseholdEvents.ts` refreshes the matching queries.
API types in `src/lib/types.ts` mirror soupi's data model: when you add a field,
add it to both.
