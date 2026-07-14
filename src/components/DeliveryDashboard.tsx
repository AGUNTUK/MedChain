import React, { useState, useEffect } from "react";
import { User, Order } from "../types";
import { LayoutDashboard, Truck, CheckCircle2, AlertTriangle, LogOut, Package, ClipboardList, Clock } from "lucide-react";
import { orderService } from "../services";
import NotificationBell from "./NotificationBell";

interface DeliveryDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export default function DeliveryDashboard({ currentUser, onLogout }: DeliveryDashboardProps) {
  const [activeRoute, setActiveRoute] = useState<"/delivery/dashboard" | "/delivery/orders" | "/delivery/history">("/delivery/dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/delivery/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleStatusChange = async (orderId: string, status: string) => {
      try {
          await fetch(`/api/delivery/status/${orderId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status })
          });
          refreshData();
      } catch (err) {
          console.error(err);
      }
  }

  const stats = {
    assigned: orders.filter(o => o.status === "Confirmed").length,
    pickedUp: orders.filter(o => o.status === "Processing").length,
    inTransit: orders.filter(o => o.status === "Out for Delivery").length,
    completed: orders.filter(o => o.status === "Delivered").length,
    failed: 0 // Placeholder for now
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 select-none">
            <div className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center font-black text-white">
              MC
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-slate-900">MEDICHAIN</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Delivery Staff</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveRoute("/delivery/dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/delivery/dashboard" ? "bg-brand-purple text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveRoute("/delivery/orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/delivery/orders" ? "bg-brand-purple text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>My Orders</span>
            </button>
            <button
              onClick={() => setActiveRoute("/delivery/history")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/delivery/history" ? "bg-brand-purple text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>History</span>
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Delivery Staff</p>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer transition-all"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {activeRoute === "/delivery/dashboard" && "Delivery Operations Dashboard"}
            {activeRoute === "/delivery/orders" && "My Delivery Orders"}
            {activeRoute === "/delivery/history" && "Delivery History"}
          </h1>
          <NotificationBell />
        </div>

        {activeRoute === "/delivery/dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: "Assigned", value: stats.assigned, icon: ClipboardList, color: "text-amber-500" },
              { label: "Picked Up", value: stats.pickedUp, icon: Package, color: "text-blue-500" },
              { label: "In Transit", value: stats.inTransit, icon: Truck, color: "text-indigo-500" },
              { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Failed", value: stats.failed, icon: AlertTriangle, color: "text-rose-500" },
            ].map(stat => (
              <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-10 h-10 ${stat.color} opacity-20`} />
              </div>
            ))}
          </div>
        )}

        {activeRoute === "/delivery/orders" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-bold text-slate-500 uppercase">Order ID</th>
                    <th className="p-4 font-bold text-slate-500 uppercase">Status</th>
                    <th className="p-4 font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900">{order.id}</td>
                      <td className="p-4 font-semibold text-slate-600">{order.status}</td>
                      <td className="p-4 flex gap-2">
                          {order.status === "Confirmed" && <button onClick={() => handleStatusChange(order.id, "Processing")} className="text-amber-600 font-bold hover:underline">Accept</button>}
                          {order.status === "Processing" && <button onClick={() => handleStatusChange(order.id, "Packed")} className="text-blue-600 font-bold hover:underline">Mark Picked</button>}
                          {order.status === "Packed" && <button onClick={() => handleStatusChange(order.id, "Out for Delivery")} className="text-indigo-600 font-bold hover:underline">Start Delivery</button>}
                          {order.status === "Out for Delivery" && <button onClick={() => handleStatusChange(order.id, "Delivered")} className="text-emerald-600 font-bold hover:underline">Confirm Delivered</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}
        {activeRoute === "/delivery/history" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="p-4 font-bold text-slate-500 uppercase">Order ID</th>
                            <th className="p-4 font-bold text-slate-500 uppercase">Amount</th>
                            <th className="p-4 font-bold text-slate-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.filter(o => o.status === "Delivered").map(order => (
                            <tr key={order.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-900">{order.id}</td>
                                <td className="p-4 font-bold text-slate-900">৳{order.totalAmount}</td>
                                <td className="p-4 font-semibold text-slate-600">{order.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </main>
    </div>
  );
}
