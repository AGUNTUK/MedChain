import React from "react";
import { Product } from "../../types";

interface InventoryProps {
  products: Product[];
}

export default function Inventory({ products }: InventoryProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="p-4 font-bold text-slate-500 uppercase">Medicine</th>
            <th className="p-4 font-bold text-slate-500 uppercase">Batch</th>
            <th className="p-4 font-bold text-slate-500 uppercase">Expiry</th>
            <th className="p-4 font-bold text-slate-500 uppercase">Stock</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map(product => (
            <tr key={product.id} className="hover:bg-slate-50">
              <td className="p-4 font-bold text-slate-900">{product.name}</td>
              <td className="p-4 font-semibold text-slate-600">{product.batchNumber}</td>
              <td className="p-4 font-semibold text-slate-600">{product.expiryDate}</td>
              <td className="p-4 font-bold text-slate-900">{product.availableStock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
