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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(notifications.map(n => n.id === id ? {...n, is_read: true} : n));
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  return (
    <div className="relative">
      <button onClick={handleToggle} className="p-2 relative hover:bg-slate-100 rounded-full">
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
            {unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-slate-100 font-bold text-xs uppercase text-slate-500 flex justify-between">
            Notifications
            <button onClick={() => notificationService.markAllAsRead().then(() => notificationService.getNotifications().then(setNotifications).catch(console.error)).catch(console.error)} className="text-brand-purple">Mark all</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && <div className="p-4 text-center text-slate-500 text-xs">No notifications</div>}
            {notifications.map((n) => (
              <div key={n.id} className={`p-3 text-xs border-b border-slate-100 ${!n.is_read ? 'bg-indigo-50' : ''}`}>
                <p className="font-bold text-slate-900">{n.title}</p>
                <p className="text-slate-600 mb-1">{n.message}</p>
                {!n.is_read && <button onClick={() => markAsRead(n.id)} className="text-[10px] text-brand-purple font-bold">Mark as read</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
