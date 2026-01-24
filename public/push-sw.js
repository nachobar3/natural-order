// Push notification handler for Natural Order
// This file is loaded by the main service worker

self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event received but no data');
    return;
  }

  let notification;
  try {
    notification = event.data.json();
  } catch (e) {
    notification = {
      title: 'Natural Order',
      body: event.data.text(),
      icon: '/icon-192x192.png',
    };
  }

  const options = {
    body: notification.body || '',
    icon: notification.icon || '/icon-192x192.png',
    badge: '/favicon-32x32.png',
    tag: notification.tag || 'natural-order',
    data: notification.data || {},
    requireInteraction: notification.requireInteraction || false,
    actions: notification.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(notification.title || 'Natural Order', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/dashboard';

  // Route based on notification type
  if (data.type === 'new_match' && data.matchId) {
    url = `/dashboard/matches/${data.matchId}`;
  } else if (data.type === 'new_comment' && data.matchId) {
    url = `/dashboard/matches/${data.matchId}`;
  } else if (data.type === 'trade_requested' && data.matchId) {
    url = `/dashboard/matches/${data.matchId}`;
  } else if (data.type === 'trade_confirmed' && data.matchId) {
    url = `/dashboard/matches/${data.matchId}`;
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Try to focus an existing window
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if no existing window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle push subscription change (browser refreshed subscription)
self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(function(subscription) {
        // Re-register with server
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        });
      })
  );
});
