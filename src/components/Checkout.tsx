import React, { useState, useEffect } from "react";
import { ArrowLeft, MapPin, CreditCard, Receipt, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import { Pharmacy } from "../types";
import { orderService } from "../services";

interface CheckoutProps {
  onBackToCart: () => void;
  onOrderPlaced: (orderId: string) => void;
  pharmacy: Pharmacy | null;
}

export default function Checkout({ onBackToCart, onOrderPlaced, pharmacy }: CheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<"Cash on Delivery" | "bKash" | "Nagad">("Cash on Delivery");
  const [notes, setNotes] = useState("");
  const [cartSummary, setCartSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await orderService.getCart();
        setCartSummary(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSummary();
  }, []);

  const handlePlaceOrder = async () => {
    if (!cartSummary) return;

    setLoading(true);
    setError("");

    try {
      const data = await orderService.createOrder({
        paymentMethod,
        notes,
        ...({ deliveryAddress: pharmacy?.address || "Dhanmondi, Dhaka" } as any)
      } as any);

      onOrderPlaced(data.orderId);
    } catch (err: any) {
      setError(err.message || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  if (!cartSummary) {
    return (
      <div className="w-full h-full bg-brand-bg flex items-center justify-center p-6">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between select-none overflow-y-auto">
      {/* Checkout Area */}
      <div className="p-4 space-y-4">
        {/* Navigation title */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToCart}
            className="p-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <h2 className="text-sm font-black text-brand-charcoal">Procurement Checkout</h2>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-semibold leading-relaxed">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Delivery Address Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-brand-purple" />
            Default Shipping Address
          </h3>
          <div className="text-xs">
            <div className="font-bold text-slate-800">{pharmacy?.pharmacyName}</div>
            <p className="text-slate-500 mt-1 leading-relaxed">{pharmacy?.address}, {pharmacy?.city}</p>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">
              Owner Mobile: {pharmacy?.phone}
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-brand-purple" />
            Settlement Method Selection
          </h3>

          <div className="space-y-2">
            {/* Cash on Delivery with credit verification */}
            <label className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
              paymentMethod === "Cash on Delivery"
                ? "border-brand-purple bg-brand-purple/5"
                : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
            }`}>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "Cash on Delivery"}
                  onChange={() => setPaymentMethod("Cash on Delivery")}
                  className="accent-brand-purple"
                />
                <div className="text-left">
                  <span>Cash on Delivery (COD)</span>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-medium leading-tight">
                    Uses outstanding pharmacy credit line.
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-400 block uppercase">Available Credit</span>
                <span className="text-xs font-extrabold text-brand-purple">
                  ৳{pharmacy?.availableCredit?.toLocaleString()}
                </span>
              </div>
            </label>

            {/* bKash */}
            <label className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
              paymentMethod === "bKash"
                ? "border-brand-purple bg-brand-purple/5"
                : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
            }`}>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "bKash"}
                  onChange={() => setPaymentMethod("bKash")}
                  className="accent-brand-purple"
                />
                <span>bKash Mobile Wallet</span>
              </div>
              <div className="bg-[#E2125D] text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                Instant Rebate
              </div>
            </label>

            {/* Nagad */}
            <label className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
              paymentMethod === "Nagad"
                ? "border-brand-purple bg-brand-purple/5"
                : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
            }`}>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "Nagad"}
                  onChange={() => setPaymentMethod("Nagad")}
                  className="accent-brand-purple"
                />
                <span>Nagad Wallet</span>
              </div>
              <div className="bg-[#F15A22] text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                Fast Checkout
              </div>
            </label>
          </div>
        </div>

        {/* Order Notes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
            Special Depot Delivery Instructions (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Please deliver before 2 PM, or notify staff Zahid..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:border-brand-purple font-medium"
          />
        </div>
      </div>

      {/* Bill summary and final submit */}
      <div className="p-4 bg-white border-t border-slate-100 rounded-t-3xl shadow-xl flex-shrink-0 mt-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-[9px] text-slate-400 block uppercase font-mono">Net Billing Amount</span>
            <span className="text-lg font-black text-brand-purple font-mono">
              ৳{cartSummary.totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
              Total Saved: ৳{cartSummary.totalSavings.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full bg-brand-lime hover:bg-brand-lime-dark text-slate-900 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-lime/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Confirm & Place Order (৳{cartSummary.totalAmount.toLocaleString()})
              <ShieldCheck className="w-4 h-4 text-brand-purple" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
