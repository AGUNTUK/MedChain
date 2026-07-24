import React, { useState, useEffect } from "react";
import { User, Order } from "../types";
import { Truck, CheckCircle2, AlertTriangle, LogOut, Package, Phone, X, ShieldCheck } from "lucide-react";
import NotificationBell from "./NotificationBell";

interface DeliveryDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export default function DeliveryDashboard({ currentUser, onLogout }: DeliveryDashboardProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "history">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [otpModalOrder, setOtpModalOrder] = useState<Order | null>(null);
  const [otp, setOtp] = useState("");
  const [failureModalOrder, setFailureModalOrder] = useState<Order | null>(null);
  const [failureReason, setFailureReason] = useState("");

  const refreshData = async () => {
    setLoading(true);
    try {
      const [resOrders, resHistory] = await Promise.all([
        fetch("/api/delivery/orders").then(r => r.json()),
        fetch("/api/delivery/history").then(r => r.json())
      ]);
      if (resOrders.success) setOrders(resOrders.orders);
      if (resHistory.success) setHistory(resHistory.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleStatusChange = async (orderId: string, status: string, notes?: string, providedOtp?: string) => {
    try {
      const res = await fetch(`/api/delivery/status/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, otp: providedOtp, notes })
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Error: ${errData.error}`);
        return;
      }
      setOtpModalOrder(null);
      setFailureModalOrder(null);
      setOtp("");
      setFailureReason("");
      refreshData();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const stats = {
    assigned: orders.filter(o => o.status === "Packed").length,
    inTransit: orders.filter(o => o.status === "Out for Delivery").length,
    completed: history.filter(o => o.status === "Delivered" || o.status === "Completed").length,
    failed: orders.filter(o => o.status === "Failed").length + history.filter(o => o.status === "Failed").length
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile App Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center font-black text-white text-xs">
              MC
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-slate-900">MEDICHAIN</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Rider Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Dynamic Mobile Metrics - 2x2 Grid */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Assigned</p>
                <p className="text-xl font-black text-amber-700">{stats.assigned}</p>
              </div>
              <Package className="w-6 h-6 text-amber-500 opacity-50" />
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">In Transit</p>
                <p className="text-xl font-black text-indigo-700">{stats.inTransit}</p>
              </div>
              <Truck className="w-6 h-6 text-indigo-500 opacity-50" />
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Completed</p>
                <p className="text-xl font-black text-emerald-700">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-50" />
            </div>
            <div className="bg-rose-50 rounded-xl p-3 border border-rose-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Failed</p>
                <p className="text-xl font-black text-rose-700">{stats.failed}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-rose-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Top Tabs */}
        <div className="flex border-t border-slate-100">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "orders" ? "text-brand-purple border-b-2 border-brand-purple" : "text-slate-400"
            }`}
          >
            Active Orders
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "history" ? "text-brand-purple border-b-2 border-brand-purple" : "text-slate-400"
            }`}
          >
            History
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple"></div>
          </div>
        ) : activeTab === "orders" ? (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-500">No active deliveries assigned.</p>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded">
                        #{order.readableId || order.id.substring(0,8)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                        order.paymentMethod === "Cash on Delivery" 
                          ? "bg-amber-100 text-amber-700" 
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {order.paymentMethod === "Cash on Delivery" ? `Collect ৳${order.totalAmount}` : "Paid Online"}
                      </span>
                    </div>
                    
                    <h3 className="font-black text-lg text-slate-900 mt-2">{order.pharmacyName || "Pharmacy"}</h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {order.deliveryAddress || "Address not provided"}
                    </p>
                    
                    {order.notes && (
                      <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 mb-1">Depot Instructions:</p>
                        <p className="text-xs text-slate-700">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 flex flex-col gap-2">
                    {order.status === "Packed" && (
                      <button 
                        onClick={() => handleStatusChange(order.id, "Out for Delivery")}
                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        Accept & Pick Up
                      </button>
                    )}

                    {order.status === "Out for Delivery" && (
                      <>
                        <div className="flex gap-2">
                          <a 
                            href={`tel:${order.pharmacyPhone || "+8801900000000"}`} 
                            className="flex-1 h-12 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Phone className="w-4 h-4 text-brand-lime" />
                            Call Owner
                          </a>
                          <button 
                            onClick={() => setFailureModalOrder(order)}
                            className="flex-1 h-12 bg-white border border-rose-200 text-rose-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-rose-50"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Unable to Deliver
                          </button>
                        </div>
                        <button 
                          onClick={() => setOtpModalOrder(order)}
                          className="w-full h-12 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                        >
                          <ShieldCheck className="w-5 h-5" />
                          Verify & Complete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-500">No completed deliveries yet.</p>
              </div>
            ) : (
              history.map(order => (
                <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-slate-900">#{order.readableId || order.id.substring(0,8)}</span>
                      {order.status === "Failed" ? (
                        <span className="flex items-center gap-1 bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                          <AlertTriangle className="w-3 h-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${order.status === "Failed" ? "text-rose-500 line-through" : "text-brand-purple"}`}>
                      ৳{order.totalAmount}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">
                      {order.status === "Failed" ? "Not Collected" : "Collected"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* OTP Verification Modal */}
      {otpModalOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-slate-900">Verify Handover</h3>
                <button onClick={() => setOtpModalOrder(null)} className="p-2 -mr-2 bg-slate-100 rounded-full text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Ask the pharmacy owner for their 6-digit handover OTP to confirm receipt of the delivery.
              </p>
              
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[0.5em] font-mono font-black py-4 border-2 border-slate-200 rounded-xl focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/20 outline-none transition-all mb-6"
              />

              <button
                onClick={() => handleStatusChange(otpModalOrder.id, "Delivered", undefined, otp)}
                disabled={otp.length !== 6}
                className="w-full h-12 bg-brand-purple text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failure Reporting Bottom Sheet */}
      {failureModalOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-slate-900 text-rose-600">Report Failure</h3>
                <button onClick={() => setFailureModalOrder(null)} className="p-2 -mr-2 bg-slate-100 rounded-full text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2 mb-6">
                {["Pharmacy Closed", "Customer Refused", "Unreachable", "Cash Not Ready", "Other"].map(reason => (
                  <label key={reason} className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                    <input 
                      type="radio" 
                      name="failureReason" 
                      value={reason} 
                      checked={failureReason === reason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-sm font-bold text-slate-700">{reason}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={() => handleStatusChange(failureModalOrder.id, "Failed", failureReason)}
                disabled={!failureReason}
                className="w-full h-12 bg-rose-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 disabled:shadow-none transition-all"
              >
                Submit Failure Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
