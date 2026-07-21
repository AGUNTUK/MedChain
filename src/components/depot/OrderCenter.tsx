import React, { useState } from "react";
import { Order, OrderItem } from "../../types";
import { 
  CheckCircle2, Clock, Truck, Package, Printer, ChevronRight, Search, 
  MapPin, ShoppingCart, User, MapPinned, FileText, Check, ArrowRight, X, Eye
} from "lucide-react";
import { getRackLocation } from "./depotUtils";

interface OrderCenterProps {
  orders: Order[];
  onAccept: (orderId: string) => void;
  onProcess: (orderId: string) => void;
  onPack: (orderId: string) => void;
}

export default function OrderCenter({ orders, onAccept, onProcess, onPack }: OrderCenterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "processing" | "packed">("all");

  // Filter orders based on active local tab and search term (e.g. Order ID or Pharmacy Name)
  const filteredOrders = orders.filter(order => {
    // Tab filter
    if (activeTab === "pending" && order.status !== "Pending") return false;
    if (activeTab === "processing" && order.status !== "Processing" && order.status !== "Confirmed") return false;
    if (activeTab === "packed" && order.status !== "Packed") return false;

    // Search query
    const searchString = `${order.id} ${order.deliveryAddress || ""} ${order.readableId || ""}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Sort picking list items by their Rack/Shelf location to create an optimal warehouse walking path
  const getOptimizedPickingPath = (items: OrderItem[]) => {
    return [...items].sort((a, b) => {
      const locA = getRackLocation(a.productId, a.name, "Tablet"); // Mock category search
      const locB = getRackLocation(b.productId, b.name, "Tablet");
      return locA.localeCompare(locB);
    });
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Tabs Controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
        
        {/* Tab filters */}
        <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
          {[
            { id: "all", label: "All Orders", count: orders.length },
            { id: "pending", label: "Pending", count: orders.filter(o => o.status === "Pending").length },
            { id: "processing", label: "Processing", count: orders.filter(o => o.status === "Processing" || o.status === "Confirmed").length },
            { id: "packed", label: "Packed / Ready", count: orders.filter(o => o.status === "Packed").length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label} <span className="ml-1 opacity-60 text-[10px]">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Real-time Search Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Order ID, delivery address, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Orders Grid View */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
          No matching warehouse orders found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const isProcessing = order.status === "Processing" || order.status === "Confirmed";
            return (
              <div 
                key={order.id} 
                className="bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 p-5 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-extrabold text-indigo-400">#{order.readableId || order.id.substring(0, 8)}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      order.status === "Pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      isProcessing ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      order.status === "Packed" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>{order.status}</span>
                  </div>

                  <div className="mt-3.5 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold truncate">Pharmacy ID: {order.pharmacyId.substring(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPinned className="w-4 h-4 text-slate-500" />
                      <span className="truncate text-slate-400 font-medium">{order.deliveryAddress || "Dhaka Main Depot Delivery"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <ShoppingCart className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-400 font-medium">{order.items?.length || 0} items ordered</span>
                    </div>
                  </div>

                  {/* Peek item summaries */}
                  <div className="mt-3.5 p-2 bg-slate-900/60 rounded-xl border border-slate-900 text-[11px] text-slate-400 space-y-1">
                    {order.items?.slice(0, 2).map((it, idx) => (
                      <div key={idx} className="flex justify-between font-medium">
                        <span className="truncate">{it.name} ({it.strength})</span>
                        <span className="text-slate-200">x{it.quantity}</span>
                      </div>
                    ))}
                    {(order.items?.length || 0) > 2 && (
                      <p className="text-[10px] text-slate-500 text-right font-bold font-mono">+{(order.items?.length || 0) - 2} more medicines</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-900 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Total Amount</span>
                    <span className="font-black text-slate-100 text-sm">৳{order.totalAmount}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 p-2 rounded-xl transition-all cursor-pointer"
                      title="Open Picking Path / Work details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {order.status === "Pending" && (
                      <button
                        onClick={() => onAccept(order.id)}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                    )}
                    {order.status === "Confirmed" && (
                      <button
                        onClick={() => onProcess(order.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 animate-pulse"
                      >
                        <ArrowRight className="w-3.5 h-3.5 animate-bounce-right" /> Pick Path
                      </button>
                    )}
                    {order.status === "Processing" && (
                      <button
                        onClick={() => onPack(order.id)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Package className="w-3.5 h-3.5" /> Pack Order
                      </button>
                    )}
                    {order.status === "Packed" && (
                      <span className="text-xs text-indigo-400 font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Packed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== WORKFLOW PICKING PATH MODAL ==================== */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-500" />
                  Order Picking Details
                </h3>
                <p className="text-[10px] text-indigo-400 font-mono mt-0.5">Order ID: {selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              
              {/* Warehouse Workflow Status Banner */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold tracking-wider">Current status</span>
                  <span className="font-extrabold text-slate-200">{selectedOrder.status}</span>
                </div>
                
                {/* Workflow stepper buttons */}
                <div className="flex gap-2">
                  {selectedOrder.status === "Pending" && (
                    <button
                      onClick={() => { onAccept(selectedOrder.id); setSelectedOrder(null); }}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3.5 rounded-xl cursor-pointer"
                    >
                      Accept Order
                    </button>
                  )}
                  {selectedOrder.status === "Confirmed" && (
                    <button
                      onClick={() => { onProcess(selectedOrder.id); setSelectedOrder(null); }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3.5 rounded-xl cursor-pointer"
                    >
                      Start Picking
                    </button>
                  )}
                  {selectedOrder.status === "Processing" && (
                    <button
                      onClick={() => { onPack(selectedOrder.id); setSelectedOrder(null); }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3.5 rounded-xl cursor-pointer"
                    >
                      Mark Packed
                    </button>
                  )}
                  <button
                    onClick={() => setIsPrintPreviewOpen(true)}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 font-bold py-1.5 px-3 rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Packing Slip
                  </button>
                </div>
              </div>

              {/* Picking Walkpath list sorted by Rack */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Pickpath Optimized (Linear Walk)
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">Sorted by Sector & Shelf</span>
                </div>

                <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-900 overflow-hidden">
                  {getOptimizedPickingPath(selectedOrder.items || []).map((item, idx) => {
                    const shelf = getRackLocation(item.productId, item.name, "Tablet");
                    return (
                      <div key={idx} className="p-3 hover:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-md bg-indigo-950 border border-indigo-800 flex items-center justify-center font-bold text-indigo-400 text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-200">{item.name}</span>
                            <span className="text-slate-400 ml-1.5">({item.strength}) • Pack: {item.packSize}</span>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                              <span className="font-bold text-slate-500 uppercase">LOCATION:</span>
                              <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-500" />
                                {shelf}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Picking Qty</span>
                          <span className="font-black text-slate-100 text-sm">x{item.quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==================== THERMAL PACKING SLIP PRINT PREVIEW MODAL ==================== */}
      {isPrintPreviewOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                <Printer className="w-4.5 h-4.5 text-indigo-500" />
                Thermal Printer Preview
              </h3>
              <button 
                onClick={() => setIsPrintPreviewOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Print Slip layout (styled like 80mm paper roll) */}
            <div className="bg-white text-black font-mono p-5 text-xs border-2 border-slate-200 max-h-[60vh] overflow-y-auto shadow-inner rounded-md mx-auto" style={{ width: "320px" }}>
              <div className="text-center space-y-1">
                <h1 className="font-black text-sm tracking-widest">MEDICHAIN DEPOT</h1>
                <p className="text-[9px] uppercase font-bold">Warehouse Management Slip</p>
                <p className="text-[9px] text-slate-600">Dhaka Main Warehouse-01</p>
                <p className="text-[9px] text-slate-500 font-bold">--------------------------------</p>
              </div>

              <div className="mt-3.5 space-y-1.5 text-[10px]">
                <div><span className="font-bold">SLIP ID:</span> PK-{selectedOrder.id.substring(0, 8).toUpperCase()}</div>
                <div><span className="font-bold">DATE:</span> {new Date().toLocaleDateString()}</div>
                <div><span className="font-bold">DELIVER TO:</span> Pharmacy ID {selectedOrder.pharmacyId.substring(0, 8)}</div>
                <div><span className="font-bold">ADDRESS:</span> {selectedOrder.deliveryAddress || "Standard Route"}</div>
                <div><span className="font-bold">STATUS:</span> {selectedOrder.status.toUpperCase()}</div>
              </div>

              <p className="text-[9px] text-slate-500 mt-2 font-bold">--------------------------------</p>
              <p className="text-[9px] font-bold uppercase text-center my-1">PICKING & PACKING ORDER</p>
              <p className="text-[9px] text-slate-500 font-bold">--------------------------------</p>

              {/* Items grouped in sorted sequence */}
              <div className="space-y-2 mt-2 text-[10px]">
                {getOptimizedPickingPath(selectedOrder.items || []).map((item, idx) => {
                  const location = getRackLocation(item.productId, item.name, "Tablet");
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span className="truncate">{idx + 1}. {item.name}</span>
                        <span>x{item.quantity}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-600">
                        <span>Shelf: {location}</span>
                        <span>{item.strength}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[9px] text-slate-500 mt-3.5 font-bold">--------------------------------</p>
              
              <div className="space-y-1 mt-2 text-[10px] font-bold">
                <div className="flex justify-between">
                  <span>TOTAL ITEMS:</span>
                  <span>{selectedOrder.items?.length || 0} items</span>
                </div>
                <div className="flex justify-between text-xs font-black border-t border-dashed border-black pt-1">
                  <span>TOTAL VAL:</span>
                  <span>৳{selectedOrder.totalAmount}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-dashed border-slate-400 flex flex-col items-center justify-center space-y-1 text-center">
                <div className="w-20 h-20 bg-slate-100 flex items-center justify-center border border-slate-300 text-[10px] text-slate-500 font-bold">
                  [ QR CODE ]
                </div>
                <span className="text-[8px] uppercase tracking-wider text-slate-600 font-bold">Scan to Verify Dispatch</span>
              </div>

              <div className="mt-6 flex justify-between text-[9px] font-bold">
                <div className="border-t border-black pt-1 w-20 text-center">Picker Sign</div>
                <div className="border-t border-black pt-1 w-20 text-center">Rider Sign</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsPrintPreviewOpen(false)}
                className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold py-2 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintSlip}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1"
              >
                <Printer className="w-4 h-4" /> Trigger Thermal Print
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
