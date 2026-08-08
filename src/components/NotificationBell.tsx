import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { notificationService } from "../services/notificationService";
import { Notification as AppNotification } from "../types";
import { supabase } from "../lib/supabaseClient";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    notificationService.getNotifications().then(setNotifications).catch(console.error);

    const channelId = `notifications-bell-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const newNotif = payload.new as AppNotification;
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new window.Notification(newNotif.title, {
              body: newNotif.message,
              icon: "/logo.png"
            });
          } catch (e) {
            console.warn("Could not show system notification", e);
          }
        }
        setNotifications(prev => [newNotif, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload) => {
        notificationService.getNotifications().then(setNotifications).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isUnread = (n: AppNotification) => !n.is_read && !(n as any).read;
  const unreadCount = notifications.filter(isUnread).length;

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read: true } : n));
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  return (
    <div className="relative">
      <button onClick={handleToggle} className="p-2 relative hover:bg-slate-100 rounded-full cursor-pointer">
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-xs uppercase text-slate-600 flex justify-between items-center">
            <span>Notifications ({unreadCount})</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-brand-purple font-bold text-[11px] hover:underline cursor-pointer">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 && <div className="p-6 text-center text-slate-500 text-xs">No notifications</div>}
            {notifications.map((n) => {
              const unread = isUnread(n);
              return (
                <div
                  key={n.id}
                  onClick={() => unread && markAsRead(n.id)}
                  className={`p-3 text-xs transition-colors cursor-pointer ${
                    unread ? 'bg-indigo-50/70 hover:bg-indigo-100/60' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className={`font-bold ${unread ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                    {unread && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>}
                  </div>
                  <p className="text-slate-600 mb-1 leading-relaxed">{n.message}</p>
                  {unread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      className="text-[10px] text-brand-purple font-bold hover:underline cursor-pointer"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
