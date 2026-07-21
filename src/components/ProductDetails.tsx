import React from "react";
import { X, ShieldCheck, AlertCircle, Calendar, Truck, Layers, Coins } from "lucide-react";
import { Product } from "../types";
import { formatProductPriceLabel } from "../lib/utils";

interface ProductDetailsProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (productId: string, qty: number) => void;
}

export default function ProductDetails({ product, onClose, onAddToCart }: ProductDetailsProps) {
  if (!product) return null;

  const handleQuickAdd = (qty: number) => {
    onAddToCart(product.id, qty);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/60 flex items-end z-50 select-none animate-fade-in">
      <div className="w-full bg-brand-bg rounded-t-3xl p-6 border-t border-slate-200 shadow-2xl overflow-y-auto max-h-[85%] animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[9px] bg-brand-purple text-white font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
              {product.category}
            </span>
            <h2 className="text-base font-extrabold text-brand-charcoal mt-1.5 flex items-center gap-1.5">
              {product.name} <span className="text-xs font-bold text-slate-500">{product.strength}</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
              {product.genericName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Product Image */}
        {product.imageUrl && (
          <div className="w-full h-40 bg-white rounded-2xl border border-slate-100 mb-4 overflow-hidden shadow-sm flex items-center justify-center p-2">
            <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain" />
          </div>
        )}

        {/* Corporate details */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Manufacturer:</span>
            <span className="font-bold text-slate-700">{product.company}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Packaging Format:</span>
            <span className="font-mono font-bold text-slate-700">{product.packSize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">FEFO Expiry Date:</span>
            <span className="font-mono font-extrabold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-purple" />
              {product.expiryDate}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Active Batch No:</span>
            <span className="font-mono font-bold text-brand-purple">{product.batchNumber}</span>
          </div>
        </div>

        {/* Inventory Stock Levels & Supply Chain Logic */}
        <div className="bg-slate-950/5 rounded-2xl p-4 border border-slate-100 mb-4">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-brand-purple" />
            Supply Chain & Depot Stock Ledger
          </h4>

          <div className="grid grid-cols-3 gap-3 text-center mb-3">
            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
              <span className="text-[9px] text-slate-400 block font-mono">Available</span>
              <span className="text-sm font-black text-brand-purple">{product.availableStock} Box</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
              <span className="text-[9px] text-slate-400 block font-mono">Reserved</span>
              <span className="text-sm font-black text-slate-500">{product.reservedStock} Box</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
              <span className="text-[9px] text-slate-400 block font-mono">Sold Total</span>
              <span className="text-sm font-black text-brand-lime">{product.soldStock} Box</span>
            </div>
          </div>


        </div>

        {/* Pricing details */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 text-center flex flex-col justify-center">
            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">M.R.P. Box Price</span>
            <span className="text-base font-extrabold text-slate-400 line-through mt-1 block">৳{product.mrp}</span>
            <span className="text-[8px] text-slate-400 font-bold font-mono mt-0.5">{formatProductPriceLabel(product.mrp, product.packSize)}</span>
          </div>

          <div className="bg-brand-purple/5 p-3.5 rounded-2xl border border-brand-purple/20 text-center flex flex-col justify-center">
            <span className="text-[9px] text-brand-purple block font-extrabold uppercase tracking-wider">MediChain Net Wholesale</span>
            <span className="text-lg font-black text-brand-purple mt-1 block">৳{product.sellingPrice}</span>
            <span className="text-[8px] text-brand-purple font-bold font-mono mt-0.5">{formatProductPriceLabel(product.sellingPrice, product.packSize)}</span>
          </div>
        </div>

        {/* High contrast Net Rebate savings pill */}
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-2.5 text-center text-xs font-bold mb-5 flex items-center justify-between shadow-3xs">
          <span>B2B Net Savings:</span>
          <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-black font-mono">Save ৳{product.mrp - product.sellingPrice} / Box</span>
        </div>

        {/* Quick Add To Cart triggers */}
        <div className="space-y-2.5">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
            Select Bulk Order Size
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickAdd(10)}
              className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-brand-purple p-3 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <span className="text-xs font-black">10 Boxes</span>
              <span className="text-[9px] text-slate-400 font-mono">৳{(10 * product.sellingPrice).toLocaleString()}</span>
            </button>

            <button
              onClick={() => handleQuickAdd(25)}
              className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-brand-purple p-3 rounded-xl text-xs font-bold text-slate-700 flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <span className="text-xs font-black">25 Boxes</span>
              <span className="text-[9px] text-slate-400 font-mono">৳{(25 * product.sellingPrice).toLocaleString()}</span>
            </button>

            <button
              onClick={() => handleQuickAdd(50)}
              className="bg-brand-purple text-white hover:bg-brand-purple-dark p-3 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <span className="text-xs font-black">50 Boxes</span>
              <span className="text-[9px] text-white/80 font-mono">৳{(50 * product.sellingPrice).toLocaleString()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
