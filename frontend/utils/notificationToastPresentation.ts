export type NotificationToastKind = "notice" | "generic";

export function notificationToastKind(notificationType: string): NotificationToastKind {
  return notificationType === "notice" ? "notice" : "generic";
}

export function notificationToastTop(insetTop: number): number {
  return Math.max(0, insetTop) + 8;
}
