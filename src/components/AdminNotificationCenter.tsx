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
  const [activeTab, setActiveTab] = useState<"All" | "Orders" | "Verification">("All");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Broadcast Notification Form
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"offer" | "global" | "price_drop">("global");
  const [sending, setSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState("");
  const [broadcastError, setBroadcastError] = useState("");

  const isNotifRead = (n: Notification) => readIds.has(n.id) || Boolean(n.is_read || (n as any).isRead);

  const unreadCount = notifications.filter((n) => !isNotifRead(n)).length;

  const handleMarkRead = async (id: string) => {
    setReadIds(prev => new Set(prev).add(id));
    try {
      await notificationService.markAsRead(id);
      if (onRefreshNotifications) onRefreshNotifications();
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

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
    const allIds = notifications.map(n => n.id);
    setReadIds(new Set(allIds));
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
    <div className="space-y-6 animate-fade-in text-slate-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Notifications Feed */}
        <div className="lg:col-span-2 bg-white/60 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-500/10 text-teal-600 rounded-xl">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">MediChain Operations Alerts</h3>
                <p className="text-[10px] text-slate-500">Live B2B Network Notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Clear Unread ({unreadCount})
                </button>
              )}
            </div>
          </div>

          {/* Sub Navigation Filter Tabs */}
          <div className="flex items-center border border-slate-200 bg-slate-50/80 p-1 rounded-xl text-xs font-semibold">
            {(["All", "Orders", "Verification"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  activeTab === tab
                    ? "bg-white text-teal-800 shadow-xs font-bold border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Notification Items List */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">No active alerts found</p>
                <p className="text-[11px] text-slate-400">All network activities are normal.</p>
              </div>
            ) : (
              filteredNotifications.map((notif, idx) => {
                const read = isNotifRead(notif);
                return (
                  <div
                    key={notif.id || `notif-${idx}`}
                    onClick={() => !read && handleMarkRead(notif.id)}
                    className={`p-3.5 rounded-xl border transition-all text-xs flex items-start gap-3 cursor-pointer ${
                      read
                        ? "bg-slate-50/80 border-slate-200 text-slate-600 opacity-80 hover:bg-slate-100"
                        : "bg-teal-50/60 border-teal-200 text-slate-900 shadow-xs hover:bg-teal-100/70"
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
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-bold text-xs truncate">{notif.title}</h4>
                          {!read && <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0"></span>}
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {notif.created_at || (notif as any).timestamp || (notif as any).date ? new Date(notif.created_at || (notif as any).timestamp || (notif as any).date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{notif.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Broadcast Form */}
        <div className="bg-white/60 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg h-fit">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Megaphone className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="text-sm font-black text-slate-900">Push Network Broadcast</h3>
              <p className="text-[10px] text-slate-500">Publish announcements to all pharmacies</p>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-3.5">
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Message</label>
              <textarea
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type details for pharmacy partners across Bangladesh..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
        </div>
      </div>
    </div>
  );
}
