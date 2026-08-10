import { Notification } from "../types";

let cachedNotifications: { data: Notification[]; timestamp: number } | null = null;
let pendingFetchPromise: Promise<Notification[]> | null = null;
const NOTIF_CACHE_TTL = 10000; // 10 seconds TTL

/**
 * MediChain Notification Service
 * 
 * Manages flash discount deals, price drops alerts, and active order shipment status logs.
 */

export const notificationService = {
  clearCache(): void {
    cachedNotifications = null;
  },

  async getNotifications(forceRefresh = false): Promise<Notification[]> {
    if (!forceRefresh && cachedNotifications && Date.now() - cachedNotifications.timestamp < NOTIF_CACHE_TTL) {
      return cachedNotifications.data;
    }

    if (pendingFetchPromise) {
      return pendingFetchPromise;
    }

    pendingFetchPromise = (async () => {
      try {
        const res = await fetch("/api/notifications");
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          console.warn("Notifications request failed or returned invalid format.");
          return cachedNotifications?.data || [];
        }
        const data = await res.json();
        cachedNotifications = { data, timestamp: Date.now() };
        return data;
      } catch (err) {
        console.warn("Failed to load notifications (network/transient):", err);
        return cachedNotifications?.data || [];
      } finally {
        pendingFetchPromise = null;
      }
    })();

    return pendingFetchPromise;
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    this.clearCache();
    const res = await fetch(`/api/notifications/read/${notificationId}`, { method: "POST" });
    const contentType = res.headers.get("content-type");
    if (!res.ok || !contentType || !contentType.includes("application/json")) {
      throw new Error("Failed to mark as read.");
    }
    return res.json();
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    this.clearCache();
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    const contentType = res.headers.get("content-type");
    if (!res.ok || !contentType || !contentType.includes("application/json")) {
      throw new Error("Failed to mark all as read.");
    }
    return res.json();
  },

  async sendNotification(notification: Omit<Notification, 'id' | 'is_read' | 'created_at'>): Promise<void> {
    this.clearCache();
    const res = await fetch("/api/admin/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notification),
    });
    if (!res.ok) throw new Error("Failed to send notification.");
  }
};
