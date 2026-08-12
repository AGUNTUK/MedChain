import React, { useState, useEffect } from "react";
import { ArrowLeft, MapPin, CreditCard, ShieldCheck, RefreshCw, AlertCircle, Check, Smartphone, X, Lock } from "lucide-react";
import { Pharmacy } from "../types";
import { orderService, paymentService } from "../services";

interface CheckoutProps {
  onBackToCart: () => void;
  onOrderPlaced: (orderId: string) => void;
  pharmacy: Pharmacy | null;
}

export default function Checkout({ onBackToCart, onOrderPlaced, pharmacy }: CheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<"Cash on Delivery" | "bKash" | "Nagad" | "Wholesale Credit Line">("Cash on Delivery");
  const [notes, setNotes] = useState("");
  const [cartSummary, setCartSummary] = useState<any>(null);
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Digital Wallet State
  const [walletNumber, setWalletNumber] = useState(pharmacy?.phone || "01700000000");
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [pinInput, setPinInput] = useState("12345");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const availableCredit = (totalPurchased >= 300000 && pharmacy?.verificationStatus === "Approved") ? 20000 - (pharmacy?.usedCredit || 0) : 0;
  const isCreditEnough = cartSummary?.totalAmount <= availableCredit;

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const [data, ordersData] = await Promise.all([
          orderService.getCart(),
          orderService.getOrders()
        ]);
        setCartSummary(data);

        const completedOrders = ordersData
          .filter(o => o.status === 'Delivered' || o.status === 'Completed' || o.paymentStatus === 'Paid')
          .reduce((sum, order) => sum + order.totalAmount, 0);
        setTotalPurchased(completedOrders);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSummary();
  }, []);

  const handlePlaceOrder = async () => {
    if (!cartSummary) return;

    if ((paymentMethod === "bKash" || paymentMethod === "Nagad") && !showGatewayModal) {
      setShowGatewayModal(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const generatedTrxId = (paymentMethod !== "Cash on Delivery" && paymentMethod !== "Wholesale Credit Line")
        ? `PGW-${paymentMethod.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        : undefined;

      const data = await orderService.createOrder({
        paymentMethod,
        notes,
        paymentStatus: paymentMethod === "Wholesale Credit Line" ? "Paid" : paymentMethod !== "Cash on Delivery" ? "Paid" : "Pending",
        transactionId: generatedTrxId,
        ...({ deliveryAddress: pharmacy?.address || "Dhanmondi, Dhaka" } as any)
      } as any);

      if (showGatewayModal) {
        setShowGatewayModal(false);
      }

      onOrderPlaced(data.orderId);
    } catch (err: any) {
      setError(err.message || "Failed to place order.");
    } finally {
      setLoading(false);
      setIsProcessingPayment(false);
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
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between select-none overflow-y-auto relative">
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
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-purple" />
              Default Shipping Address
            </h3>
            {pharmacy?.verificationStatus === "Approved" && (
              <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                Verified Pharmacy
              </span>
            )}
          </div>
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
            Select Payment Method
          </h3>

          <div className="space-y-2">
            {/* Wholesale Credit Line (If Eligible) */}
            {totalPurchased >= 300000 && pharmacy?.verificationStatus === "Approved" && (
              <label className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                isCreditEnough ? "cursor-pointer" : "opacity-50 cursor-not-allowed grayscale"
              } ${
                paymentMethod === "Wholesale Credit Line"
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
              }`}>
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                  <input
                    type="radio"
                    name="payment"
                    disabled={!isCreditEnough}
                    checked={paymentMethod === "Wholesale Credit Line"}
                    onChange={() => isCreditEnough && setPaymentMethod("Wholesale Credit Line")}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <div className="text-left">
                    <span>Wholesale Credit Line</span>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium leading-tight">
                      Available Credit: ৳{availableCredit.toLocaleString()}
                    </p>
                  </div>
                </div>
                {isCreditEnough ? (
                  <div className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                    Eligible
                  </div>
                ) : (
                  <div className="bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                    Insufficient
                  </div>
                )}
              </label>
            )}

            {/* Cash on Delivery */}
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
                  className="accent-brand-purple cursor-pointer"
                />
                <div className="text-left">
                  <span>Cash on Delivery (COD)</span>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-medium leading-tight">
                    Pay with cash at your doorstep upon delivery.
                  </p>
                </div>
              </div>
              <div className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                Recommended
              </div>
            </label>

            {/* bKash */}
            <div className={`p-3.5 rounded-xl border-2 transition-all ${
              paymentMethod === "bKash"
                ? "border-[#E2125D] bg-[#E2125D]/5"
                : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
            }`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "bKash"}
                    onChange={() => setPaymentMethod("bKash")}
                    className="accent-[#E2125D] cursor-pointer"
                  />
                  <span>bKash Payment Gateway</span>
                </div>
                <div className="bg-[#E2125D] text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                  Instant Verification
                </div>
              </label>

              {paymentMethod === "bKash" && (
                <div className="mt-3 pt-3 border-t border-[#E2125D]/20 space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#E2125D]" />
                    bKash Account Mobile Number
                  </label>
                  <input
                    type="text"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#E2125D]"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">
                    You will be redirected to bKash PGW secure verification window to enter your OTP & PIN.
                  </p>
                </div>
              )}
            </div>

            {/* Nagad */}
            <div className={`p-3.5 rounded-xl border-2 transition-all ${
              paymentMethod === "Nagad"
                ? "border-[#F15A22] bg-[#F15A22]/5"
                : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
            }`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "Nagad"}
                    onChange={() => setPaymentMethod("Nagad")}
                    className="accent-[#F15A22] cursor-pointer"
                  />
                  <span>Nagad Digital Wallet</span>
                </div>
                <div className="bg-[#F15A22] text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                  Instant Verification
                </div>
              </label>

              {paymentMethod === "Nagad" && (
                <div className="mt-3 pt-3 border-t border-[#F15A22]/20 space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#F15A22]" />
                    Nagad Mobile Wallet
                  </label>
                  <input
                    type="text"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    placeholder="018XXXXXXXX"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#F15A22]"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">
                    Fast automated settlement via Nagad Merchant API.
                  </p>
                </div>
              )}
            </div>
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
          disabled={loading || (paymentMethod === "Wholesale Credit Line" && !isCreditEnough)}
          className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
            paymentMethod === "bKash"
              ? "bg-[#E2125D] hover:bg-[#c80f51] text-white shadow-lg shadow-[#E2125D]/20"
              : paymentMethod === "Nagad"
              ? "bg-[#F15A22] hover:bg-[#d84d1a] text-white shadow-lg shadow-[#F15A22]/20"
              : paymentMethod === "Wholesale Credit Line"
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              : "bg-brand-lime hover:bg-brand-lime-dark text-slate-900 hover:shadow-lg hover:shadow-brand-lime/20"
          }`}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {paymentMethod === "Cash on Delivery"
                ? `Confirm & Place Order (৳${cartSummary.totalAmount.toLocaleString()})`
                : paymentMethod === "Wholesale Credit Line"
                ? `Pay using Credit Line (৳${cartSummary.totalAmount.toLocaleString()})`
                : `Pay via ${paymentMethod} Gateway (৳${cartSummary.totalAmount.toLocaleString()})`}
              <ShieldCheck className="w-4 h-4 shrink-0" />
            </>
          )}
        </button>
      </div>

      {/* Interactive Digital Gateway Modal */}
      {showGatewayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className={`p-4 text-white flex justify-between items-start ${
              paymentMethod === "bKash" ? "bg-[#E2125D]" : "bg-[#F15A22]"
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                  {paymentMethod} PGW Gateway
                </span>
                <h3 className="text-base font-black flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                  MediChain Merchant
                </h3>
              </div>
              <button
                onClick={() => setShowGatewayModal(false)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Invoice Amount:</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  ৳{cartSummary.totalAmount.toLocaleString()}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Wallet Phone Number
                  </label>
                  <input
                    type="text"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-brand-purple"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Enter Wallet PIN
                  </label>
                  <input
                    type="password"
                    maxLength={5}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-slate-800 outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-normal">
                By clicking confirm, you authorize MediChain to debit ৳{cartSummary.totalAmount.toLocaleString()} from your {paymentMethod} wallet.
              </p>

              <button
                onClick={() => {
                  setIsProcessingPayment(true);
                  setTimeout(() => {
                    handlePlaceOrder();
                  }, 800);
                }}
                disabled={isProcessingPayment || loading}
                className={`w-full py-3 rounded-xl font-extrabold text-xs text-white flex items-center justify-center gap-2 cursor-pointer ${
                  paymentMethod === "bKash" ? "bg-[#E2125D] hover:bg-[#c80f51]" : "bg-[#F15A22] hover:bg-[#d84d1a]"
                }`}
              >
                {isProcessingPayment ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  `Confirm & Authorize Payment`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

