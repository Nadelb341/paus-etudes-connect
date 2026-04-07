self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Paus'étude";
  const options = {
    body: data.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: data.tag || 'notif',
    renotify: true,
    silent: false,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
  };
  event.waitUntil(
    self.registration.showNotification(title, options).then(function() {
      if (navigator.setAppBadge) navigator.setAppBadge(data.badgeCount || 1);
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (navigator.clearAppBadge) navigator.clearAppBadge();
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
