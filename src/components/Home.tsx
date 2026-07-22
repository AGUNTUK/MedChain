import React, { useState, useEffect } from "react";
import {
  Bell,
  Search,
  ChevronRight,
  TrendingUp,
  Tag,
  Package,
  Sparkles,
  RefreshCw,
  Clock,
  Heart,
  Plus,
  ShoppingCart,
  Minus,
  Check
} from "lucide-react";
import MediChainLogo from "./MediChainLogo";
import { Product } from "../types";
import { productService } from "../services";
import NotificationBell from "./NotificationBell";
import { formatProductPriceLabel } from "../lib/utils";
import { useFlyToCart } from "../context/FlyToCartContext";

interface HomeProps {
  onTriggerSearch: (query?: string, category?: string) => void;
  onAddToCart: (productId: string, qty: number) => Promise<boolean>;
  onToggleFavourite: (productId: string) => void;
  favouriteIds: string[];
  pharmacyName?: string;
  onOpenProductDetails: (product: Product) => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  cartQuantities?: Record<string, number>;
  onUpdateCartQty?: (productId: string, currentQty: number, change: number) => Promise<void>;
  onOpenCart?: () => void;
  cartCount?: number;
}

export default function Home({
  onTriggerSearch,
  onAddToCart,
  onToggleFavourite,
  favouriteIds,
  pharmacyName = "City Pharma",
  onOpenProductDetails,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  cartQuantities = {},
  onUpdateCartQty,
  onOpenCart,
  cartCount = 0
}: HomeProps) {
  const [bestDeals, setBestDeals] = useState<Product[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [highestDiscounts, setHighestDiscounts] = useState<Product[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const categoryIconMap: Record<string, string> = {
    "Tablet": "💊",
    "Capsule": "🧬",
    "Syrup": "🧪",
    "Suspension": "🧴",
    "Drops": "💧",
    "Injection": "💉",
    "Infusion": "🩻",
    "Inhaler": "🌬️",
    "Cream": "🧴",
    "Ointment": "🩹",
    "Gel": "🧊",
    "Lotion": "🫧",
    "Powder": "🧂",
    "Sachet": "🛍️",
    "Oral Solution": "🍹",
    "Oral Saline": "🧂",
    "Eye Drop": "👁️",
    "Eye Ointment": "👁️‍🗨️",
    "Ear Drop": "👂",
    "Nasal Spray": "👃",
    "Suppository": "💊",
    "Pessary": "💊",
    "Patch": "🩹",
    "Insulin": "💉",
    "Vaccine": "🛡️",
    "Medical Devices": "🩺",
    "Surgical Items": "✂️",
    "Dressing": "🤕",
    "Bandage": "🩹",
    "Gloves": "🧤",
    "Masks": "😷",
    "Test Kits": "🧪",
    "Nebulizer Solution": "💨",
    "Herbal": "🌿",
    "Ayurvedic": "🍂",
    "Homeopathic": "🌼",
    "Vitamins": "🍊",
    "Supplements": "🥗",
    "Baby Care": "🍼",
    "Personal Care": "🧼",
    "Diabetic Care": "🩸",
    "First Aid": "🚑",
    "Others": "📦"
  };

  const fetchHomeWidgets = async () => {
    try {
      // 0. Fetch Categories
      const categoriesData = await productService.getCategories();
      if (categoriesData.length > 0) {
        setDbCategories(categoriesData);
      } else {
        // Fallback to default full list if DB is empty
        setDbCategories(Object.keys(categoryIconMap));
      }

      // 1. Fetch Deals
      const dataDeals = await productService.getProducts({ filter: "deals" });
      setBestDeals(dataDeals.slice(0, 3));
      setHighestDiscounts(dataDeals.slice(0, 4));

      // 2. Fetch Frequently ordered
      const dataFreq = await productService.getProducts({ filter: "frequent" });
      setFrequentProducts(dataFreq.slice(0, 4));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHomeWidgets();
  }, []);

  const { triggerFlyToCart } = useFlyToCart();

  const handleQuickBuy = async (
    productId: string,
    defaultBulkSize: number = 1,
    e?: React.MouseEvent<HTMLElement>,
    imageSrc?: string
  ) => {
    if (e && e.currentTarget) {
      triggerFlyToCart(e.currentTarget, imageSrc);
    }
    setSuccessId(productId);
    const success = await onAddToCart(productId, defaultBulkSize);
    if (success) {
      setTimeout(() => setSuccessId(null), 1200);
    } else {
      setSuccessId(null);
    }
  };

  const displayCategoryNames = Array.from(new Set([
    ...Object.keys(categoryIconMap),
    ...dbCategories
  ]));

  const displayCategories = displayCategoryNames.map(name => ({
    name,
    icon: categoryIconMap[name] || "📦"
  }));

  const visibleCategories = showAllCategories ? displayCategories : displayCategories.slice(0, 12);

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
        <div className="flex items-center gap-2">
          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 relative cursor-pointer flex items-center justify-center border border-slate-200/20 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-lime text-slate-900 font-extrabold text-[8px] px-1.5 py-0.5 rounded-full min-w-4 text-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}
          <NotificationBell />
        </div>
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

        {/* Category Carousel Grid */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Browse Drug Class / Categories
            </h3>
            {displayCategories.length > 12 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="text-[10px] font-bold text-brand-purple hover:underline"
              >
                {showAllCategories ? "View Less" : "View All"}
              </button>
            )}
          </div>
          
          {showAllCategories ? (
            <div className="grid grid-cols-4 gap-2">
              {visibleCategories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => onTriggerSearch(undefined, cat.name)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl border shadow-sm cursor-pointer hover:shadow hover:scale-[1.02] transition-all bg-white"
                >
                  <span className="text-xl mb-1.5">{cat.icon}</span>
                  <span className="text-[8px] font-extrabold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center px-1">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide snap-x">
              {visibleCategories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => onTriggerSearch(undefined, cat.name)}
                  className="flex-shrink-0 snap-start flex flex-col items-center justify-center py-2 px-1 w-20 h-20 rounded-2xl border shadow-sm cursor-pointer hover:shadow hover:scale-[1.02] transition-all bg-white"
                >
                  <span className="text-2xl mb-1.5">{cat.icon}</span>
                  <span className="text-[9px] font-extrabold text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center px-1">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Frequent / Recently Ordered */}
        {frequentProducts.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-brand-lime" />
                Frequently Ordered
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 pr-4 -mr-4 pl-1">
              {frequentProducts.map(p => {
                const inCartQty = cartQuantities[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => onOpenProductDetails(p)}
                    className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:border-slate-200 cursor-pointer flex flex-col justify-between relative min-w-[140px] flex-shrink-0"
                  >
                    {inCartQty > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-brand-purple text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10 shadow-sm animate-fade-in">
                        {inCartQty} in cart
                      </span>
                    )}
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">{p.packSize}</span>
                      </div>
                      <h4 className="text-xs font-black text-brand-charcoal truncate">{p.name}</h4>
                      <p className="text-[9px] text-slate-400 uppercase font-bold truncate mt-0.5">{p.genericName}</p>
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-brand-purple">৳{p.sellingPrice}</span>
                        <span className="text-[8px] text-slate-400 font-bold font-mono">{formatProductPriceLabel(p.sellingPrice, p.packSize)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inCartQty > 0) {
                            onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, 1);
                          } else {
                            handleQuickBuy(p.id, 1, e, p.imageUrl || p.image_url);
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                          successId === p.id
                            ? "bg-emerald-600 text-white scale-110 shadow-md"
                            : "bg-brand-lime text-slate-900 hover:bg-brand-lime-dark"
                        }`}
                      >
                        {successId === p.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                {/* Image */}
                {p.imageUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0" onClick={() => onOpenProductDetails(p)}>
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                )}

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

                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 line-through">MRP ৳{p.mrp}</span>
                      <span className="text-xs font-black text-brand-purple">৳{p.sellingPrice}</span>
                    </div>
                    <span className="text-[8px] text-slate-500 font-bold font-mono bg-slate-50 px-1.5 py-0.5 rounded">
                      {formatProductPriceLabel(p.sellingPrice, p.packSize)}
                    </span>
                  </div>
                </div>

                 {/* Add block */}
                <div className="flex flex-col justify-end">
                  {(() => {
                    const inCartQty = cartQuantities[p.id] || 0;
                    if (inCartQty > 0) {
                      return (
                        <div className="flex items-center gap-1.5 bg-brand-purple/5 border border-brand-purple/20 rounded-xl px-1.5 py-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, -1);
                            }}
                            className="text-brand-purple hover:bg-brand-purple hover:text-white p-0.5 rounded transition-all cursor-pointer flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-black text-brand-purple font-mono">{inCartQty}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, 1);
                            }}
                            className="text-brand-purple hover:bg-brand-purple hover:text-white p-0.5 rounded transition-all cursor-pointer flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickBuy(p.id, 1, e, p.imageUrl || p.image_url);
                        }}
                        disabled={successId === p.id}
                        className={`py-1.5 px-3 rounded-xl text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                          successId === p.id
                            ? "bg-emerald-600 text-white shadow-md scale-105"
                            : "bg-brand-lime text-slate-900 hover:shadow-sm"
                        }`}
                      >
                        {successId === p.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            ✓ Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Buy
                          </>
                        )}
                      </button>
                    );
                  })()}
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
            {highestDiscounts.map(p => {
              const inCartQty = cartQuantities[p.id] || 0;
              return (
                <div
                  key={p.id}
                  onClick={() => onOpenProductDetails(p)}
                  className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:border-slate-200 cursor-pointer flex flex-col justify-between relative"
                >
                  {inCartQty > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-brand-purple text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10 shadow-sm animate-fade-in">
                      {inCartQty} in cart
                    </span>
                  )}
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
                  <div className="mt-3 flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-brand-purple">৳{p.sellingPrice}</span>
                      <span className="text-[7.5px] text-slate-400 font-bold font-mono">
                        {formatProductPriceLabel(p.sellingPrice, p.packSize)}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 line-through">৳{p.mrp}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
