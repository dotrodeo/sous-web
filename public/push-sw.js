// Timer alerts (#22): push and notification-click handling, imported into the
// service worker that vite-plugin-pwa generates (workbox.importScripts).
//
// Safari 18.4+ shows our pushes itself (they're in the Declarative Web Push
// format), so on iPhone this code may not run. Other browsers rely on it.
// Every push must show a notification: browsers revoke push subscriptions that
// receive pushes without one.

self.addEventListener('push', (event) => {
    let data = {}
    try {
        data = event.data ? event.data.json() : {}
    } catch {
        data = {}
    }
    const n = data.notification || {}
    event.waitUntil(
        self.registration.showNotification(n.title || 'sous', {
            body: n.body || '',
            tag: n.tag,
            renotify: Boolean(n.tag),
            requireInteraction: true,
            vibrate: [400, 200, 400, 200, 400],
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: { url: n.navigate || '/' },
        }),
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin)
    const path = target.origin === self.location.origin ? target.pathname + target.search : '/'
    event.waitUntil(
        (async () => {
            const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            const client = windows[0]
            if (client) {
                await client.focus()
                // The app routes it without a reload (hooks/useTimerAlerts.ts).
                client.postMessage({ type: 'sous:navigate', path })
                return
            }
            await self.clients.openWindow(path)
        })(),
    )
})
