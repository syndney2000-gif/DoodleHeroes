/* Doodle Heroes — retired service worker.
   The old drawing-game site cached its pages offline. Browsers that still run
   that worker fetch this file on their next visit, install it, and it then
   clears every cache, unregisters itself, and reloads open tabs so they get
   the live site. Keep this file deployed for a few months before deleting it. */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const tabs = await self.clients.matchAll({ type: 'window' });
    for (const tab of tabs) tab.navigate(tab.url);
  })());
});
