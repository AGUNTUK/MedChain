import React, { useEffect, useState } from "react";
import { X, Bell, CheckCheck, RefreshCw, Sparkles, Tag, Package, Coins } from "lucide-react";
import { Notification } from "../types";
import { notificationService } from "../services";

interface NotificationsPanelProps {
  onClose: () => void;
  onRefreshNotifications: () => void;
}

export default function NotificationsPanel({ onClose, onRefreshNotifications }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await fetchNotifications();
      onRefreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "price_drop":
        return <Tag className="w-4 h-4 text-brand-purple" />;
      case "order_update":
        return <Package className="w-4 h-4 text-brand-lime" />;
      case "credit":
        return <Coins className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="absolute inset-0 bg-black/60 flex items-end z-50 select-none animate-fade-in">
      <div className="w-full bg-brand-bg rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl overflow-y-auto max-h-[80%] animate-slide-up flex flex-col justify-between">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
          <div>
            <h3 className="text-xs font-black text-brand-charcoal flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-brand-purple" />
              MediChain Depot Broadcaster
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Real-time supply-chain updates and offers</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] text-brand-purple font-extrabold hover:underline cursor-pointer flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* List of broadcasts */}
        <div className="space-y-2.5 overflow-y-auto flex-1 min-h-[160px] pr-1">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-purple" />
            </div>
          )}

          {!loading && notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-xs font-semibold">No Broadcasts Active</p>
              <p className="text-[9px] text-slate-400 mt-1">Updates on restocks and credit limits will show up here.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-3.5 rounded-2xl border transition-all flex gap-3 text-xs items-start ${
                  n.read
                    ? "bg-white border-slate-100 text-slate-600"
                    : "bg-brand-purple/5 border-brand-purple/20 text-slate-800"
                }`}
              >
                <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-brand-charcoal leading-tight">{n.title}</span>
                    <span className="text-[8px] text-slate-400 font-mono">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
