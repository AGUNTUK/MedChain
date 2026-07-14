import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Coins,
  PackageCheck,
  BellRing,
  ShoppingBag,
  Zap,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  FileDown
} from "lucide-react";
import { Product, Order, User } from "../types";

interface DashboardStatsProps {
  products: Product[];
  orders: Order[];
  pharmacy: any;
  currentUser?: User | null;
  onTriggerPriceDrop: () => void;
  onTriggerNewOffer: () => void;
  onSimulateDeliveryStatus: () => void;
  activeOrderToDeliver?: Order | null;
  onRefreshProducts?: () => void;
}

export default function DashboardStats({
  products,
  orders,
  pharmacy,
  currentUser,
  onTriggerPriceDrop,
  onTriggerNewOffer,
  onSimulateDeliveryStatus,
  activeOrderToDeliver,
  onRefreshProducts
}: DashboardStatsProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Bulk Import UI States
  const [csvContent, setCsvContent] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute stats
  const totalSpend = orders
    .filter(o => o.status === "Delivered")
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const totalSavings = orders
    .filter(o => o.status === "Delivered")
    .reduce((acc, o) => acc + o.totalSavings, 0);

  const outstandingOrdersCount = orders.filter(
    o => o.status !== "Delivered" && o.status !== "Confirmed"
  ).length;

  const lowStockAlerts = products.filter(p => p.availableStock <= 150);

  // Sample CSV generators
  const loadCleanSample = () => {
    const sample = `Product Name,Generic Name,Company Name,Category,Strength,Pack Size,MRP,Selling Price,Batch Number,Expiry Date,Stock Quantity,Supplier Name
Giona Easyhaler,Budesonide,Incepta Pharmaceuticals,Inhaler,200mcg,120 doses,850,710,GI-120E,2028-05-12,50,Incepta Tejgaon Depot
Monas 10,Montelukast Sodium,Acme Laboratories,Tablet,10mg,30's Box,525,441,AC-M10,2027-10-15,120,Acme Wholesale Center
Napa rapid,Paracetamol,Beximco Pharmaceuticals,Tablet,500mg,100's Box,150,120,B-RAP9,2027-12-30,500,Beximco Depot Dhaka`;
    setCsvContent(sample);
    setImportResult(null);
    setImportError(null);
  };

  const loadFailingSample = () => {
    const sample = `Product Name,Generic Name,Company Name,Category,Strength,Pack Size,MRP,Selling Price,Batch Number,Expiry Date,Stock Quantity,Supplier Name
Napa 500,Paracetamol,Beximco Pharmaceuticals,Tablet,500mg,500's Box,600,450,B-N500,2028-01-10,180,Beximco Depot Dhaka
Broken Price,Paracetamol,Beximco,Tablet,500mg,10's,10,25,B-E1,2028-11-20,10,Beximco Depot Dhaka
Negative Stock,Omeprazole,Square,Capsule,20mg,10's,20,15,B-E2,2027-01-01,-20,Square Central Depot
Expired Med,Sertraline,Square,Tablet,50mg,30's Box,300,240,B-E3,2023-01-01,100,Square Central Depot`;
    setCsvContent(sample);
    setImportResult(null);
    setImportError(null);
  };

  // Drag-and-drop files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setImportError("Error: Only CSV (.csv) files are supported for medicine catalog ingestion.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setCsvContent(text);
        setImportResult(null);
        setImportError(null);
      }
    };
    reader.readAsText(file);
  };

  // Import execution API call
  const triggerImport = async () => {
    if (!csvContent.trim()) {
      setImportError("Error: Please provide CSV content to import.");
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to import bulk products.");
      }

      const result = await res.json();
      setImportResult(result);
      if (result.successCount > 0) {
        onRefreshProducts?.();
      }
    } catch (err: any) {
      setImportError(err.message || "An unexpected error occurred during database commit.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 p-6 overflow-y-auto text-gray-600">
      {/* Platform Title */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-brand-purple w-5 h-5" />
            MediChain Operations Cockpit
          </h2>
          <p className="text-xs text-gray-400 mt-1">Enterprise B2B Procurement and Warehouse Management</p>
        </div>
        <div className="text-right font-mono text-xs text-brand-lime font-bold">
          <div>{currentTime.toLocaleDateString()}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{currentTime.toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Credit Metric Card */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/5 rounded-full blur-2xl" />
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pharmacy Credit Line</span>
            <h3 className="text-2xl font-black text-gray-950 mt-1">৳{pharmacy?.availableCredit?.toLocaleString() || "0"}</h3>
          </div>
          <Coins className="text-brand-lime w-8 h-8 opacity-90" />
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mb-3">
          <div
            className="bg-brand-lime h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(
                100,
                ((pharmacy?.creditLimit - pharmacy?.availableCredit) / pharmacy?.creditLimit) * 100
              )}%`,
            }}
          />
        </div>

        <div className="flex justify-between text-xs font-mono text-gray-500">
          <span>Used: ৳{pharmacy?.usedCredit?.toLocaleString()}</span>
          <span>Limit: ৳{pharmacy?.creditLimit?.toLocaleString()}</span>
        </div>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-150 shadow-xs rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase mb-1">
            <ShoppingBag className="w-4 h-4 text-brand-purple" />
            Total Procurement
          </div>
          <div className="text-xl font-black text-gray-900">৳{totalSpend.toLocaleString()}</div>
          <p className="text-[10px] text-brand-lime mt-1 font-semibold">Completed payments</p>
        </div>

        <div className="bg-white border border-gray-150 shadow-xs rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase mb-1">
            <Zap className="w-4 h-4 text-brand-lime" />
            Total Savings
          </div>
          <div className="text-xl font-black text-gray-900">৳{totalSavings.toLocaleString()}</div>
          <p className="text-[10px] text-brand-purple mt-1 font-semibold font-mono">Avg 22.4% wholesale</p>
        </div>
      </div>

      {/* Low Stock Panel */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 shadow-xs">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-500 w-4 h-4" />
          Depot Low Stock Alerts ({lowStockAlerts.length})
        </h4>

        {lowStockAlerts.length === 0 ? (
          <div className="text-xs text-gray-400 italic py-2">All warehouse inventories fully provisioned.</div>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {lowStockAlerts.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-150 shadow-2xs">
                <div>
                  <div className="text-xs font-bold text-gray-900">{p.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{p.company}</div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-mono font-black ${p.availableStock <= 100 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {p.availableStock} Box
                  </span>
                  <div className="text-[9px] text-gray-400">FEFO Expiry: {p.expiryDate}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operation Simulator Panel */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 shadow-xs">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Sparkles className="text-brand-lime w-4 h-4" />
          Real-time Operation Simulator
        </h4>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          Trigger system-level warehouse operations to instantly propagate changes down to the Pharmacy Mobile application:
        </p>

        <div className="space-y-3">
          <button
            onClick={onTriggerPriceDrop}
            className="w-full flex items-center justify-between bg-white hover:bg-gray-50 text-gray-800 p-3 rounded-xl border border-gray-200 hover:border-brand-purple transition-all duration-200 group text-xs font-bold cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-purple" />
              Simulate 5% Price Drop Notification
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-850 transition-all" />
          </button>

          <button
            onClick={onTriggerNewOffer}
            className="w-full flex items-center justify-between bg-white hover:bg-gray-50 text-gray-800 p-3 rounded-xl border border-gray-200 hover:border-brand-lime transition-all duration-200 group text-xs font-bold cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-lime" />
              Publish Flash Procurement Offer
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-855 transition-all" />
          </button>

          {activeOrderToDeliver && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="bg-brand-purple/5 border border-brand-purple/20 rounded-xl p-3 text-center">
                <div className="text-xs text-brand-purple font-bold mb-1">Active Deliverable Order: {activeOrderToDeliver.id}</div>
                <button
                  onClick={onSimulateDeliveryStatus}
                  className="w-full mt-2 bg-brand-lime hover:bg-brand-lime-dark text-white py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-brand-lime/30"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Simulate Delivery Progression
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Medicine Catalog Import - Admin Restricted */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 shadow-xs relative overflow-hidden">
        {currentUser?.role === "Admin" ? (
          <>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileSpreadsheet className="text-brand-purple w-4.5 h-4.5" />
              Bulk Medicine Catalog Import
            </h4>
            <p className="text-[11px] text-gray-400 mb-4 leading-relaxed font-semibold">
              Upload multi-product CSV sheets or paste catalog tables below to dynamically compile products, configure FEFO batch timelines, and authorize live warehouse reserve stock.
            </p>

            {/* Test Templates Cockpit */}
            <div className="mb-4 bg-white border border-gray-150 p-3 rounded-xl shadow-3xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">
                Accelerated Testing Templates
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={loadCleanSample}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-lg p-2 text-center text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Load Healthy CSV
                </button>
                <button
                  type="button"
                  onClick={loadFailingSample}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50 rounded-lg p-2 text-center text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Load Error CSV
                </button>
              </div>
            </div>

            {/* File Drag-and-Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 mb-4 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-brand-purple bg-brand-purple/5"
                  : "border-gray-200 hover:border-brand-purple/50 bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="w-6 h-6 text-brand-purple mx-auto mb-2" />
              <p className="text-[11px] font-bold text-gray-700">
                Drag & Drop CSV or <span className="text-brand-purple">Browse</span>
              </p>
              <p className="text-[9px] text-gray-400 mt-1 font-semibold">Supports standard medicine CSV catalogs</p>
            </div>

            {/* Manual Text Ingestion */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">
                CSV Source Editor
              </label>
              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Product Name,Generic Name,Company Name,Category,Strength,Pack Size,MRP,Selling Price..."
                className="w-full h-32 p-3 text-[10px] font-mono bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-purple focus:border-brand-purple resize-none leading-relaxed"
              />
            </div>

            {/* Ingest Commit Action */}
            <button
              onClick={triggerImport}
              disabled={isImporting || !csvContent.trim()}
              className="w-full bg-brand-purple hover:bg-brand-purple/95 text-white py-2 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-brand-purple/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Ingesting Catalog...
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  Commit Catalog Import
                </>
              )}
            </button>

            {/* Success/Error Report Cockpit */}
            {importError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-800 text-[10px] leading-relaxed flex gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="font-semibold">{importError}</span>
              </div>
            )}

            {importResult && (
              <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-3 py-2 border-b border-gray-150 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase">
                    Import Execution Report
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    Processed {importResult.totalProcessed} records
                  </span>
                </div>

                <div className="p-3 space-y-3.5">
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-100">
                      <span className="block text-[18px] font-black">{importResult.successCount}</span>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-600">Succeeded</span>
                    </div>
                    <div className="bg-rose-50 text-rose-800 p-2 rounded-lg border border-rose-100">
                      <span className="block text-[18px] font-black">{importResult.failureCount}</span>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-rose-600">Failed</span>
                    </div>
                  </div>

                  {/* Failed lists */}
                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-rose-600 uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Detailed Rejection Inquest ({importResult.errors.length})
                      </span>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {importResult.errors.map((err: any, idx: number) => (
                          <div key={idx} className="bg-rose-50/50 border border-rose-100 rounded-lg p-2.5 text-[9.5px]">
                            <div className="font-extrabold text-rose-800 flex justify-between">
                              <span>Row {err.row}: {err.productName}</span>
                            </div>
                            <ul className="list-disc list-inside mt-1 text-slate-600 space-y-0.5 font-medium">
                              {err.errors.map((msg: string, mIdx: number) => (
                                <li key={mIdx}>{msg}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResult.successCount > 0 && (
                    <div className="bg-emerald-50/40 text-emerald-800 border border-emerald-100 rounded-xl p-2.5 text-[10px] font-semibold text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      Database synchronized! {importResult.successCount} active medical lines live on shelves.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-gray-400">
            <Lock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
              Bulk Medicine Catalog Import
            </h4>
            <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto leading-normal font-semibold">
              Wholesale data uploads and inventory ingestion controls are security-restricted to accounts with active <strong className="text-brand-purple font-black">Admin</strong> privileges.
            </p>
            <div className="mt-3 bg-gray-100 border border-gray-150 px-2 py-1.5 rounded-lg text-[9px] font-mono text-gray-500 inline-block font-bold">
              Role Required: Admin (Current: {currentUser?.role || "Pharmacy Owner"})
            </div>
          </div>
        )}
      </div>

      {/* Enterprise Capabilities Card */}
      <div className="mt-auto pt-6 border-t border-gray-150 text-xs text-gray-400 space-y-2">
        <div className="flex justify-between">
          <span>Active Depot:</span>
          <span className="text-gray-700 font-mono font-bold">Dhaka Central Depot</span>
        </div>
        <div className="flex justify-between">
          <span>Inventory Flow:</span>
          <span className="text-gray-700 font-mono font-bold">FEFO Authorized</span>
        </div>
        <div className="flex justify-between">
          <span>Database Mirroring:</span>
          <span className="text-brand-lime font-mono font-bold">Supabase Ready</span>
        </div>
      </div>
    </div>
  );
}
