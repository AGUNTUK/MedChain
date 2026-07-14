import React from "react";
import { Order } from "../../types";

interface DeliveryProps {
  orders: Order[];
}

export default function Delivery({ orders }: DeliveryProps) {
  const deliveryOrders = orders.filter(o => o.status === "Out for Delivery");
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="p-4 font-bold text-slate-500 uppercase">Order ID</th>
            <th className="p-4 font-bold text-slate-500 uppercase">Status</th>
            <th className="p-4 font-bold text-slate-500 uppercase">Address</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {deliveryOrders.map(order => (
            <tr key={order.id} className="hover:bg-slate-50">
              <td className="p-4 font-bold text-slate-900">{order.id}</td>
              <td className="p-4 font-semibold text-slate-600">{order.status}</td>
              <td className="p-4 font-semibold text-slate-600">{order.deliveryAddress || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
