import React, { useState } from "react";
import { Product } from "../../types";
import { 
  Search, AlertTriangle, Calendar, MapPin, Edit, ChevronLeft, ChevronRight, 
  Boxes, RefreshCw, X, Check, Eye, HelpCircle, CheckCircle2
} from "lucide-react";
import { getRackLocation, saveRackLocation } from "./depotUtils";

interface InventoryProps {
  products: Product[];
  onQuickEdit?: (product: Product) => void;
}

export default function Inventory({ products, onQuickEdit }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "critical" | "warning" | "safe">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Local Stock Edit Modal State (in case called stand-alone)
  const [localEditProduct, setLocalEditProduct] = useState<Product | null>(null);
  const [editStockQty, setEditStockQty] = useState(0);
  const [editBatchNo, setEditBatchNo] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editRackLoc, setEditRackLoc] = useState("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Calculate Expiry Status & Badge Color
  const getExpiryStatus = (expiryDateStr: string) => {
    if (!expiryDateStr) return { label: "Unknown Expiry", level: "unknown", color: "text-slate-500 bg-slate-900 border-slate-800" };
    
    const expiryDate = new Date(expiryDateStr);
    const msLeft = expiryDate.getTime() - Date.now();
    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { label: "EXPIRED", level: "expired", color: "text-red-500 bg-red-950/40 border-red-900 animate-pulse font-black" };
    }
    if (daysLeft < 90) { // < 3 months
      return { label: `CRITICAL: Expiry ${daysLeft}d`, level: "critical", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    }
    if (daysLeft < 180) { // < 6 months
      return { label: `WARNING: Expiry ${daysLeft}d`, level: "warning", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    return { label: `Safe: ${daysLeft} days left`, level: "safe", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  };

  // Advanced search and filters logic across 20k+ entries
  const processedProducts = products.filter(product => {
    // Expiry FEFO Filter
    const expStatus = getExpiryStatus(product.expiryDate);
    if (expiryFilter === "critical" && expStatus.level !== "critical" && expStatus.level !== "expired") return false;
    if (expiryFilter === "warning" && expStatus.level !== "warning") return false;
    if (expiryFilter === "safe" && expStatus.level !== "safe") return false;

    // Stock Filter
    if (stockFilter === "low" && product.availableStock >= 100) return false;

    // Search query matched on Name, Generic, Company, or Rack Location
    const rackLocation = getRackLocation(product.id, product.name, product.category);
    const searchStr = `${product.name} ${product.genericName} ${product.company} ${rackLocation}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  // Pagination bounds
  const totalItems = processedProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = processedProducts.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleOpenEdit = (prod: Product) => {
    // If parent handler exists, defer to parent (opens Dashboard Scanner)
    if (onQuickEdit) {
      onQuickEdit(prod);
      return;
    }

    // Fallback: Open locally
    setLocalEditProduct(prod);
    setEditStockQty(prod.availableStock);
    setEditBatchNo(prod.batchNumber);
    setEditExpiryDate(prod.expiryDate);
    setEditRackLoc(getRackLocation(prod.id, prod.name, prod.category));
  };

  const handleLocalSave = async () => {
    if (!localEditProduct) return;
    try {
      const res = await fetch("/api/admin/inventory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: localEditProduct.id,
          availableStock: editStockQty,
          batchNumber: editBatchNo,
          expiryDate: editExpiryDate
        })
      });

      if (res.ok) {
        saveRackLocation(localEditProduct.id, editRackLoc);
        setSuccessBanner(`Inventory details updated successfully for ${localEditProduct.name}.`);
        setLocalEditProduct(null);
        setTimeout(() => setSuccessBanner(null), 4000);
      } else {
        setErrorBanner("Failed to update inventory.");
      }
    } catch (err) {
      setErrorBanner("An error occurred during update.");
    }
  };

  return (
    <div className="space-y-6">

      {/* Success banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {successBanner}
        </div>
      )}

      {/* Controls & Search */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Medicine Name, Generic Name, Company, or Rack Location..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset page on type
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">FEFO Expiry Filter:</span>
            {[
              { id: "all", label: "All Items" },
              { id: "critical", label: "Critical (<3m)" },
              { id: "warning", label: "Warning (<6m)" },
              { id: "safe", label: "Safe Stock" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setExpiryFilter(f.id as any); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  expiryFilter === f.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Stock State:</span>
            <button
              onClick={() => { setStockFilter(stockFilter === "all" ? "low" : "all"); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFilter === "low" ? "bg-rose-600 text-white shadow-md shadow-rose-600/10" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Show Low Stock (&lt;100)
            </button>
          </div>
        </div>

      </div>

      {/* Main Table Layout */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table summary */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-bold">
          <span>Found {totalItems} matches in warehouse catalog</span>
          <span>Showing {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Medicine Information</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Batch Code</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Rack Location</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">WMS Expiry Warning (FEFO)</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Stock Count</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300 font-medium">
              {paginatedProducts.map(product => {
                const exp = getExpiryStatus(product.expiryDate);
                const isLow = product.availableStock < 100;
                const rackLoc = getRackLocation(product.id, product.name, product.category);

                return (
                  <tr key={product.id} className="hover:bg-slate-900/30 transition-all">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-100 text-sm">{product.name}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">{product.genericName} • {product.company}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-400">{product.batchNumber || "B-3281"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{rackLoc}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${exp.color}`}>
                        {exp.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm ${isLow ? "text-rose-400" : "text-slate-100"}`}>
                          {product.availableStock} units
                        </span>
                        {isLow && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase">Low</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 p-2 rounded-xl transition-all cursor-pointer"
                        title="Update Stock Info"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          
          {/* Page Selector Size */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg p-1 text-slate-300 focus:outline-none"
            >
              {[15, 30, 50, 100].map(size => (
                <option key={size} value={size}>{size} rows</option>
              ))}
            </select>
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="px-3.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-bold">
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* ==================== STANDALONE QUICK EDIT INLINE MODAL ==================== */}
      {localEditProduct && (
        <div className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                <Boxes className="w-4.5 h-4.5 text-indigo-500" />
                Quick Stock Override
              </h4>
              <button onClick={() => setLocalEditProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="font-extrabold text-slate-200 text-sm block">{localEditProduct.name}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{localEditProduct.genericName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Available Stock</label>
                  <input
                    type="number"
                    value={editStockQty}
                    onChange={(e) => setEditStockQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Batch Number</label>
                  <input
                    type="text"
                    value={editBatchNo}
                    onChange={(e) => setEditBatchNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rack / Shelf Location</label>
                  <input
                    type="text"
                    value={editRackLoc}
                    onChange={(e) => setEditRackLoc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setLocalEditProduct(null)}
                  className="flex-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLocalSave}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
