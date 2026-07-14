import React from "react";
import { Order } from "../../types";
import { CheckCircle2, Clock, Truck, Package } from "lucide-react";

interface OrderCenterProps {
  orders: Order[];
  onAccept: (orderId: string) => void;
  onProcess: (orderId: string) => void;
  onPack: (orderId: string) => void;
}

export default function OrderCenter({ orders, onAccept, onProcess, onPack }: OrderCenterProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="p-4 font-bold text-slate-500 uppercase">Order ID</th>
            <th className="p-4 font-bold text-slate-500 uppercase">Status</th>
            <th className="p-4 font-bold text-slate-500 uppercase">Amount</th>
            <th className="p-4 font-bold text-slate-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map(order => (
            <tr key={order.id} className="hover:bg-slate-50">
              <td className="p-4 font-bold text-slate-900">{order.id}</td>
              <td className="p-4 font-semibold text-slate-600">{order.status}</td>
              <td className="p-4 font-bold text-slate-900">৳{order.totalAmount}</td>
              <td className="p-4 flex gap-2">
                {order.status === "Pending" && <button onClick={() => onAccept(order.id)} className="text-amber-600 font-bold hover:underline">Accept</button>}
                {order.status === "Confirmed" && <button onClick={() => onProcess(order.id)} className="text-blue-600 font-bold hover:underline">Process</button>}
                {order.status === "Processing" && <button onClick={() => onPack(order.id)} className="text-indigo-600 font-bold hover:underline">Pack</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
