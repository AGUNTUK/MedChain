import React, { useState, useEffect } from "react";
import { orderService } from "../services/order";
import { Download, CreditCard, ShoppingBag, TrendingUp, AlertCircle } from "lucide-react";

export default function PharmacyDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/pharmacy/dashboard-summary")
      .then(res => res.json())
      .then(setSummary);
    
    orderService.getOrders().then(setOrders);
  }, []);

  if (!summary) return <div>Loading...</div>;

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
                  <button onClick={() => orderService.downloadInvoice(o.id).then(res => window.open(res.invoiceUrl, "_blank"))} className="text-brand-purple">
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
