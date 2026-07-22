import React, { useState } from "react";
import { 
  Bell, 
  Send, 
  Megaphone, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  Clock, 
  UserCheck, 
  ShoppingBag, 
  PackageCheck,
  Building2,
  Trash2,
  Filter
} from "lucide-react";
import { Notification } from "../types";
import { notificationService } from "../services";

interface AdminNotificationCenterProps {
  notifications?: Notification[];
  pharmacies?: any[];
  onNavigateToTab?: (tab: string) => void;
  onRefreshNotifications?: () => void;
}

export default function AdminNotificationCenter({
  notifications = [],
  onNavigateToTab,
  onRefreshNotifications
}: AdminNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"All" | "Orders" | "Verification" | "Broadcast">("All");

  // Broadcast Notification Form
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"offer" | "global" | "price_drop">("global");
  const [sending, setSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState("");
  const [broadcastError, setBroadcastError] = useState("");

  const unreadCount = notifications.filter((n) => !n.is_read && !(n as any).isRead).length;

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      setBroadcastError("Please enter both notification title and message.");
      return;
    }

    setSending(true);
    setBroadcastError("");
    setBroadcastSuccess("");

    try {
      await notificationService.sendNotification({
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType
      });

      setBroadcastSuccess("Broadcast alert successfully published to all pharmacy partners across Bangladesh!");
      setBroadcastTitle("");
      setBroadcastMessage("");
      if (onRefreshNotifications) {
        onRefreshNotifications();
      }
    } catch (err: any) {
      setBroadcastError(err.message || "Failed to broadcast notification.");
    } finally {
      setSending(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      if (onRefreshNotifications) {
        onRefreshNotifications();
      }
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "Orders") return n.title.toLowerCase().includes("order");
    if (activeTab === "Verification") return n.title.toLowerCase().includes("pharmacy") || n.title.toLowerCase().includes("verification") || n.title.toLowerCase().includes("license");
    return true;
  });

  return (
    <div className="relative inline-block text-left">
      {/* Bell Button Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center border border-slate-200"
        title="Admin Alert Center & Broadcast"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Drawer Dropdown */}
      {isOpen && (
        <div className="fixed inset-x-4 top-16 md:absolute md:inset-auto md:right-0 md:top-12 md:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm">MediChain Operations Alerts</h3>
                <p className="text-[10px] text-slate-300">Live B2B Network Notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-medium text-emerald-300 hover:text-white bg-white/10 px-2 py-1 rounded transition-colors"
                >
                  Clear Unread
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            {(["All", "Orders", "Verification", "Broadcast"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  activeTab === tab
                    ? "bg-white text-teal-800 shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab === "Broadcast" ? "📢 Push Alert" : tab}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {activeTab === "Broadcast" ? (
              /* BROADCAST FORM */
              <form onSubmit={handleSendBroadcast} className="space-y-3">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-start gap-2">
                  <Megaphone className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Publish B2B Network Alert</p>
                    <p className="text-[11px] text-teal-700">
                      Instantly pushes announcements or wholesale offers to all registered pharmacies in Bangladesh.
                    </p>
                  </div>
                </div>

                {broadcastSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{broadcastSuccess}</span>
                  </div>
                )}

                {broadcastError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{broadcastError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notification Category
                  </label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="global">Global Announcement</option>
                    <option value="offer">Wholesale Discount Offer</option>
                    <option value="price_drop">Price Drop Warning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Title</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. 10% Extra Discount on Antibiotics!"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Message</label>
                  <textarea
                    rows={3}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type details for pharmacy partners..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Publishing Alert..." : "Broadcast to All Pharmacies"}
                </button>
              </form>
            ) : filteredNotifications.length === 0 ? (
              /* EMPTY NOTIFICATIONS */
              <div className="py-12 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">No active alerts</p>
                <p className="text-[11px] text-slate-400">All network activities are normal.</p>
              </div>
            ) : (
              /* NOTIFICATION LIST */
              filteredNotifications.map((notif, idx) => (
                <div
                  key={notif.id || `notif-${idx}`}
                  className={`p-3 rounded-xl border transition-all text-xs flex items-start gap-3 ${
                    (notif.is_read || (notif as any).isRead)
                      ? "bg-slate-50 border-slate-200 text-slate-600 opacity-80"
                      : "bg-teal-50/60 border-teal-200 text-slate-900 shadow-sm"
                  }`}
                >
                  <div className="p-2 rounded-lg bg-teal-100 text-teal-800 shrink-0 mt-0.5">
                    {notif.type === "offer" ? (
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Bell className="w-4 h-4 text-teal-700" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-bold text-xs truncate">{notif.title}</h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {notif.created_at || (notif as any).timestamp || (notif as any).date ? new Date(notif.created_at || (notif as any).timestamp || (notif as any).date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
