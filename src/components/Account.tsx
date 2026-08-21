import React, { useState, useEffect } from "react";
import { User as UserIcon, Heart, Shield, RefreshCcw, LogOut, FileText, Check, ShoppingCart, LifeBuoy, Pencil, Award, Clock, AlertTriangle, Headset } from "lucide-react";
import { Product, Pharmacy, User } from "../types";
import { paymentService } from "../services/payment";
import { productService } from "../services/product";
import { orderService } from "../services/order";
import EditProfileScreen from "./EditProfileScreen";
import KYCVerificationHub from "./KYCVerificationHub";

interface AccountProps {
  pharmacy: Pharmacy | null;
  currentUser: User | null;
  onLogout: () => void;
  onAddToCart: (productId: string, qty: number) => Promise<boolean>;
  favouriteIds: string[];
  onRefreshProfile?: () => Promise<void>;
  onTriggerTab?: (tab: string) => void;
}

export default function Account({
  pharmacy,
  currentUser,
  onLogout,
  onAddToCart,
  favouriteIds,
  onRefreshProfile,
  onTriggerTab
}: AccountProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [totalPurchased, setTotalPurchased] = useState(0);

  // Overlay state triggers
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showKycHub, setShowKycHub] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch analytics (Admin and Pharmacy Owner only)
      const dataAnal = await paymentService.getAnalytics();
      setAnalytics(dataAnal);

      // Fetch favourites
      const dataFav = await productService.getFavourites();
      setFavProducts(dataFav);

      // Fetch completed orders to calculate eligibility
      const orders = await orderService.getOrders();
      const completedTotal = orders
        .filter(o => o.status === 'Delivered' || o.status === 'Completed' || o.paymentStatus === 'Paid')
        .reduce((sum, order) => sum + order.totalAmount, 0);
      setTotalPurchased(completedTotal);
    } catch (err) {
      console.warn("Analytics/Fav fetch warning:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [favouriteIds, currentUser]);

  const handleQuickReorder = async (productId: string) => {
    const success = await onAddToCart(productId, 1); // Standard quick reorder (1 box)
    if (success) {
      setSuccessId(productId);
      setTimeout(() => setSuccessId(null), 1500);
    }
  };

  const handleRefresh = async () => {
    if (onRefreshProfile) {
      await onRefreshProfile();
    }
    await fetchData();
  };

  // Check verification status
  const kycStatus = pharmacy?.verificationStatus || "Pending";
  const isVerified = kycStatus === "Approved";

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col select-none overflow-y-auto px-4 pt-10 pb-32 space-y-4">
      {/* Account Info Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 flex items-center gap-4 relative overflow-hidden shadow-sm">
        <div className="w-12 h-12 bg-brand-purple/10 border border-brand-purple/25 rounded-full flex items-center justify-center font-black text-brand-purple text-lg shadow-inner overflow-hidden flex-shrink-0">
          {pharmacy?.logoUrl ? (
            <img referrerPolicy="no-referrer" src={pharmacy.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            pharmacy?.pharmacyName?.charAt(0) || "P"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black text-brand-charcoal leading-tight truncate flex items-center gap-1.5">
            {pharmacy?.pharmacyName || "Pharmacy Profile"}
            {isVerified && (
              <span className="bg-emerald-500/10 text-emerald-600 rounded-full p-0.5" title="Verified DGDA Account">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-1">
            <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">Proprietor: {pharmacy?.ownerName || currentUser?.name || "Zahid Hasan"}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="bg-slate-100 border border-slate-200 text-slate-600 font-bold font-mono text-[9px] px-2 py-0.5 rounded-md">
              Lic: {pharmacy?.licenseNo || "Pending"}
            </span>
          </div>
        </div>
        {/* Header interactive controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowEditProfile(true)}
            className="p-2 text-slate-400 hover:text-brand-purple hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            title="Edit pharmacy details"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compliance Check / KYC Status prominent Card */}
      {(() => {
        let cardBg = "bg-rose-50 border-rose-100 text-rose-800";
        let icon = <AlertTriangle className="w-5 h-5 text-rose-500" />;
        let statusText = "Verification Required";
        let statusBadgeClass = "bg-rose-500/10 text-rose-600 border-rose-500/20";
        let subText = "Tap to submit your National ID card and Drug License documents to unlock premium wholesale.";

        if (kycStatus === "Approved") {
          cardBg = "bg-emerald-50 border-emerald-100 text-emerald-800";
          icon = <Award className="w-5 h-5 text-emerald-600" />;
          statusText = "Verified Pharmacy";
          statusBadgeClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
          subText = "DGDA B2B regulatory audit completed. Priority dispatching unlocked.";
        } else if (kycStatus === "Pending" || kycStatus === "Under Review") {
          cardBg = "bg-amber-50 border-amber-100 text-amber-850";
          icon = <Clock className="w-5 h-5 text-amber-500 animate-pulse" />;
          statusText = "Pending Compliance Review";
          statusBadgeClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
          subText = "Our operations desk is verifying your uploaded documents against DGDA systems. ETA < 24 Hours.";
        }

        return (
          <div className={`p-4 rounded-3xl border ${cardBg} shadow-sm space-y-3`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white rounded-xl shadow-xs">
                  {icon}
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Compliance Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <h4 className="font-extrabold text-xs">{statusText}</h4>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${statusBadgeClass}`}>
                      {kycStatus}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowKycHub(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                {kycStatus === "Approved" ? "Manage KYC" : "Verify Now"}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed pl-1">
              {subText}
            </p>
          </div>
        );
      })()}



      {/* Savings Metric Row */}
      {analytics && (
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3">
          <div>
            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Total Savings Report</span>
            <span className="text-lg font-black text-emerald-600 font-mono mt-1 block">
              ৳{analytics.totalSavings.toLocaleString()}
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-2xl border border-emerald-100 text-[10px] font-extrabold text-right">
            Avg 22% Bulk Savings Verified
          </div>
        </div>
      )}

      {/* B2B Operational Quick-Action Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onTriggerTab && onTriggerTab("history")} className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-brand-purple/10 rounded-xl text-brand-purple">
            <ShoppingCart className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Order History</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">View wholesale orders</span>
          </div>
        </button>
        
        <button className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Tax & VAT</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Procurement statements</span>
          </div>
        </button>
        
        <button className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Delivery Location</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Manage depot drop-offs</span>
          </div>
        </button>

        <button className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
            <Headset className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-charcoal block">Depot Support</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">24/7 Helpline & Dispatch</span>
          </div>
        </button>
      </div>

      {/* Saved Favourites List / Quick order catalog */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 space-y-3 shadow-sm">
        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-rose-500 fill-current" />
          Saved Procurement Favorites
        </h3>

        {favProducts.length === 0 ? (
          <div className="py-6 text-center text-slate-400 flex flex-col items-center">
            <p className="text-xs font-semibold">No Favorites Saved</p>
            <p className="text-[10px] text-slate-400 mt-1 mb-4">Tap hearts on catalog medicines for instant access here.</p>
            <button
              onClick={() => onTriggerTab && onTriggerTab("search")}
              className="bg-brand-purple text-white px-4 py-2 rounded-xl text-[10px] font-extrabold shadow-sm hover:bg-brand-purple/90 transition-all cursor-pointer"
            >
              Browse Wholesale Catalog
            </button>
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
                      Quick 1 Box
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
            <span className="text-slate-400">Support Hours:</span>
            <span>24 Hours / 7 Days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">DGDA License Verification:</span>
            <span className={isVerified ? "text-emerald-600" : "text-amber-500"}>
              {isVerified ? "Verified B2B Regulatory Approved" : "Audit Pending / KYC Required"}
            </span>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {showEditProfile && (
        <EditProfileScreen
          pharmacy={pharmacy}
          onClose={() => setShowEditProfile(false)}
          onSaveSuccess={handleRefresh}
        />
      )}

      {showKycHub && (
        <KYCVerificationHub
          pharmacy={pharmacy}
          onClose={() => setShowKycHub(false)}
          onSaveSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
