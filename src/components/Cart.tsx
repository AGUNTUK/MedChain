import React, { useState, useEffect } from "react";
import { ShoppingBag, Trash2, Plus, Minus, Receipt, ArrowRight, ShieldCheck, ArrowLeft, Package } from "lucide-react";
import { Product } from "../types";
import { orderService } from "../services";

interface CartProps {
  onCheckoutTrigger: () => void;
  onRefreshCartCounter: () => void;
  onBack: () => void;
}

export default function Cart({ onCheckoutTrigger, onRefreshCartCounter, onBack }: CartProps) {
  const [cartData, setCartData] = useState<{
    items: Array<{ product: Product; quantity: number }>;
    totalMrp: number;
    totalAmount: number;
    totalSavings: number;
  } | null>(null);

  const fetchCart = async () => {
    try {
      const data = await orderService.getCart();
      setCartData(data);
    } catch (err) {
      console.error("Error fetching cart:", err);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQty = async (productId: string, currentQty: number, change: number) => {
    const newQty = currentQty + change;
    try {
      await orderService.updateCartItem(productId, newQty);
      fetchCart();
      onRefreshCartCounter();
    } catch (err: any) {
      alert(err.message || "Cannot update cart quantity.");
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      await orderService.removeFromCart(productId);
      fetchCart();
      onRefreshCartCounter();
    } catch (err) {
      console.error(err);
    }
  };

  if (!cartData || cartData.items.length === 0) {
    return (
      <div className="w-full h-full bg-brand-bg flex flex-col justify-between select-none">
        {/* Header Area */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/40 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h2 className="text-sm font-black text-brand-charcoal">Procurement Cart</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border border-slate-100 shadow-sm mb-4">
            <ShoppingBag className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="text-xs font-black text-slate-700">Your Procurement Cart is Empty</h3>
          <p className="text-[10px] text-slate-400 max-w-[200px] text-center mt-1.5 leading-relaxed">
            Browse medicines, check today's bulk discounts, and add items to place wholesale orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between select-none">
      {/* Header Area */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/40 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <h2 className="text-sm font-black text-brand-charcoal">Procurement Cart</h2>
      </div>

      {/* Cart Items Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Items in Basket ({cartData.items.reduce((acc, i) => acc + i.quantity, 0)} boxes)
          </span>
        </div>

        {cartData.items.map(({ product, quantity }) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl p-3.5 border border-slate-100 flex gap-3 relative group"
          >
            {/* Remove item absolute */}
            <button
              onClick={() => handleRemoveItem(product.id)}
              className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Product image */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center">
              {product.imageUrl || product.image_url ? (
                <img src={product.imageUrl || product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Package className="w-6 h-6 text-slate-300" />
              )}
            </div>

            {/* Icon / Brand block */}
            <div className="flex-1 min-w-0">
              <span className="text-[8px] bg-brand-purple/10 text-brand-purple font-extrabold px-1.5 py-0.5 rounded tracking-wide">
                {product.category}
              </span>
              <h4 className="text-xs font-black text-brand-charcoal mt-1 leading-tight truncate">
                {product.name} <span className="text-[10px] font-bold text-slate-400">{product.strength}</span>
              </h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">{product.genericName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[8px] text-slate-400 font-semibold truncate">{product.company}</p>
                <span className="text-slate-300 text-[8px]">•</span>
                <p className="text-[8px] text-brand-purple font-bold">Pack: {product.packSize || "N/A"}</p>
              </div>

              {/* Subtotal & item calculation */}
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  ৳{product.sellingPrice} &times; {quantity}
                </span>
                <span className="text-xs font-extrabold text-brand-purple font-mono">
                  ৳{(product.sellingPrice * quantity).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Vertical Increment/Decrement controller */}
            <div className="flex flex-col justify-center items-center bg-slate-100 rounded-xl px-1.5 py-1.5 border border-slate-200/40">
              <button
                onClick={() => handleUpdateQty(product.id, quantity, 1)}
                className="text-slate-500 hover:text-brand-purple p-1 rounded hover:bg-white transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-xs font-black text-slate-800 font-mono py-1">
                {quantity}
              </span>
              <button
                onClick={() => handleUpdateQty(product.id, quantity, -1)}
                className="text-slate-500 hover:text-brand-purple p-1 rounded hover:bg-white transition-all cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary & Order Trigger Section */}
      <div className="p-4 bg-white border-t border-slate-100 rounded-t-3xl shadow-xl flex-shrink-0">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
          <Receipt className="w-3.5 h-3.5 text-brand-purple" />
          Procurement Price Breakdown
        </h4>

        <div className="space-y-1.5 text-xs pb-3 border-b border-slate-50">
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Total Maximum Retail Price (M.R.P)</span>
            <span className="text-slate-500 font-mono font-bold">৳{cartData.totalMrp.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-brand-purple font-bold bg-brand-purple/5 px-2.5 py-1.5 rounded-xl">
            <span className="flex items-center gap-1">
              MediChain Wholesale Discount
            </span>
            <span className="font-mono font-black">- ৳{cartData.totalSavings.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-black text-brand-charcoal pt-1.5 text-sm">
            <span>Net Procurement Amount</span>
            <span className="text-brand-purple font-mono text-base">৳{cartData.totalAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 gap-3">
          <div className="text-left">
            <span className="text-[8px] text-slate-400 block uppercase font-mono">Guaranteed Savings</span>
            <span className="text-xs font-black text-emerald-600 font-mono">
              ৳{cartData.totalSavings.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onCheckoutTrigger}
            className="flex-1 bg-brand-lime hover:bg-brand-lime-dark text-slate-900 py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-lime/20 transition-all cursor-pointer"
          >
            Go to Checkout
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
