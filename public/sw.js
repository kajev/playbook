// Playbook service worker — Push 0 (minimal).
//
// At this stage the service worker only exists so the browser treats
// Playbook as a "real" PWA (required for iOS "Add to Home Screen" to
// behave correctly and for Web Push API access in Push 10).
//
// Push 10 will expand this file with:
//   - 'push' event handler for Web Push notifications
//   - 'notificationclick' to open the app to the relevant ping
//   - cache strategies for offline asset access
//
// For now: install + activate lifecycle only. No caching, no fetch handler.

const SW_VERSION = 'playbook-sw-v0.1.0';

self.addEventListener('install', (event) => {
  // Activate this SW immediately, replacing any older one.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all clients (open tabs/windows) without requiring reload.
  event.waitUntil(self.clients.claim());
});

// Intentionally no 'fetch' handler in Push 0.
// Adding an empty one would still proxy every request through the SW
// for no benefit. We skip it entirely until Push 10.
