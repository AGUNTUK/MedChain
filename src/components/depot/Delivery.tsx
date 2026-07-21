import React, { useState, useEffect } from "react";
import { Order } from "../../types";
import { 
  Truck, CheckCircle2, User, Phone, ShieldAlert, Key, AlertTriangle, 
  MapPin, Clock, ArrowRight, Check, X, Smartphone, ListCollapse 
} from "lucide-react";
import { Rider } from "./depotUtils";
import { orderService } from "../../services";
import { supabase } from "../../lib/supabaseClient";

interface DeliveryProps {
  orders: Order[];
  onProgress: () => void;
}

interface DeliveryStaff {
  id: string;
  name?: string;
  full_name?: string;
  email: string;
  phone?: string;
}

export default function Delivery({ orders, onProgress }: DeliveryProps) {
  // Packed orders ready for rider assignment
  const packedOrders = orders.filter(o => o.status === "Packed");
  
  // Orders already en-route
  const enRouteOrders = orders.filter(o => o.status === "Out for Delivery");

  // Selection states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRider, setSelectedRider] = useState<string>("");
  
  // Real delivery staff from Supabase
  const [deliveryStaff, setDeliveryStaff] = useState<DeliveryStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true);

  useEffect(() => {
    async function fetchStaff() {
      setLoadingStaff(true);
      try {
        // Query Supabase directly
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, name, email, phone")
          .eq("role", "Delivery Staff");
        
        if (!error && data && data.length > 0) {
          setDeliveryStaff(data);
          setLoadingStaff(false);
          return;
        } else if (error) {
          console.warn("Direct Supabase query failed with error:", error.message);
        }
      } catch (err) {
        console.warn("Direct Supabase query failed, falling back to server API...", err);
      }

      // Fallback: Fetch via server API route
      try {
        const res = await fetch("/api/depot/delivery-staff");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.staff && json.staff.length > 0) {
            setDeliveryStaff(json.staff);
            setLoadingStaff(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Server API query failed...", err);
      }

      // Final fallback: Empty list if no users found
      setDeliveryStaff([]);
      setLoadingStaff(false);
    }

    fetchStaff();
  }, []);

  // OTP Verification Modal States
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [targetRider, setTargetRider] = useState<Rider | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userEnteredOtp, setUserEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Trigger dispatch / Handover
  const handleInitiateHandover = (order: Order) => {
    if (!selectedRider) {
      alert("Please select a delivery rider from the dropdown list first.");
      return;
    }
    const rider = deliveryStaff.find(r => r.id === selectedRider);
    if (!rider) {
      alert("Selected delivery rider not found.");
      return;
    }

    // Generate a random 4-digit OTP code for secure handover simulation
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    setTargetOrder(order);
    setTargetRider({
      id: rider.id,
      name: rider.name || rider.full_name || "Unnamed Rider",
      phone: rider.phone || "No Phone",
      status: "Available"
    });
    setGeneratedOtp(code);
    setUserEnteredOtp("");
    setOtpError(null);
    setIsOtpModalOpen(true);
  };

  const handleVerifyAndDispatch = async () => {
    if (userEnteredOtp !== generatedOtp) {
      setOtpError("Invalid verification code. Please check the simulated Rider SMS OTP and try again.");
      return;
    }

    if (!targetOrder || !targetRider) return;
    setLoading(true);
    try {
      // Use orderService to transition database state to 'Out for Delivery' and bind assigned_rider_id
      const res = await orderService.assignDelivery(targetOrder.id, targetRider.id);
      if (res.success) {
        setIsOtpModalOpen(false);
        setTargetOrder(null);
        setTargetRider(null);
        setSelectedRider("");
        onProgress(); // Trigger reload & live status logging
      } else {
        setOtpError("Database rejected status transition. Please sync database.");
      }
    } catch (err: any) {
      console.error(err);
      setOtpError(err.message || "Network error transitioning order to Out for Delivery.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ==================== LEFT: PENDING HANDOVER ==================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
              Pending Rider Handover ({packedOrders.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Status: Packed</span>
          </div>

          {packedOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs font-semibold">
              No orders currently waiting in the dispatch bay.
            </div>
          ) : (
            <div className="space-y-3.5">
              {packedOrders.map(order => (
                <div 
                  key={order.id} 
                  className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-extrabold text-indigo-400">#{order.readableId || order.id.substring(0, 8)}</span>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">{order.items?.length || 0} items packed • Total: ৳{order.totalAmount}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                      READY TO DISPATCH
                    </span>
                  </div>

                  {/* Rider selection dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assign Courier Rider</label>
                      {loadingStaff && (
                        <span className="flex items-center gap-1 text-[9px] text-indigo-400 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                          Loading Riders...
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedRider}
                      onChange={(e) => setSelectedRider(e.target.value)}
                      disabled={loadingStaff}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold disabled:opacity-50"
                    >
                      {loadingStaff ? (
                        <option value="">Loading riders...</option>
                      ) : (
                        <>
                          <option value="">-- Choose Available Rider --</option>
                          {deliveryStaff.length === 0 ? (
                            <option value="" disabled>No delivery staff found</option>
                          ) : (
                            deliveryStaff.map(rider => (
                              <option key={rider.id} value={rider.id}>
                                {rider.name || rider.full_name || "Unnamed Rider"} - {rider.phone || "No Phone"}
                              </option>
                            ))
                          )}
                        </>
                      )}
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-900 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate max-w-[150px]">{order.deliveryAddress || "Standard Hub"}</span>
                    </div>

                    <button
                      onClick={() => handleInitiateHandover(order)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Handover & Dispatch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ==================== RIGHT: EN ROUTE / OUT FOR DELIVERY ==================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-500 animate-pulse" />
              En Route / Out for Delivery ({enRouteOrders.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Active Transit</span>
          </div>

          {enRouteOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs font-semibold">
              No orders currently en-route to pharmacies.
            </div>
          ) : (
            <div className="space-y-3.5">
              {enRouteOrders.map(order => (
                <div 
                  key={order.id} 
                  className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-extrabold text-slate-300">#{order.readableId || order.id.substring(0, 8)}</span>
                    <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest animate-pulse">
                      ● OUT FOR DELIVERY
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 font-medium">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Rider Assigned • Secure Handover Completed</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">Destination: {order.deliveryAddress || "Procurement Hub"}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
                    <span>Value: ৳{order.totalAmount}</span>
                    <span>Est: {order.estimatedDelivery || "Today"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ==================== SECURE OTP HANDOVER VERIFICATION MODAL ==================== */}
      {isOtpModalOpen && targetOrder && targetRider && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="text-center space-y-2">
              <Smartphone className="w-10 h-10 text-indigo-500 mx-auto animate-bounce" />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-100">Rider Handover Verification</h4>
              <p className="text-[11px] text-slate-400 font-medium">
                Verify physical handover to <strong className="text-slate-200">{targetRider.name}</strong> ({targetRider.phone})
              </p>
            </div>

            {/* Simulated SMS Alert banner (making testing in iframe flawless!) */}
            <div className="bg-amber-950/30 border border-amber-800 p-3.5 rounded-xl text-center space-y-1">
              <span className="block text-[8px] font-black text-amber-500 tracking-wider uppercase">● SIMULATED SMS BROADCAST</span>
              <p className="text-[11px] font-mono font-black text-amber-300">
                "MediChain SMS: Your OTP code for dispatch #PK-{targetOrder.id.substring(0,6).toUpperCase()} is {generatedOtp}"
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1 text-center">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Input 4-Digit Rider OTP</label>
                <input
                  type="text"
                  maxLength={4}
                  value={userEnteredOtp}
                  onChange={(e) => {
                    setUserEnteredOtp(e.target.value);
                    setOtpError(null);
                  }}
                  placeholder="----"
                  className="bg-slate-950 border-2 border-slate-800 focus:border-indigo-500 text-center text-xl font-bold font-mono py-2 rounded-xl text-white w-28 mx-auto focus:outline-none tracking-widest block"
                />
              </div>

              {otpError && (
                <p className="text-[10px] text-rose-400 font-extrabold text-center flex items-center gap-1.5 justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {otpError}
                </p>
              )}

              <div className="flex gap-2.5 pt-2 text-xs">
                <button
                  onClick={() => {
                    setIsOtpModalOpen(false);
                    setTargetOrder(null);
                    setTargetRider(null);
                  }}
                  className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold py-2 rounded-xl"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyAndDispatch}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1"
                  disabled={loading}
                >
                  <span>Verify OTP</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
