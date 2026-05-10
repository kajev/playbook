// Playbook service worker.
//
// v0.2.0 (Push 7.5):
//   - Bumped version forces the browser to treat this as a NEW SW after deploy.
//   - 'message' handler so the page can tell waiting SW to skipWaiting.
//
// Push 10 will add: 'push', 'notificationclick', cache strategies.

const SW_VERSION = 'playbook-sw-v0.2.0';

self.addEventListener('install', (event) => {
  // Activate immediately so a new deploy can take over without users
  // having to close all tabs first.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all clients (open tabs/windows) without requiring reload.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  // Page can post { type: 'SKIP_WAITING' } to force the new SW to activate
  // when the user clicks "Update available" in the topbar.
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Intentionally no 'fetch' handler yet. Adding an empty one proxies every
// request through the SW for no benefit. Real caching arrives with Push 10.
