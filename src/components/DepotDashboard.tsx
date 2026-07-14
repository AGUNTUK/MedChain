import React, { useState, useEffect } from "react";
import { User, Order, Product } from "../types";
import { LayoutDashboard, ShoppingCart, Boxes, Truck, LogOut, CheckCircle2, AlertTriangle, Clock, RefreshCw, Package } from "lucide-react";
import { productService, orderService } from "../services";
import OrderCenter from "./depot/OrderCenter";
import Inventory from "./depot/Inventory";
import Delivery from "./depot/Delivery";

interface DepotDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export default function DepotDashboard({ currentUser, onLogout }: DepotDashboardProps) {
  const [activeRoute, setActiveRoute] = useState<"/depot/dashboard" | "/depot/orders" | "/depot/inventory" | "/depot/delivery">("/depot/dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [ordRes, prodRes] = await Promise.all([
        fetch("/api/depot/orders"),
        productService.getProducts()
      ]);
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData.orders);
      }
      setProducts(prodRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOrderAction = async (orderId: string, action: "accept" | "process" | "pack") => {
    try {
      await fetch(`/api/depot/orders/${orderId}/${action}`, { method: "POST" });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const stats = {
    pending: orders.filter(o => o.status === "Pending").length,
    processing: orders.filter(o => o.status === "Processing" || o.status === "Confirmed").length,
    packed: orders.filter(o => o.status === "Packed").length,
    dispatch: orders.filter(o => o.status === "Out for Delivery").length,
    lowStock: products.filter(p => p.availableStock < 100).length,
    expiring: products.filter(p => new Date(p.expiryDate) <= new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)).length,
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 select-none">
            <div className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center font-black text-white">
              MC
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-slate-900">MEDICHAIN</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Depot Staff</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveRoute("/depot/dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/depot/dashboard" ? "bg-brand-purple text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveRoute("/depot/orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/depot/orders" ? "bg-brand-purple text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Order Center</span>
            </button>
            <button
              onClick={() => setActiveRoute("/depot/inventory")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/depot/inventory" ? "bg-brand-purple text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Inventory View</span>
            </button>
            <button
              onClick={() => setActiveRoute("/depot/delivery")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/depot/delivery" ? "bg-brand-purple text-white shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Delivery Handover</span>
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Depot Staff</p>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto p-8">
        <h1 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">
          {activeRoute === "/depot/dashboard" && "Depot Operations Dashboard"}
          {activeRoute === "/depot/orders" && "Order Processing Center"}
          {activeRoute === "/depot/inventory" && "Medicine Inventory View"}
          {activeRoute === "/depot/delivery" && "Delivery Handover"}
        </h1>

        {activeRoute === "/depot/dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: "Pending Orders", value: stats.pending, icon: Clock, color: "text-amber-500" },
              { label: "Processing", value: stats.processing, icon: RefreshCw, color: "text-blue-500" },
              { label: "Packed Orders", value: stats.packed, icon: Package, color: "text-indigo-500" },
              { label: "Today's Dispatch", value: stats.dispatch, icon: Truck, color: "text-emerald-500" },
              { label: "Low Stock Items", value: stats.lowStock, icon: AlertTriangle, color: "text-rose-500" },
              { label: "Expiring Items", value: stats.expiring, icon: AlertTriangle, color: "text-rose-700" },
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
        {activeRoute === "/depot/orders" && (
          <OrderCenter 
            orders={orders} 
            onAccept={(id) => handleOrderAction(id, "accept")} 
            onProcess={(id) => handleOrderAction(id, "process")} 
            onPack={(id) => handleOrderAction(id, "pack")} 
          />
        )}
        {activeRoute === "/depot/inventory" && <Inventory products={products} />}
        {activeRoute === "/depot/delivery" && <Delivery orders={orders} />}
      </main>
    </div>
  );
}
