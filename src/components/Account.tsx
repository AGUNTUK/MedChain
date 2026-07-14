import React, { useState, useEffect } from "react";
import { User as UserIcon, Heart, Shield, RefreshCcw, LogOut, FileText, Check, ShoppingCart, LifeBuoy } from "lucide-react";
import { Product, Pharmacy, User } from "../types";
import { paymentService } from "../services/payment";
import { productService } from "../services/product";

interface AccountProps {
  pharmacy: Pharmacy | null;
  currentUser: User | null;
  onLogout: () => void;
  onAddToCart: (productId: string, qty: number) => Promise<boolean>;
  favouriteIds: string[];
}

export default function Account({ pharmacy, currentUser, onLogout, onAddToCart, favouriteIds }: AccountProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch analytics (Admin and Pharmacy Owner only)
      const dataAnal = await paymentService.getAnalytics();
      setAnalytics(dataAnal);

      // Fetch favourites
      const dataFav = await productService.getFavourites();
      setFavProducts(dataFav);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [favouriteIds, currentUser]);

  const handleQuickReorder = async (productId: string) => {
    const success = await onAddToCart(productId, 10); // Standard quick reorder (10 boxes)
    if (success) {
      setSuccessId(productId);
      setTimeout(() => setSuccessId(null), 1500);
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col select-none overflow-y-auto p-4 space-y-4 pb-20">
      {/* Account Info Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 flex items-center gap-4 relative overflow-hidden shadow-sm">
        <div className="w-12 h-12 bg-brand-purple/10 border border-brand-purple/25 rounded-full flex items-center justify-center font-black text-brand-purple text-lg shadow-inner">
          {pharmacy?.pharmacyName?.charAt(0) || "P"}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xs font-black text-brand-charcoal leading-tight truncate">
            {pharmacy?.pharmacyName || "Pharmacy Profile"}
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5 font-semibold flex items-center gap-1">
            <UserIcon className="w-3.5 h-3.5 text-brand-purple flex-shrink-0" />
            <span className="truncate">Owner: {currentUser?.name || pharmacy?.ownerName || "Zahid Hasan"}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="bg-brand-purple/10 text-brand-purple font-extrabold text-[8px] px-1.5 py-0.5 rounded-md">
              Role: {currentUser?.role || "Pharmacy Owner"}
            </span>
            <span className="text-[9px] text-slate-400 font-bold font-mono">
              Lic: {pharmacy?.licenseNo || "Pending"}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-slate-50 rounded-xl transition-all cursor-pointer flex-shrink-0"
          title="Sign out of MediChain"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Credit & Savings Dashboard */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-300 shadow-lg">
            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider mb-1">
              Outstanding Dues
            </span>
            <div className="text-base font-black text-white font-mono">
              ৳{pharmacy ? pharmacy.usedCredit.toLocaleString() : "0"}
            </div>
            <p className="text-[9px] text-brand-purple mt-1.5 font-semibold font-mono">
              Limit: ৳{pharmacy?.creditLimit.toLocaleString()}
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider mb-1">
              Total Savings Report
            </span>
            <div className="text-base font-black text-emerald-600 font-mono">
              ৳{analytics.totalSavings.toLocaleString()}
            </div>
            <p className="text-[9px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">
              Avg 22% Bulk Savings
            </p>
          </div>
        </div>
      )}

      {/* Saved Favourites List / Quick order catalog */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 space-y-3 shadow-sm">
        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-rose-500 fill-current" />
          Saved Procurement Favorites
        </h3>

        {favProducts.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <p className="text-xs font-semibold">No Favorites Saved</p>
            <p className="text-[10px] text-slate-400 mt-1">Tap hearts on catalog medicines for instant access here.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {favProducts.map(p => (
              <div
                key={p.id}
                className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-xs hover:border-slate-200 transition-all"
              >
                <div>
                  <div className="font-bold text-slate-700">{p.name} ({p.strength})</div>
                  <div className="text-[10px] text-slate-400 font-mono">৳{p.sellingPrice} / Box</div>
                </div>
                <button
                  onClick={() => handleQuickReorder(p.id)}
                  disabled={successId === p.id}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                    successId === p.id
                      ? "bg-brand-purple text-white"
                      : "bg-brand-lime text-slate-900 hover:shadow-sm"
                  }`}
                >
                  {successId === p.id ? (
                    <>
                      <Check className="w-3 h-3" />
                      Added!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-3 h-3" />
                      Quick 10 Box
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Corporate Support and DGDA Details */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3.5 shadow-sm">
        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <LifeBuoy className="w-4 h-4 text-brand-purple" />
          B2B Support & Depot Helpline
        </h3>
        
        <div className="text-xs space-y-2 leading-relaxed font-semibold text-slate-600">
          <div className="flex justify-between">
            <span className="text-slate-400">Depot Manager:</span>
            <span>019-MEDICHAIN</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Support Hours:</span>
            <span>24 Hours / 7 Days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">DGDA License Verification:</span>
            <span className="text-brand-purple">Completed & Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
