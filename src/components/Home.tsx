import React, { useState, useEffect } from "react";
import {
  Bell,
  Search,
  ChevronRight,
  TrendingUp,
  Tag,
  Package,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Clock,
  Heart,
  Plus
} from "lucide-react";
import MediChainLogo from "./MediChainLogo";
import { Product } from "../types";
import { productService } from "../services";

interface HomeProps {
  onTriggerSearch: (query?: string, category?: string) => void;
  onAddToCart: (productId: string, qty: number) => Promise<boolean>;
  onToggleFavourite: (productId: string) => void;
  favouriteIds: string[];
  pharmacyName?: string;
  onOpenProductDetails: (product: Product) => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
}

export default function Home({
  onTriggerSearch,
  onAddToCart,
  onToggleFavourite,
  favouriteIds,
  pharmacyName = "City Pharma",
  onOpenProductDetails,
  onOpenNotifications,
  unreadNotificationsCount
}: HomeProps) {
  const [bestDeals, setBestDeals] = useState<Product[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [highestDiscounts, setHighestDiscounts] = useState<Product[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<Product[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);

  const categories = [
    { name: "Tablet", color: "bg-blue-50 border-blue-100 text-blue-700", icon: "💊" },
    { name: "Capsule", color: "bg-amber-50 border-amber-100 text-amber-700", icon: "🧬" },
    { name: "Syrup", color: "bg-rose-50 border-rose-100 text-rose-700", icon: "🧪" },
    { name: "Injection", color: "bg-purple-50 border-purple-100 text-purple-700", icon: "💉" },
    { name: "Cream", color: "bg-teal-50 border-teal-100 text-teal-700", icon: "🧴" },
    { name: "Supplement", color: "bg-indigo-50 border-indigo-100 text-indigo-700", icon: "🥗" }
  ];

  const fetchHomeWidgets = async () => {
    try {
      // 1. Fetch Deals
      const dataDeals = await productService.getProducts({ filter: "deals" });
      setBestDeals(dataDeals.slice(0, 3));
      setHighestDiscounts(dataDeals.slice(0, 4));

      // 2. Fetch Frequently ordered
      const dataFreq = await productService.getProducts({ filter: "frequent" });
      setFrequentProducts(dataFreq.slice(0, 4));

      // 3. Fetch Low Stock warnings
      const dataLow = await productService.getProducts({ filter: "low_stock" });
      setLowStockAlerts(dataLow);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHomeWidgets();
  }, []);

  const handleQuickBuy = async (productId: string, defaultBulkSize: number = 10) => {
    const success = await onAddToCart(productId, defaultBulkSize);
    if (success) {
      setSuccessId(productId);
      setTimeout(() => setSuccessId(null), 1500);
    }
  };

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col select-none overflow-y-auto pb-20">
      {/* Header Area */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <MediChainLogo size="sm" withText={false} />
          <div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Logged Pharmacy</span>
            <h1 className="text-xs font-black text-brand-charcoal truncate max-w-[160px] leading-tight">
              {pharmacyName}
            </h1>
          </div>
        </div>

        {/* Notifications and status */}
        <button
          onClick={onOpenNotifications}
          className="p-2 bg-slate-50 border border-slate-100 rounded-full hover:bg-slate-100 transition-colors relative cursor-pointer"
        >
          <Bell className="w-4.5 h-4.5 text-slate-600" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white font-extrabold text-[8px] rounded-full flex items-center justify-center animate-pulse">
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4">
        {/* Mock Search Trigger */}
        <div
          onClick={() => onTriggerSearch()}
          className="flex items-center bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
        >
          <Search className="text-slate-400 w-4.5 h-4.5 mr-2.5" />
          <span className="text-xs text-slate-400 font-semibold">Search medicine by brand, generic, or manufacturer...</span>
        </div>

        {/* Restock Warning Banner (If any products are low stock) */}
        {lowStockAlerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex gap-3 items-start shadow-sm">
            <AlertTriangle className="text-amber-600 w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h4 className="font-extrabold text-amber-900">Personalized Restock Alert</h4>
              <p className="text-amber-700/90 text-[10px] mt-0.5 leading-relaxed font-semibold">
                You have {lowStockAlerts.length} catalog drugs running low on warehouse stocks. Order soon to prevent depot stockout.
              </p>
              <button
                onClick={() => onTriggerSearch(undefined, "All")}
                className="text-[10px] font-black text-brand-purple mt-2 flex items-center gap-0.5 hover:underline"
              >
                View Low Stocks
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Category Carousel Grid */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Browse Drug Class / Categories
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => onTriggerSearch(undefined, cat.name)}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center shadow-sm cursor-pointer hover:shadow hover:scale-[1.02] transition-all bg-white`}
              >
                <span className="text-xl mb-1">{cat.icon}</span>
                <span className="text-[10px] font-extrabold text-slate-700">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* B2B Today's Promotional Banner */}
        <div className="bg-gradient-to-r from-brand-purple to-brand-purple-dark rounded-3xl p-4.5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <span className="bg-brand-lime text-slate-950 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg tracking-wider">
            Super Bulk Savings
          </span>
          <h3 className="text-sm font-black mt-2 leading-snug">
            Up to 25% Off Beximco & Square Consignments!
          </h3>
          <p className="text-[10px] text-white/80 mt-1 font-medium leading-relaxed">
            Order standard bulk cartons today and unlock immediate 24-hour delivery directly to your pharmacy.
          </p>
          <button
            onClick={() => onTriggerSearch("Napa")}
            className="mt-3.5 bg-brand-lime text-slate-900 font-extrabold py-1.5 px-3.5 rounded-xl text-[10px] flex items-center gap-0.5 hover:shadow-md cursor-pointer transition-all"
          >
            Order Napa Bulk Specials
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Today's Best Deals list */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-brand-purple" />
              Today's Wholesale Best Deals
            </h3>
          </div>
          <div className="space-y-2">
            {bestDeals.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-100 flex gap-3 shadow-sm hover:border-slate-200 transition-all cursor-pointer relative"
              >
                {/* Save label */}
                <div className="absolute top-3 right-3 bg-brand-purple text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {p.discountPercentage}% OFF
                </div>

                {/* Info */}
                <div className="flex-1" onClick={() => onOpenProductDetails(p)}>
                  <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                    {p.category}
                  </span>
                  <h4 className="text-xs font-black text-brand-charcoal mt-1 leading-tight">
                    {p.name} <span className="text-[10px] font-bold text-slate-400">{p.strength}</span>
                  </h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{p.genericName}</p>
                  <p className="text-[9px] text-slate-500 font-semibold mt-1">{p.company}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-slate-400 line-through">MRP ৳{p.mrp}</span>
                    <span className="text-xs font-black text-brand-purple">৳{p.sellingPrice}</span>
                  </div>
                </div>

                {/* Add block */}
                <div className="flex flex-col justify-end">
                  <button
                    onClick={() => handleQuickBuy(p.id)}
                    disabled={successId === p.id}
                    className={`py-1.5 px-3 rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                      successId === p.id
                        ? "bg-brand-purple text-white"
                        : "bg-brand-lime text-slate-900 hover:shadow-sm"
                    }`}
                  >
                    {successId === p.id ? (
                      <>
                        <Clock className="w-3 h-3" />
                        Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Buy 10 Box
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Discount Products */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-brand-lime" />
              Highest Discount Products
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {highestDiscounts.map(p => (
              <div
                key={p.id}
                onClick={() => onOpenProductDetails(p)}
                className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:border-slate-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="bg-brand-purple/10 text-brand-purple text-[8px] font-black px-1.5 py-0.5 rounded">
                      {p.discountPercentage}% OFF
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono font-bold">Pack: {p.packSize.split(" ")[0]}</span>
                  </div>
                  <h4 className="text-xs font-black text-brand-charcoal truncate">{p.name}</h4>
                  <p className="text-[9px] text-slate-400 uppercase font-bold truncate mt-0.5">{p.genericName}</p>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs font-black text-brand-purple">৳{p.sellingPrice}</span>
                  <span className="text-[9px] text-slate-400 line-through">৳{p.mrp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
