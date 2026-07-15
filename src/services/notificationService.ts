import { Notification } from "../types";

/**
 * MediChain Notification Service
 * 
 * Manages flash discount deals, price drops alerts, and active order shipment status logs.
 */

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const res = await fetch("/api/notifications");
    if (!res.ok) throw new Error("Failed to load notifications.");
    return res.json();
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/read/${notificationId}`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to mark as read.");
    return res.json();
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!res.ok) throw new Error("Failed to mark all as read.");
    return res.json();
  },

  async sendNotification(notification: Omit<Notification, 'id' | 'is_read' | 'created_at'>): Promise<void> {
    const res = await fetch("/api/admin/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notification),
    });
    if (!res.ok) throw new Error("Failed to send notification.");
  }
};
