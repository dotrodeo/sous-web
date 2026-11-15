import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The service worker imports push-sw.js; a versioned URL makes each release fetch
// it afresh (Cloudflare gives .js files a 4-hour browser cache).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
                'icons/favicon-16.png',
                'icons/favicon-32.png',
                'icons/apple-touch-icon.png',
            ],
            manifest: {
                name: 'sous',
                short_name: 'sous',
                description:
                    'Plan meals, track your pantry, and build your shopping list automatically.',
                theme_color: '#FFC93C',
                background_color: '#F3F3F5',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    {
                        src: 'icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'icons/icon-maskable-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                    {
                        src: 'icons/icon-maskable-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                // Precache the app shell (code, styles, fonts, icons). API/SSE responses
                // are never cached — the app stays online-only, matching the native app.
                globPatterns: ['**/*.{js,css,html,svg,png,woff2,ttf,mp3}'],
                navigateFallback: '/index.html',
                cleanupOutdatedCaches: true,
                // Timer alerts (#22): push and notification-click handlers.
                importScripts: [`push-sw.js?v=${version}`],
            },
        }),
    ],
})
