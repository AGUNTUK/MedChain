import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag,
  ChevronUp,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Truck,
  Sparkles,
  ShieldCheck,
  Receipt,
  Package
} from "lucide-react";
import { Product } from "../types";
import { useFlyToCart } from "../context/FlyToCartContext";

interface FloatingCartBarProps {
  cartData: {
    items: Array<{ product: Product; quantity: number }>;
    totalMrp: number;
    totalAmount: number;
    totalSavings: number;
  } | null;
  cartCount: number;
  onUpdateCartQty: (productId: string, currentQty: number, change: number) => Promise<void>;
  onRemoveItem: (productId: string) => Promise<void>;
  onCheckoutTrigger: () => void;
  onRefreshCartCounter: () => void;
  isVisible?: boolean;
}

const FREE_DELIVERY_THRESHOLD = 2000;

export default function FloatingCartBar({
  cartData,
  cartCount,
  onUpdateCartQty,
  onRemoveItem,
  onCheckoutTrigger,
  onRefreshCartCounter,
  isVisible = true
}: FloatingCartBarProps) {
  const {
    registerCartTarget,
    isCartBarPulsing,
    isBadgeSpringing,
    isCartDrawerOpen,
    setIsCartDrawerOpen
  } = useFlyToCart();

  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    registerCartTarget(barRef.current);
  }, [registerCartTarget, isVisible]);

  if (!isVisible || cartCount <= 0 || !cartData) {
    return null;
  }

  const items = cartData.items || [];
  const totalAmount = cartData.totalAmount || 0;
  const totalSavings = cartData.totalSavings || 0;
  const totalMrp = cartData.totalMrp || 0;

  // Free delivery calculation
  const deliveryNeeded = Math.max(0, FREE_DELIVERY_THRESHOLD - totalAmount);
  const deliveryProgress = Math.min(100, Math.round((totalAmount / FREE_DELIVERY_THRESHOLD) * 100));
  const isFreeDelivery = totalAmount >= FREE_DELIVERY_THRESHOLD;

  return (
    <>
      {/* 1. FLOATING BOTTOM CART BAR (STICKY FOOTER) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-3 pointer-events-none flex justify-center">
        <motion.div
          ref={barRef}
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: isCartBarPulsing ? [1, 1.05, 0.98, 1] : 1
          }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{
            y: { type: "spring", stiffness: 350, damping: 25 },
            opacity: { duration: 0.2 },
            scale: { duration: 0.4, ease: "easeInOut" }
          }}
          onClick={() => setIsCartDrawerOpen(true)}
          className="pointer-events-auto w-full max-w-sm bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-2.5 pl-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.4)] border border-slate-700/60 flex items-center justify-between cursor-pointer group hover:bg-slate-900 transition-all active:scale-[0.98]"
        >
          {/* Left: Cart Icon + Badge + Amount */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-brand-purple text-white shadow-md">
              <ShoppingBag className="w-5 h-5 text-white" />
              
              {/* Cart Item Badge with Spring Transition */}
              <motion.span
                animate={
                  isBadgeSpringing
                    ? { scale: [1, 1.5, 0.85, 1], rotate: [0, -10, 10, 0] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.4 }}
                className="absolute -top-1.5 -right-1.5 bg-brand-lime text-slate-950 font-black text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-md border border-slate-900"
              >
                {cartCount}
              </motion.span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-300 font-extrabold uppercase tracking-wider">
                  {cartCount} {cartCount === 1 ? "Item" : "Items"} in Cart
                </span>
                {totalSavings > 0 && (
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                    Save ৳{totalSavings.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-black font-mono text-white tracking-tight">
                  ৳{totalAmount.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">net amount</span>
              </div>
            </div>
          </div>

          {/* Right: Action pill with ChevronUp */}
          <div className="flex items-center gap-1.5 bg-brand-purple hover:bg-brand-purple/90 text-white px-3 py-2 rounded-xl text-xs font-black transition-all shadow-sm group-hover:shadow-brand-purple/30">
            <span>View Cart</span>
            <ChevronUp className="w-4 h-4 text-brand-lime group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* 2. INTERACTIVE SLIDE-UP BOTTOM SHEET CART MODAL */}
      <AnimatePresence>
        {isCartDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Sheet Drag Indicator Handle */}
              <div className="w-full flex justify-center pt-2.5 pb-1 bg-white cursor-grab">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              {/* Header */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-brand-purple/10 text-brand-purple">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-brand-charcoal">Your Cart</h3>
                      <span className="text-[10px] font-black bg-brand-lime text-slate-900 px-2 py-0.5 rounded-full">
                        {cartCount} {cartCount === 1 ? "Box" : "Boxes"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      MediChain Procurement Order Summary
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Incentive Banner (Free Delivery Progress) */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 px-5 py-3 border-b border-purple-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-brand-purple">
                    <Truck className="w-4 h-4 text-brand-purple" />
                    <span>Express Depot Delivery</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">
                    {isFreeDelivery ? (
                      <span className="text-emerald-600 font-black flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> FREE Unlocked!
                      </span>
                    ) : (
                      `৳${totalAmount.toLocaleString()} / ৳${FREE_DELIVERY_THRESHOLD.toLocaleString()}`
                    )}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/80 h-2 rounded-full overflow-hidden border border-purple-100/50 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${deliveryProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      isFreeDelivery
                        ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                        : "bg-gradient-to-r from-brand-purple to-indigo-600"
                    }`}
                  />
                </div>

                <p className="text-[10px] font-medium text-slate-600 mt-1.5">
                  {isFreeDelivery ? (
                    <span className="text-emerald-700 font-bold">
                      🎉 Congratulations! You qualify for FREE Express Depot Delivery.
                    </span>
                  ) : (
                    <>
                      Add <strong className="text-brand-purple font-mono font-black">৳{deliveryNeeded.toLocaleString()}</strong> more worth of items to unlock FREE Express Delivery!
                    </>
                  )}
                </p>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                {items.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="bg-white border border-slate-100 rounded-2xl p-3 flex gap-3 relative shadow-2xs hover:border-slate-200 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {product.imageUrl || product.image_url ? (
                        <img
                          src={product.imageUrl || product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-slate-300" />
                      )}
                    </div>

                    {/* Product Specs */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-extrabold bg-brand-purple/10 text-brand-purple px-1.5 py-0.2 rounded uppercase">
                          {product.category}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 truncate">
                          {product.company}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-brand-charcoal truncate mt-0.5">
                        {product.name} <span className="text-[10px] font-bold text-slate-400">{product.strength}</span>
                      </h4>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          ৳{product.sellingPrice} / box
                        </span>
                        <span className="text-slate-300 text-[9px]">•</span>
                        <span className="text-xs font-black text-brand-purple font-mono">
                          ৳{(product.sellingPrice * quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Delete Item button */}
                    <button
                      onClick={() => onRemoveItem(product.id)}
                      className="absolute top-2.5 right-2.5 text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Quantity modifier controls */}
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200/50 self-end">
                      <button
                        onClick={() => onUpdateCartQty(product.id, quantity, -1)}
                        className="w-6 h-6 rounded-lg bg-white text-slate-600 hover:text-rose-600 flex items-center justify-center shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-black text-slate-800 font-mono">
                        {quantity}
                      </span>
                      <button
                        onClick={() => onUpdateCartQty(product.id, quantity, 1)}
                        className="w-6 h-6 rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal & Action Footer */}
              <div className="p-5 bg-white border-t border-slate-100 rounded-t-3xl shadow-[0_-10px_25px_rgba(0,0,0,0.05)] space-y-3 flex-shrink-0">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Subtotal (M.R.P)</span>
                    <span className="font-mono font-bold">৳{totalMrp.toLocaleString()}</span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="flex justify-between text-brand-purple font-bold bg-brand-purple/5 px-2.5 py-1.5 rounded-xl">
                      <span>Wholesale Discount</span>
                      <span className="font-mono font-black">- ৳{totalSavings.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Express Depot Delivery</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {isFreeDelivery ? "FREE" : "৳50"}
                    </span>
                  </div>

                  <div className="flex justify-between font-black text-brand-charcoal pt-2 border-t border-slate-100 text-sm">
                    <span>Total Procurement Amount</span>
                    <span className="text-brand-purple font-mono text-lg font-black">
                      ৳{(totalAmount + (isFreeDelivery ? 0 : 50)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    onCheckoutTrigger();
                  }}
                  className="w-full bg-brand-lime hover:bg-brand-lime-dark text-slate-950 py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-lime/20 hover:shadow-brand-lime/30 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
