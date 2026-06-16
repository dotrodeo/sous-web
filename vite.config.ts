import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon-180.png'],
            manifest: {
                name: 'sous',
                short_name: 'sous',
                description:
                    'Collaborative household cooking — recipes, meal planning, pantry & shopping list.',
                theme_color: '#3d51ff',
                background_color: '#f7f7f7',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
                    {
                        src: 'pwa-maskable-512.png',
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
