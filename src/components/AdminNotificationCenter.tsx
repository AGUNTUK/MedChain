import React, { useState, useEffect } from "react";
import { notificationService } from "../services/notificationService";
import { Notification } from "../types";

export default function AdminNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [form, setForm] = useState({ title: "", message: "", type: "system_alert", target_role: "All" });

  useEffect(() => {
    notificationService.getNotifications().then(setNotifications).catch(console.error);
  }, []);

  const sendNotification = async () => {
    await notificationService.sendNotification({
        title: form.title,
        message: form.message,
        type: form.type,
        role_target: form.target_role === "All" ? undefined : form.target_role
    });
    setForm({ title: "", message: "", type: "system_alert", target_role: "All" });
    notificationService.getNotifications().then(setNotifications).catch(console.error);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Notification Center</h2>
      
      <div className="bg-white p-6 rounded-lg border border-slate-200 mb-8">
        <h3 className="font-bold mb-4">Send Broadcast</h3>
        <div className="grid gap-4">
          <input className="border p-2 rounded" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          <textarea className="border p-2 rounded" placeholder="Message" value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
          <select className="border p-2 rounded" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
            <option value="system_alert">System Alert</option>
            <option value="promotion">Promotion</option>
            <option value="order_update">Order Update</option>
          </select>
          <select className="border p-2 rounded" value={form.target_role} onChange={e => setForm({...form, target_role: e.target.value})}>
            <option value="All">All Users</option>
            <option value="Pharmacy Owner">Pharmacy Owners</option>
            <option value="Depot Staff">Depot Staff</option>
            <option value="Delivery Staff">Delivery Staff</option>
          </select>
          <button onClick={sendNotification} className="bg-brand-purple text-white p-2 rounded">Send Notification</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <h3 className="font-bold mb-4">History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left">Message</th>
                <th className="p-2 text-left">Target</th>
                <th className="p-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => (
                <tr key={n.id} className="border-b">
                  <td className="p-2">{n.title}</td>
                  <td className="p-2">{n.message}</td>
                  <td className="p-2">{n.role_target || "All"}</td>
                  <td className="p-2">{new Date(n.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
