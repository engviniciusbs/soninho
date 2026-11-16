/// <reference lib="webworker" />

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Soninho",
      body: event.data.text(),
      icon: "/icon.svg",
      url: "/",
    };
  }

  const { type, title = "Soninho", body, icon = "/icon.svg", badge, tag, url = "/" } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: badge || icon,
      tag: tag || "soninho-default",
      data: { url },
      // Only an overdue nap needs to stay on screen; the rest close by themselves.
      requireInteraction: type === "OVERDUE",
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          try {
            // navigate() rejects for a window this worker does not control.
            const navigated = await client.navigate(url);
            return (navigated || client).focus();
          } catch {
            break;
          }
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
