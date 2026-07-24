import React, { useState, useEffect } from "react";
import { ListFilter, Receipt, ArrowRight, CornerDownLeft, RefreshCw, Eye, Check, AlertCircle, XCircle, Phone } from "lucide-react";
import { Order } from "../types";
import { orderService } from "../services";
import { formatRefId, generateOrderOTP } from "../lib/utils";

interface OrderHistoryProps {
  onTrackOrder: (orderId: string) => void;
  onRefreshCart: () => void;
  onTriggerTab: (tab: string) => void;
}

export default function OrderHistory({ onTrackOrder, onRefreshCart, onTriggerTab }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);
  const [showReturnModal, setShowReturnModal] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchOrders = async () => {
    try {
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleReorder = async (orderId: string) => {
    setLoading(true);
    try {
      await orderService.reorder(orderId);
      onRefreshCart();
      onTriggerTab("cart");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReturn = async () => {
    if (!showReturnModal) return;
    try {
      await orderService.requestReturn(showReturnModal.id, returnReason);
      setSuccessMsg("Return requested successfully! Refreshing database...");
      setTimeout(() => {
        setSuccessMsg("");
        setShowReturnModal(null);
        setReturnReason("");
        fetchOrders();
      }, 1500);
    } catch (err) {
      console.error(err);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Confirmed: "bg-blue-50 text-blue-700 border-blue-100",
      Processing: "bg-amber-50 text-amber-700 border-amber-100",
      Packed: "bg-purple-50 text-purple-700 border-purple-100",
      "Out for Delivery": "bg-indigo-50 text-indigo-700 border-indigo-100",
      Delivered: "bg-emerald-50 text-emerald-800 border-emerald-100"
    };
    return (
      <span className={`text-[9px] font-black border px-2 py-0.5 rounded uppercase tracking-wider ${map[status] || "bg-slate-50 text-slate-500"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col select-none overflow-y-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-black text-brand-charcoal">Procurement History</h2>
        <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">
          Total Placed: {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-100 mb-3">
            <ListFilter className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-xs font-bold text-slate-700">No Orders Logged Yet</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
            All confirmed wholesale medicine purchases will reflect in this list immediately.
          </p>
        </div>
      ) : (
        orders.map(order => (
          <div
            key={order.id}
            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3 relative overflow-hidden"
          >
            {/* Status & ID Line */}
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">Order ID</span>
                <span className="text-xs font-black text-brand-charcoal font-mono">{formatRefId(order.id, "ORD")}</span>
              </div>
              <div className="text-right">
                {getStatusBadge(order.status)}
              </div>
            </div>

            {/* 4-Stage Horizontal Progress Tracker */}
            {order.status !== "Cancelled" && (
              <div className="py-2.5 px-1 bg-slate-50/50 rounded-xl border border-slate-50">
                <div className="flex items-center justify-between relative px-2">
                  {/* Background line */}
                  <div className="absolute top-[7px] left-4 right-4 h-0.5 bg-slate-100 z-0" />
                  {/* Progress filler line */}
                  <div 
                    className="absolute top-[7px] left-4 h-0.5 bg-brand-purple z-0 transition-all duration-500" 
                    style={{
                      width: order.status === "Delivered" || order.status === "Completed" ? "calc(100% - 32px)" :
                             order.status === "Out for Delivery" ? "66%" :
                             order.status === "Packed" ? "33%" : "0px"
                    }}
                  />

                  {/* 4 dots */}
                  {[
                    { label: "Confirmed", active: ["Confirmed", "Processing", "Packed", "Out for Delivery", "Delivered", "Completed"].includes(order.status) },
                    { label: "Packed", active: ["Packed", "Out for Delivery", "Delivered", "Completed"].includes(order.status) },
                    { label: "In Transit", active: ["Out for Delivery", "Delivered", "Completed"].includes(order.status) },
                    { label: "Delivered", active: ["Delivered", "Completed"].includes(order.status) }
                  ].map((st, sIdx) => (
                    <div key={sIdx} className="flex flex-col items-center z-10 relative">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                        st.active ? "bg-brand-purple border-brand-purple text-white scale-110" : "bg-white border-slate-200"
                      }`}>
                        {st.active && <div className="w-1.5 h-1.5 bg-brand-lime rounded-full" />}
                      </div>
                      <span className={`text-[8.5px] font-extrabold mt-1 ${st.active ? "text-brand-purple" : "text-slate-400"}`}>
                        {st.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rider Handover OTP & Secure Actions */}
            {order.status === "Out for Delivery" && (
              <div className="bg-brand-purple/5 border border-brand-purple/15 p-3 rounded-2xl flex items-center justify-between gap-2 animate-fade-in">
                <div>
                  <span className="text-[8px] text-brand-purple font-black uppercase tracking-wider block">Handover Verification</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="bg-brand-purple text-white font-mono font-black text-xs px-2 py-0.5 rounded shadow-sm">
                      OTP: {generateOrderOTP(order.id)}
                    </span>
                    <span className="text-[8.5px] text-slate-500 font-semibold">Share only upon secure delivery</span>
                  </div>
                </div>
                <a
                  href="tel:+880191234567"
                  className="bg-brand-lime text-slate-900 px-3 py-1.5 rounded-xl text-[9px] font-black flex items-center gap-1 hover:shadow-xs transition-shadow cursor-pointer flex-shrink-0"
                >
                  <Phone className="w-2.5 h-2.5" />
                  Call Rider
                </a>
              </div>
            )}

            {/* Content summary */}
            <div onClick={() => onTrackOrder(order.id)} className="cursor-pointer">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                Consignment Details
              </div>
              <div className="space-y-1">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs font-medium text-slate-600">
                    <span>{item.name} ({item.quantity} box)</span>
                    <span className="font-mono">৳{item.subtotal.toLocaleString()}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <div className="text-[10px] text-brand-purple font-bold">
                    + {order.items.length - 2} more pharmaceutical lines
                  </div>
                )}
              </div>
            </div>

            {/* Totals & Delivery Date */}
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[9px] font-bold">Billing Net</span>
                <span className="font-black text-brand-charcoal font-mono">৳{order.totalAmount.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[9px] font-bold">Status Date</span>
                <span className="font-mono text-slate-600 font-bold">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Historical Actions */}
            <div className="flex gap-2 pt-1 border-t border-slate-100">
              {/* Track / details */}
              <button
                onClick={() => onTrackOrder(order.id)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Track Status
              </button>

              {/* View Invoice */}
              <button
                onClick={() => setSelectedInvoice(order)}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Receipt className="w-3.5 h-3.5 text-brand-purple" />
                Invoice
              </button>

              {/* Reorder */}
              <button
                disabled={loading}
                onClick={() => handleReorder(order.id)}
                className="flex-1 bg-brand-lime text-slate-900 py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all hover:shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reorder
              </button>
            </div>

            {/* Cancel Request button (Pending or Confirmed order) */}
            {(order.status === "Pending" || order.status === "Confirmed") && (
              <button
                onClick={async () => {
                  try {
                    await orderService.cancelOrder(order.id);
                    fetchOrders();
                  } catch (err) {
                    alert("Failed to cancel order.");
                  }
                }}
                className="w-full text-center text-[10px] font-extrabold text-rose-500 bg-rose-50 hover:bg-rose-100 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all mt-2"
              >
                <XCircle className="w-3 h-3" />
                Cancel Order
              </button>
            )}

            {/* Return Request button (Delivered order and not already returned) */}
            {order.status === "Delivered" && !order.hasReturnRequested && (
              <button
                onClick={() => setShowReturnModal(order)}
                className="w-full text-center text-[10px] font-extrabold text-brand-purple bg-brand-purple/5 hover:bg-brand-purple/10 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <CornerDownLeft className="w-3 h-3" />
                Request Return / Dispute Depot Items
              </button>
            )}

            {order.hasReturnRequested && (
              <div className="bg-rose-50 border border-rose-100 p-2 rounded-xl text-[10px] flex justify-between items-center">
                <div>
                  <span className="font-extrabold text-rose-600 block uppercase">Return Status: {order.returnStatus}</span>
                  <span className="text-slate-500 italic">"{order.returnReason}"</span>
                </div>
                {order.returnStatus === "Pending" && (
                  <button
                    onClick={async () => {
                      await orderService.approveReturn(order.id);
                      fetchOrders();
                    }}
                    className="bg-brand-lime text-slate-900 font-extrabold px-2 py-1 rounded-md text-[9px] cursor-pointer"
                  >
                    Approve (Demo)
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* HTML Digital Invoice Modal View */}
      {selectedInvoice && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85%] overflow-y-auto p-5 text-xs text-slate-800 animate-scale-up border border-slate-100 shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={() => setSelectedInvoice(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              &times;
            </button>

            {/* Invoice Design */}
            <div className="text-center pb-4 border-b border-dashed border-slate-200 mt-2">
              <div className="text-sm font-extrabold text-brand-purple">MediChain Logistics Invoice</div>
              <div className="text-[10px] text-slate-400 mt-1">Authorized Wholesaler & Depot Operations</div>
              <div className="text-[9px] font-mono text-slate-400 mt-0.5">INV-REF: {formatRefId(selectedInvoice.id, "INV")}</div>
            </div>

            {/* Bill Details */}
            <div className="py-4 space-y-1 border-b border-dashed border-slate-200 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Ref Date:</span>
                <span className="font-mono text-slate-700">{new Date(selectedInvoice.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Settlement:</span>
                <span className="font-bold text-slate-700">{selectedInvoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Outstanding:</span>
                <span className="font-extrabold text-emerald-600 uppercase font-mono">{selectedInvoice.paymentStatus}</span>
              </div>
            </div>

            {/* Items details table */}
            <div className="py-4 space-y-3.5 border-b border-dashed border-slate-200">
              <div className="grid grid-cols-5 font-black text-slate-400 uppercase text-[9px] tracking-wider mb-1">
                <span className="col-span-3">Item Detail</span>
                <span className="text-center col-span-1">Qty</span>
                <span className="text-right col-span-1">Total</span>
              </div>
              {selectedInvoice.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 text-[11px] font-medium leading-relaxed">
                  <div className="col-span-3 text-slate-800 font-bold">
                    {item.name}
                    <span className="text-[9px] text-slate-400 block">{item.strength}</span>
                  </div>
                  <span className="text-center col-span-1 text-slate-500 font-mono">{item.quantity}</span>
                  <span className="text-right col-span-1 text-slate-700 font-mono">৳{item.subtotal.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Total pricing */}
            <div className="py-4 space-y-2 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Standard M.R.P Total:</span>
                <span className="font-mono text-slate-500 line-through">৳{selectedInvoice.totalMrp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-brand-purple font-bold">
                <span>Wholesale Savings:</span>
                <span className="font-mono">- ৳{selectedInvoice.totalSavings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-brand-charcoal pt-1.5 border-t border-slate-100">
                <span>Procurement Settlement</span>
                <span className="text-brand-purple font-mono text-base">৳{selectedInvoice.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[9px] text-slate-400 mt-4 leading-relaxed font-medium">
              Thank you for procurement. For wholesale support, contact MediChain B2B Helpline at support@medichain.com.
            </div>
          </div>
        </div>
      )}

      {/* Return dispute popup */}
      {showReturnModal && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 text-xs text-slate-800 animate-scale-up shadow-2xl relative">
            <button
              onClick={() => setShowReturnModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
            >
              &times;
            </button>

            <h3 className="text-sm font-black text-brand-charcoal mb-2 mt-1">Dispute Consignment</h3>
            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
              MediChain supports wholesale adjustments. Please enter the specific reason for requesting a return or damage adjustment for Order #{showReturnModal.id}:
            </p>

            {successMsg && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl mb-3 font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <textarea
              rows={3}
              placeholder="e.g. Received damaged outer boxes, or 2 units expire within 1 month (FEFO audit failure)..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:border-brand-purple mb-4 font-medium"
            />

            <button
              onClick={handleRequestReturn}
              disabled={!returnReason}
              className="w-full bg-brand-purple text-white py-3 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              Submit Dispute Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
