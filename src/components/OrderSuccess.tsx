import React from "react";
import { CheckCircle2, ChevronRight, ShoppingBag, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface OrderSuccessProps {
  orderId: string;
  onTrackOrder: (orderId: string) => void;
  onContinueShopping: () => void;
}

export default function OrderSuccess({ orderId, onTrackOrder, onContinueShopping }: OrderSuccessProps) {
  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between p-6 select-none text-center">
      <div />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="space-y-4 py-8"
      >
        {/* Animated Check badge */}
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-brand-lime drop-shadow-md animate-bounce" />
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-brand-charcoal tracking-tight">
            Order Placed Successfully!
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
            Your bulk pharmaceutical products are reserved at our Dhaka Central Depot.
          </p>
        </div>

        {/* Order ID box */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 max-w-[260px] mx-auto space-y-2 shadow-sm text-xs">
          <div className="flex justify-between text-slate-400 font-medium">
            <span>Procurement ID:</span>
            <span className="font-mono font-black text-brand-purple">{orderId}</span>
          </div>
          <div className="flex justify-between text-slate-400 font-medium">
            <span>Estimated Delivery:</span>
            <span className="font-bold text-slate-700">Tomorrow, by 2:00 PM</span>
          </div>
          <div className="flex justify-between text-slate-400 font-medium">
            <span>Initial Status:</span>
            <span className="font-extrabold text-brand-lime">Confirmed</span>
          </div>
        </div>
      </motion.div>

      {/* Primary Actions */}
      <div className="space-y-2.5">
        <button
          onClick={() => onTrackOrder(orderId)}
          className="w-full bg-brand-purple hover:bg-brand-purple-dark text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20 transition-all cursor-pointer"
        >
          Track Depot Order
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onContinueShopping}
          className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          Continue Procurement
        </button>
      </div>
    </div>
  );
}
