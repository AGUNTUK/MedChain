import { Notification } from "../types";

/**
 * MediChain Notification Service
 * 
 * Manages flash discount deals, price drops alerts, and active order shipment status logs.
 */
export const notificationService = {
  /**
   * Fetches all unread and read notifications for the current pharmacy portal.
   */
  async getNotifications(): Promise<Notification[]> {
    const res = await fetch("/api/notifications");
    if (!res.ok) {
      throw new Error("Failed to load notifications.");
    }
    return res.json();
  },

  /**
   * Marks all pending notifications as read to clear badges.
   */
  async markAllAsRead(): Promise<{ success: boolean }> {
    const res = await fetch("/api/notifications/read-all", {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error("Failed to update notification states.");
    }

    return res.json();
  },
};
