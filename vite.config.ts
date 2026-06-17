import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
                'assets/favicon-16.png',
                'assets/favicon-32.png',
                'assets/apple-touch-icon.png',
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
                        src: 'assets/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'assets/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'assets/icon-maskable-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                    {
                        src: 'assets/icon-maskable-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                // Precache the app shell (code, styles, fonts, icons). API/SSE responses
                // are never cached — the app stays online-only, matching the native app.
                globPatterns: ['**/*.{js,css,html,svg,png,woff2,ttf}'],
                navigateFallback: '/index.html',
                cleanupOutdatedCaches: true,
            },
        }),
    ],
})
