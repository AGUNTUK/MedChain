import React, { useState, useEffect } from "react";
import { User, Order, Product } from "../types";
import { 
  LayoutDashboard, ShoppingCart, Boxes, Truck, LogOut, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, Package, Scan, QrCode, X, Search, 
  Edit, Eye, Plus, FileText, Zap, Calendar, ArrowRight, Activity, MapPin
} from "lucide-react";
import { productService, orderService } from "../services";
import OrderCenter from "./depot/OrderCenter";
import Inventory from "./depot/Inventory";
import Delivery from "./depot/Delivery";
import NotificationBell from "./NotificationBell";
import { getRackLocation, saveRackLocation } from "./depot/depotUtils";

interface DepotDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

interface StatusFeedItem {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
}

export default function DepotDashboard({ currentUser, onLogout }: DepotDashboardProps) {
  const [activeRoute, setActiveRoute] = useState<"/depot/dashboard" | "/depot/orders" | "/depot/inventory" | "/depot/delivery">("/depot/dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // KPI card selection filter for Dashboard view
  const [activeKpiFilter, setActiveKpiFilter] = useState<"pending" | "processing" | "packed" | "dispatch" | "lowStock" | "expiring" | null>(null);

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedQuery, setScannedQuery] = useState("");
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [isEditingScanned, setIsEditingScanned] = useState(false);
  const [editStockQty, setEditStockQty] = useState(0);
  const [editBatchNo, setEditBatchNo] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editRackLoc, setEditRackLoc] = useState("");
  const [cameraStreamActive, setCameraStreamActive] = useState(false);

  // Real-time WMS activity feed
  const [statusFeed, setStatusFeed] = useState<StatusFeedItem[]>([
    { id: "1", time: "10:14 AM", message: "Initial FEFO catalog audit finished by automated system.", type: "info" },
    { id: "2", time: "09:42 AM", message: "Order #ORD-1025 moved to PROCESSING. Picker dispatched to Sector A.", type: "success" },
    { id: "3", time: "08:15 AM", message: "Napa Syrup batch B-332 adjusted: Stock count corrected on Rack B-03.", type: "info" },
    { id: "4", time: "07:30 AM", message: "FEFO Alert: 5 items found expiring in less than 90 days. Relabeled.", type: "warning" }
  ]);

  const addFeedItem = (message: string, type: "info" | "success" | "warning" | "alert" = "info") => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newItem: StatusFeedItem = {
      id: Math.random().toString(),
      time: timeStr,
      message,
      type
    };
    setStatusFeed(prev => [newItem, ...prev.slice(0, 9)]); // Keep last 10
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const [ordRes, prodRes] = await Promise.all([
        fetch("/api/depot/orders"),
        productService.getProducts()
      ]);
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData.orders || []);
      }
      setProducts(prodRes || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to synchronize depot database state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOrderAction = async (orderId: string, action: "accept" | "process" | "pack") => {
    try {
      const res = await fetch(`/api/depot/orders/${orderId}/${action}`, { method: "POST" });
      if (res.ok) {
        setSuccessMsg(`Order successfully progressed via ${action.toUpperCase()} action.`);
        addFeedItem(`Order #${orderId.substring(0, 8)} status progressed: ${action.toUpperCase()}`, "success");
        refreshData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg("Failed to progress order workflow.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error progressing order.");
    }
  };

  // Helper to trigger scan simulator
  const handleSimulateScan = (prod: Product) => {
    setScannedProduct(prod);
    setEditStockQty(prod.availableStock);
    setEditBatchNo(prod.batchNumber);
    setEditExpiryDate(prod.expiryDate);
    setEditRackLoc(getRackLocation(prod.id, prod.name, prod.category));
    setIsEditingScanned(false);
    addFeedItem(`Barcode/QR Swiped: Scanned ${prod.name} (Batch: ${prod.batchNumber})`, "info");
  };

  const handleQuickUpdateStock = async () => {
    if (!scannedProduct) return;
    try {
      const res = await fetch("/api/admin/inventory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scannedProduct.id,
          availableStock: editStockQty,
          batchNumber: editBatchNo,
          expiryDate: editExpiryDate
        })
      });

      if (res.ok) {
        // Save the custom rack location in localStorage
        saveRackLocation(scannedProduct.id, editRackLoc);

        setSuccessMsg(`Inventory updated successfully for ${scannedProduct.name}.`);
        addFeedItem(`Stock adjusted for ${scannedProduct.name} to ${editStockQty} units. Rack: ${editRackLoc}`, "warning");
        refreshData();
        setIsScannerOpen(false);
        setScannedProduct(null);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg("Failed to write updated inventory back to DB.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error committing stock update.");
    }
  };

  // KPI Calculations
  const stats = {
    pending: orders.filter(o => o.status === "Pending").length,
    processing: orders.filter(o => o.status === "Processing" || o.status === "Confirmed").length,
    packed: orders.filter(o => o.status === "Packed").length,
    dispatch: orders.filter(o => o.status === "Out for Delivery").length,
    lowStock: products.filter(p => p.availableStock < 100).length,
    expiring: products.filter(p => {
      const days = Math.floor((new Date(p.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      return days < 180; // < 6 months
    }).length,
  };

  // Helper to handle camera simulation
  const toggleCamera = () => {
    setCameraStreamActive(!cameraStreamActive);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR - DESKTOP VIEW */}
      <aside className="hidden md:flex w-64 bg-slate-950 border-r border-slate-800 flex-col justify-between shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 select-none">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shadow-md shadow-indigo-600/30">
              MC
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-slate-100">MEDICHAIN</h1>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">WMS WAREHOUSE</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => { setActiveRoute("/depot/dashboard"); setActiveKpiFilter(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeRoute === "/depot/dashboard" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>Dashboard Overview</span>
            </button>
            <button
              onClick={() => setActiveRoute("/depot/orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeRoute === "/depot/orders" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              }`}
            >
              <ShoppingCart className="w-4.5 h-4.5" />
              <span>Order Center ({stats.pending + stats.processing})</span>
            </button>
            <button
              onClick={() => setActiveRoute("/depot/inventory")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeRoute === "/depot/inventory" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              }`}
            >
              <Boxes className="w-4.5 h-4.5" />
              <span>FEFO Inventory View</span>
            </button>
            <button
              onClick={() => setActiveRoute("/depot/delivery")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeRoute === "/depot/delivery" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              }`}
            >
              <Truck className="w-4.5 h-4.5" />
              <span>Delivery Handover ({stats.packed})</span>
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-slate-100 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Depot Staff</p>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer transition-all"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* MOBILE RESPONSIVE TOP HEADER */}
      <header className="md:hidden w-full bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-xs">
            MC
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider text-slate-100">MEDICHAIN</h1>
            <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest">WMS Mobile</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button 
            onClick={onLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* MAIN MAIN MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        
        {/* Alerts */}
        {successMsg && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            {errorMsg}
          </div>
        )}

        {/* Title and stats heading */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-indigo-500" />
              {activeRoute === "/depot/dashboard" && "WMS Depot Center"}
              {activeRoute === "/depot/orders" && "Enterprise Order Processing"}
              {activeRoute === "/depot/inventory" && "Warehouse FEFO Inventory"}
              {activeRoute === "/depot/delivery" && "Rider Handover Center"}
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Logged in as <span className="text-slate-100 font-semibold">{currentUser.name}</span> • Terminal #WMS-01
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={loading}
              className="bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Sync WMS</span>
            </button>
          </div>
        </div>

        {/* ==================== DASHBOARD TAB ==================== */}
        {activeRoute === "/depot/dashboard" && (
          <div className="space-y-6">
            
            {/* Clickable KPI Cards Grid */}
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Filter Warehouse Tasks by KPI</p>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {[
                  { id: "pending", label: "Pending Orders", value: stats.pending, icon: Clock, color: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40" },
                  { id: "processing", label: "Processing", value: stats.processing, icon: RefreshCw, color: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40" },
                  { id: "packed", label: "Packed (Ready)", value: stats.packed, icon: Package, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40" },
                  { id: "dispatch", label: "Today Dispatch", value: stats.dispatch, icon: Truck, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40" },
                  { id: "lowStock", label: "Low Stock Items", value: stats.lowStock, icon: AlertTriangle, color: "text-rose-400 bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40" },
                  { id: "expiring", label: "Expiring Items", value: stats.expiring, icon: AlertTriangle, color: "text-rose-300 bg-rose-700/10 border-rose-700/20 hover:border-rose-700/40" },
                ].map(stat => (
                  <button
                    key={stat.id}
                    onClick={() => setActiveKpiFilter(activeKpiFilter === stat.id ? null : stat.id as any)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${stat.color} ${
                      activeKpiFilter === stat.id ? "ring-2 ring-indigo-500 scale-[1.02] bg-indigo-950/20" : "bg-slate-950"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">{stat.label}</p>
                      <stat.icon className="w-3.5 h-3.5 opacity-60" />
                    </div>
                    <p className="text-2xl font-black mt-1 text-slate-100">{stat.value}</p>
                    <p className="text-[8px] text-slate-500 mt-1 uppercase font-bold">
                      {activeKpiFilter === stat.id ? "● Active Filter" : "Click to view"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Interactive Work Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Dynamic KPI Filter List view */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                    {activeKpiFilter ? `FILTERED LIST: ${activeKpiFilter.toUpperCase()}` : "Active Orders Waiting Action"}
                  </h2>
                  {activeKpiFilter && (
                    <button 
                      onClick={() => setActiveKpiFilter(null)} 
                      className="text-[10px] text-indigo-400 font-bold hover:underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center p-12 bg-slate-950 rounded-2xl border border-slate-800">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : activeKpiFilter === null ? (
                  /* DEFAULT VIEW: Highlight orders needing pick / pack */
                  <div className="space-y-3">
                    {orders.filter(o => o.status === "Pending" || o.status === "Confirmed" || o.status === "Processing").length === 0 ? (
                      <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                        No active orders currently waiting in queue.
                      </div>
                    ) : (
                      orders.filter(o => o.status === "Pending" || o.status === "Confirmed" || o.status === "Processing").map(order => (
                        <div key={order.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-200">#{order.readableId || order.id.substring(0, 8)}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                order.status === "Pending" ? "bg-amber-500/10 text-amber-400" :
                                order.status === "Confirmed" ? "bg-blue-500/10 text-blue-400" : "bg-indigo-500/10 text-indigo-400"
                              }`}>{order.status}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-semibold">{order.items?.length || 0} unique medicines • Total: ৳{order.totalAmount}</p>
                          </div>
                          <div className="flex gap-2">
                            {order.status === "Pending" && (
                              <button 
                                onClick={() => handleOrderAction(order.id, "accept")}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all cursor-pointer"
                              >
                                Accept Order
                              </button>
                            )}
                            {order.status === "Confirmed" && (
                              <button 
                                onClick={() => handleOrderAction(order.id, "process")}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all cursor-pointer"
                              >
                                Start Picking
                              </button>
                            )}
                            {order.status === "Processing" && (
                              <button 
                                onClick={() => handleOrderAction(order.id, "pack")}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all cursor-pointer"
                              >
                                Mark Packed
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* FILTERED KPI LIST VIEW */
                  <div className="space-y-3">
                    {/* Filtered Orders list */}
                    {(activeKpiFilter === "pending" || activeKpiFilter === "processing" || activeKpiFilter === "packed" || activeKpiFilter === "dispatch") && (
                      orders.filter(o => {
                        if (activeKpiFilter === "pending") return o.status === "Pending";
                        if (activeKpiFilter === "processing") return o.status === "Processing" || o.status === "Confirmed";
                        if (activeKpiFilter === "packed") return o.status === "Packed";
                        if (activeKpiFilter === "dispatch") return o.status === "Out for Delivery";
                        return false;
                      }).length === 0 ? (
                        <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                          No orders matched this KPI filter.
                        </div>
                      ) : (
                        orders.filter(o => {
                          if (activeKpiFilter === "pending") return o.status === "Pending";
                          if (activeKpiFilter === "processing") return o.status === "Processing" || o.status === "Confirmed";
                          if (activeKpiFilter === "packed") return o.status === "Packed";
                          if (activeKpiFilter === "dispatch") return o.status === "Out for Delivery";
                          return false;
                        }).map(order => (
                          <div key={order.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-200">Order #{order.readableId || order.id.substring(0, 8)}</span>
                                <span className="text-[10px] text-indigo-400 font-bold">৳{order.totalAmount}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 font-semibold">{order.items?.length || 0} products • Est: {order.estimatedDelivery}</p>
                            </div>
                            <button
                              onClick={() => { setActiveRoute("/depot/orders"); }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>Manage in Orders</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )
                    )}

                    {/* Filtered Products list */}
                    {(activeKpiFilter === "lowStock" || activeKpiFilter === "expiring") && (
                      products.filter(p => {
                        if (activeKpiFilter === "lowStock") return p.availableStock < 100;
                        if (activeKpiFilter === "expiring") {
                          const days = Math.floor((new Date(p.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                          return days < 180;
                        }
                        return false;
                      }).slice(0, 15).length === 0 ? ( // Cap at 15 items on dashboard
                        <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                          No products found for this category.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {products.filter(p => {
                            if (activeKpiFilter === "lowStock") return p.availableStock < 100;
                            if (activeKpiFilter === "expiring") {
                              const days = Math.floor((new Date(p.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                              return days < 180;
                            }
                            return false;
                          }).slice(0, 15).map(prod => {
                            const daysLeft = Math.floor((new Date(prod.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                            return (
                              <div key={prod.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between text-xs">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-slate-200 truncate pr-2">{prod.name}</span>
                                    {activeKpiFilter === "lowStock" ? (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold text-[9px] uppercase">LOW STOCK</span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[9px] uppercase">EXPIRING</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1">{prod.genericName}</p>
                                  <div className="mt-2.5 space-y-1 text-[10px] text-slate-300">
                                    <div className="flex items-center gap-1.5">
                                      <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>Stock: <strong className="text-white">{prod.availableStock} units</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>Expiry: <strong className="text-white">{prod.expiryDate} ({daysLeft} days)</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>Shelf: <strong className="text-white">{getRackLocation(prod.id, prod.name, prod.category)}</strong></span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setIsScannerOpen(true);
                                    handleSimulateScan(prod);
                                  }}
                                  className="mt-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 font-bold py-1 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Edit className="w-3 h-3" /> Quick Edit Info
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Warehouse Live Status Feed */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col h-[400px]">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest border-b border-slate-800 pb-2.5 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Real-time Status Feed
                </h3>
                <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1 text-xs">
                  {statusFeed.map(item => (
                    <div key={item.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-900 flex gap-2">
                      <span className="font-mono text-[9px] text-indigo-400 shrink-0 mt-0.5">{item.time}</span>
                      <p className="text-[11px] text-slate-300">{item.message}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================== WORKFLOW TAB ROUTING ==================== */}
        {activeRoute === "/depot/orders" && (
          <OrderCenter 
            orders={orders} 
            onAccept={(id) => handleOrderAction(id, "accept")} 
            onProcess={(id) => handleOrderAction(id, "process")} 
            onPack={(id) => handleOrderAction(id, "pack")} 
          />
        )}
        {activeRoute === "/depot/inventory" && (
          <Inventory 
            products={products} 
            onQuickEdit={(p) => {
              setIsScannerOpen(true);
              handleSimulateScan(p);
            }} 
          />
        )}
        {activeRoute === "/depot/delivery" && (
          <Delivery 
            orders={orders} 
            onProgress={() => {
              refreshData();
              addFeedItem("Delivery status progressed via rider handover verification.", "success");
            }} 
          />
        )}

      </main>

      {/* ==================== FLOATING QUICK ACTION BARCODE/QR SCANNER FAB ==================== */}
      <button
        onClick={() => setIsScannerOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 z-30 cursor-pointer hover:scale-105 active:scale-95 transition-all group"
        title="Open Barcode Scanner"
      >
        <Scan className="w-6 h-6 group-hover:rotate-90 transition-all duration-300" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
        </span>
      </button>

      {/* ==================== MOBILE RESPONSIVE BOTTOM NAVIGATION BAR ==================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 flex justify-around items-center py-2 z-20 shadow-lg">
        {[
          { id: "/depot/dashboard", label: "Home", icon: LayoutDashboard },
          { id: "/depot/orders", label: "Orders", icon: ShoppingCart },
          { id: "/depot/inventory", label: "Inventory", icon: Boxes },
          { id: "/depot/delivery", label: "Handover", icon: Truck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveRoute(tab.id as any); setActiveKpiFilter(null); }}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeRoute === tab.id ? "text-indigo-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[9px] uppercase tracking-wide">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ==================== SIMULATED BARCODE/QR SCANNER MODAL ==================== */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">WMS Scanner Companion</h3>
              </div>
              <button 
                onClick={() => { setIsScannerOpen(false); setScannedProduct(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* Animated Scan Window / Mock Camera feed */}
              <div className="relative bg-black rounded-xl overflow-hidden border border-slate-800 h-44 flex flex-col items-center justify-center group">
                
                {/* Horizontal scanner red laser line */}
                <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] top-1/2 animate-bounce z-10"></div>
                
                {cameraStreamActive ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    {/* Simulated scanning grain */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[length:100%_4px,_6px_100%] opacity-40"></div>
                    <div className="text-center p-4">
                      <span className="block text-indigo-400 font-mono text-[10px] uppercase tracking-widest animate-pulse">● FEED: ACTIVE</span>
                      <p className="text-[11px] text-slate-400 mt-1 font-semibold">Align barcode inside scan viewport area</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Scan className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
                    <p className="text-[11px] text-slate-400 font-semibold">Camera standby. Start stream or pick from stock below.</p>
                    <button
                      onClick={toggleCamera}
                      className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-bold py-1 px-3 rounded-lg text-[10px] cursor-pointer"
                    >
                      Initialize Camera Stream
                    </button>
                  </div>
                )}

                {/* Corner markers for scan viewport */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-indigo-500"></div>
                <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-indigo-500"></div>
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-indigo-500"></div>
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-indigo-500"></div>
              </div>

              {/* Scanned/Search Input Fallback */}
              {!scannedProduct && (
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Manual Lookup or Sim Swipe</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Type medicine name to simulate barcode swipe..."
                      value={scannedQuery}
                      onChange={(e) => {
                        setScannedQuery(e.target.value);
                        const match = products.find(p => p.name.toLowerCase().includes(e.target.value.toLowerCase()));
                        if (match && e.target.value.length > 2) {
                          handleSimulateScan(match);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Suggest common products to instant click-scan */}
                  <div className="space-y-1.5 mt-2">
                    <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Instant Demo Swipe Shortcuts</p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {products.slice(0, 10).map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSimulateScan(p)}
                          className="bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-all"
                        >
                          Swipe: {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Result detail & Inline Quick Edit */}
              {scannedProduct && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-indigo-400 text-xs">{scannedProduct.name}</h4>
                      <p className="text-[10px] text-slate-400">{scannedProduct.genericName} • {scannedProduct.company}</p>
                    </div>
                    <button
                      onClick={() => setScannedProduct(null)}
                      className="text-[10px] text-rose-400 font-bold hover:underline"
                    >
                      Clear Scan
                    </button>
                  </div>

                  {!isEditingScanned ? (
                    /* Display scanned stats & Optimal Picking Path Shelf location */
                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800/40">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">WMS Rack Shelf Location</span>
                        <span className="font-extrabold text-emerald-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {editRackLoc}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800/40">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">Current Stock Available</span>
                        <span className="font-extrabold text-slate-200">{scannedProduct.availableStock} units</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800/40">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">Current Batch No</span>
                        <span className="font-semibold text-slate-300 font-mono">{scannedProduct.batchNumber}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800/40">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">FEFO Expiry Date</span>
                        <span className="font-semibold text-slate-300">{scannedProduct.expiryDate}</span>
                      </div>

                      <div className="col-span-2">
                        <button
                          onClick={() => setIsEditingScanned(true)}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" /> Edit Stock, Batch & Location
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Edit Form */
                    <div className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Stock Available</label>
                          <input
                            type="number"
                            value={editStockQty}
                            onChange={(e) => setEditStockQty(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Batch Number</label>
                          <input
                            type="text"
                            value={editBatchNo}
                            onChange={(e) => setEditBatchNo(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Expiry Date</label>
                          <input
                            type="date"
                            value={editExpiryDate}
                            onChange={(e) => setEditExpiryDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rack / Shelf Location</label>
                          <input
                            type="text"
                            value={editRackLoc}
                            onChange={(e) => setEditRackLoc(e.target.value)}
                            placeholder="e.g. Rack A-04, Shelf 2"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          onClick={() => setIsEditingScanned(false)}
                          className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white font-bold py-2 rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleQuickUpdateStock}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
