# ---- build stage ----
# Debian-slim (glibc) so the toolchain matches the target Debian host.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* at build time, so the config is baked into the static
# bundle. Both values are non-secret (Clerk *publishable* key + API URL).
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_BASE_URL
RUN printf 'VITE_CLERK_PUBLISHABLE_KEY=%s\nVITE_API_BASE_URL=%s\n' \
      "$VITE_CLERK_PUBLISHABLE_KEY" "$VITE_API_BASE_URL" > .env.production \
 && npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
