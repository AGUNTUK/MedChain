import React, { useState, useEffect } from "react";
import { orderService } from "../services/order";
import { Download, CreditCard, ShoppingBag, TrendingUp, AlertCircle } from "lucide-react";

export default function PharmacyDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pharmacy/dashboard-summary")
      .then(res => {
        const isJson = res.headers.get("content-type")?.includes("application/json");
        if (!res.ok || !isJson) throw new Error("Failed to load dashboard summary");
        return res.json();
      })
      .then(data => {
        setSummary(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Dashboard summary sync error:", err);
        setSummary({
          totalOrders: 0,
          monthlyPurchase: 0,
          creditLimit: 0,
          outstandingDue: 0
        });
        setLoading(false);
      });
    
    orderService.getOrders()
      .then(setOrders)
      .catch(console.error);
  }, []);

  if (loading && !summary) {
    return (
      <div className="p-8 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
        Syncing business overview...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Business Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-500">Total Orders</p>
          <p className="text-xl font-bold">{summary.totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-500">Monthly Purchase</p>
          <p className="text-xl font-bold">৳{summary.monthlyPurchase}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-500">Credit Limit</p>
          <p className="text-xl font-bold">৳{summary.creditLimit}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-500">Outstanding Due</p>
          <p className="text-xl font-bold text-rose-600">৳{summary.outstandingDue}</p>
        </div>
      </div>

      {/* Purchase History */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <h3 className="font-bold mb-4">Purchase History</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th>Order ID</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t">
                <td className="py-2">{o.id}</td>
                <td className="py-2">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="py-2">৳{o.totalAmount}</td>
                <td className="py-2">
                  <button onClick={() => orderService.downloadInvoice(o.id).then(res => window.open(res.invoiceUrl, "_blank")).catch(console.error)} className="text-brand-purple">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
