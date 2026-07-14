import React, { useState, useEffect } from "react";
import { ArrowLeft, Check, Compass, Truck, RefreshCw, Layers, Calendar } from "lucide-react";
import { Order, OrderStatus } from "../types";
import { orderService } from "../services";

interface OrderTrackingProps {
  orderId: string;
  onBack: () => void;
  onRefreshStats: () => void;
}

export default function OrderTracking({ orderId, onBack, onRefreshStats }: OrderTrackingProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      const data = await orderService.getOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Handle mock tracking stepping
  const handleUpdateStatus = async (nextStatus: OrderStatus) => {
    setLoading(true);
    try {
      await orderService.updateOrderStatus(orderId, nextStatus);
      await fetchOrder();
      onRefreshStats();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="w-full h-full bg-brand-bg flex items-center justify-center p-6">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  const steps: Array<{ key: OrderStatus; label: string; desc: string }> = [
    { key: "Confirmed", label: "Confirmed", desc: "Wholesale order received and stock reserved at depot." },
    { key: "Processing", label: "Processing", desc: "Drug batch verification and FEFO compliance audit." },
    { key: "Packed", label: "Packed", desc: "Bulk thermal packaging completed, ready in dispatch bay." },
    { key: "Out for Delivery", label: "Out for Delivery", desc: "MediChain logistics container dispatched to your city." },
    { key: "Delivered", label: "Delivered", desc: "Consignment handed over. Digital invoice generated." }
  ];

  // Find index of current status
  const currentStepIdx = steps.findIndex(s => s.key === order.status);

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between select-none overflow-y-auto">
      {/* Scrollable Tracker */}
      <div className="p-4 space-y-4">
        {/* Back button header */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h2 className="text-sm font-black text-brand-charcoal">Depot Order Tracking</h2>
            <p className="text-[10px] text-slate-400 font-mono">ID: {order.id}</p>
          </div>
        </div>

        {/* Order Details Header */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-400 block">Total Amount</span>
            <span className="text-sm font-black text-brand-purple font-mono">৳{order.totalAmount.toLocaleString()}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">Est. Arrival</span>
            <span className="font-bold text-slate-700">{order.estimatedDelivery}</span>
          </div>
        </div>

        {/* Vertical Stepper */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-6">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-3">
            <Compass className="w-4 h-4 text-brand-purple animate-spin-slow" />
            Consignment Progress Timeline
          </h3>

          <div className="relative pl-6 space-y-6">
            {/* Vertical connector line */}
            <div className="absolute left-2.5 top-1.5 bottom-1.5 w-0.5 bg-slate-100" />

            {steps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const isFuture = idx > currentStepIdx;

              return (
                <div key={step.key} className="relative text-xs">
                  {/* Circle indicator */}
                  <div className={`absolute left-[-21px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                    isPast
                      ? "bg-brand-lime border-brand-lime text-slate-900"
                      : isCurrent
                      ? "bg-brand-purple border-brand-purple text-white animate-pulse"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}>
                    {isPast ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="text-[9px] font-bold font-mono">{idx + 1}</span>
                    )}
                  </div>

                  <div>
                    <h4 className={`font-black ${
                      isCurrent ? "text-brand-purple" : isFuture ? "text-slate-400" : "text-slate-800"
                    }`}>
                      {step.label}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Simulator Stepper Controls (Exclusive for applet demonstration!) */}
      <div className="p-4 bg-white border-t border-slate-100 rounded-t-3xl shadow-xl flex-shrink-0 mt-4 text-center">
        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-brand-lime" />
          Warehouse Logistics Simulator
        </h4>
        <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
          As a depot administrator, manually advance or backtrack delivery milestones to audit database stocks:
        </p>

        <div className="flex gap-2 overflow-x-auto pr-1">
          {steps.map((step, idx) => {
            const isCurrent = step.key === order.status;
            return (
              <button
                key={step.key}
                disabled={loading}
                onClick={() => handleUpdateStatus(step.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-brand-purple text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
