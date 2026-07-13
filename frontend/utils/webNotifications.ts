export type WebNotificationPermission = NotificationPermission | "unsupported";

export function getWebNotificationPermission(): WebNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission;
}

export async function requestWebNotificationPermission(): Promise<WebNotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.requestPermission();
}

export function showWebNotification(title: string, body: string, onOpen: () => void) {
  if (typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") return;
  const notification = new window.Notification(title, { body, icon: "/favicon.ico", tag: `aisw-${Date.now()}` });
  notification.onclick = () => {
    window.focus();
    notification.close();
    onOpen();
  };
}
