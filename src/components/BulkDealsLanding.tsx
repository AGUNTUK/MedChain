import React, { useState, useEffect } from "react";
import { ChevronLeft, Package, Clock, Filter, ShoppingCart, Minus, Plus } from "lucide-react";
import { bulkDealsService } from "../services";
import { BulkCampaign, BulkCampaignProduct } from "../types";
import { formatProductPriceLabel } from "../lib/utils";

interface BulkDealsLandingProps {
  onBack: () => void;
  onAddToCart: (productId: string, qty: number) => Promise<boolean>;
  cartQuantities: Record<string, number>;
  onUpdateCartQty?: (productId: string, currentQty: number, change: number) => Promise<void>;
  campaignId?: string;
}

export default function BulkDealsLanding({
  onBack,
  onAddToCart,
  cartQuantities,
  onUpdateCartQty,
  campaignId
}: BulkDealsLandingProps) {
  const [campaign, setCampaign] = useState<BulkCampaign | null>(null);
  const [products, setProducts] = useState<BulkCampaignProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("All");
  const [cartAdding, setCartAdding] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    setLoading(true);
    let activeCampaign;
    if (campaignId) {
      activeCampaign = await bulkDealsService.getCampaignById(campaignId);
    } else {
      activeCampaign = await bulkDealsService.getLiveCampaign();
    }

    if (activeCampaign) {
      setCampaign(activeCampaign);
      const campProducts = await bulkDealsService.getCampaignProducts(activeCampaign.id);
      setProducts(campProducts);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500 font-semibold text-xs">Loading Bulk Deals...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center space-y-4">
        <Package className="w-16 h-16 text-slate-300" />
        <h2 className="text-xl font-black text-slate-800">No Active Deals</h2>
        <p className="text-sm text-slate-500">There are no bulk deals currently available. Please check back later.</p>
        <button
          onClick={onBack}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isExpired = campaign.status === "Expired" || (campaign.end_at && new Date(campaign.end_at) < new Date());

  // Extract unique manufacturers
  const manufacturers = ["All", ...Array.from(new Set(products.map(p => p.product?.company).filter(Boolean)))];
  
  const filteredProducts = selectedManufacturer === "All" 
    ? products 
    : products.filter(p => p.product?.company === selectedManufacturer);

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0 z-20 shadow-sm relative">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black text-slate-800 tracking-tight">Bulk Consignments</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-[calc(max(12px,env(safe-area-inset-bottom))+80px)]">
        {/* Dynamic Hero Banner */}
        <div className={`${campaign.banner_color || 'bg-brand-purple'} p-6 sm:p-8 text-white relative overflow-hidden`}>
          <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <span className="bg-brand-lime text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider mb-3 inline-block">
              {campaign.title}
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1 leading-tight">
              {campaign.subtext}
            </h2>
            
            {campaign.end_at && !isExpired && (
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold bg-white/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>Ends {new Date(campaign.end_at).toLocaleDateString()}</span>
              </div>
            )}
            
            {isExpired && (
              <div className="mt-4 inline-block bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-lg">
                This offer has ended
              </div>
            )}
          </div>
        </div>

        {isExpired ? (
          <div className="p-8 text-center bg-white m-4 rounded-2xl shadow-sm border border-slate-100">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Campaign Expired</h3>
            <p className="text-sm text-slate-500 mt-2">The special bulk pricing for this campaign is no longer available.</p>
            <button
              onClick={onBack}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700"
            >
              Browse Regular Catalog
            </button>
          </div>
        ) : (
          <>
            {/* Manufacturer Filters */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 overflow-x-auto no-scrollbar shadow-sm">
              <div className="flex gap-2">
                <div className="flex items-center text-slate-400 mr-1 shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                {manufacturers.map(mfr => (
                  <button
                    key={mfr}
                    onClick={() => setSelectedManufacturer(mfr as string)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all ${
                      selectedManufacturer === mfr
                        ? "bg-brand-charcoal text-brand-lime shadow-md"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {mfr}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(cp => {
                const product = cp.product;
                if (!product) return null;
                
                const currentQty = cartQuantities[product.id] || 0;
                
                // Sort tiers by minQty descending so we can easily find the active one
                const sortedTiers = [...cp.tiers].sort((a, b) => b.minQty - a.minQty);
                
                // Find active tier based on current cart quantity
                const activeTier = sortedTiers.find(t => currentQty >= t.minQty);
                const nextTier = sortedTiers.find(t => currentQty < t.minQty); // Note: assumes tiers are sorted descending, so nextTier might need to be found differently, actually we should reverse sort for finding the next one. Let's do it simply:
                const ascendingTiers = [...cp.tiers].sort((a, b) => a.minQty - b.minQty);
                const nextAscendingTier = ascendingTiers.find(t => currentQty < t.minQty);

                const activeDiscount = activeTier ? activeTier.discountPercent : 0;
                const currentPrice = product.sellingPrice * (1 - (activeDiscount / 100));

                const handleAddToCartClick = async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (cartAdding[product.id]) return;

                  setCartAdding(prev => ({ ...prev, [product.id]: true }));
                  // Default to first tier min quantity if adding new
                  const addQty = ascendingTiers.length > 0 ? ascendingTiers[0].minQty : 5;
                  await onAddToCart(product.id, addQty);
                  setCartAdding(prev => ({ ...prev, [product.id]: false }));
                };

                return (
                  <div key={cp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    <div className="p-4 flex gap-4">
                      {product.imageUrl ? (
                        <div className="w-20 h-20 shrink-0 bg-slate-50 rounded-xl border border-slate-100 p-1 flex items-center justify-center">
                          <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 shrink-0 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center">
                          <Package className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] bg-brand-purple/10 text-brand-purple font-black uppercase px-1.5 py-0.5 rounded">
                            {product.company}
                          </span>
                          <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Clock className="w-2 h-2" /> 24h Delivery
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mt-1 truncate">{product.name}</h3>
                        <p className="text-[10px] text-slate-500 truncate">{product.genericName}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Base Wholesale: ৳{product.sellingPrice} / box</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 border-t border-slate-100 space-y-2 flex-1">
                      {/* Pricing Tiers Display */}
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Bulk Pricing Tiers</p>
                        {ascendingTiers.map((tier, idx) => {
                          const isActive = activeTier?.minQty === tier.minQty;
                          const tierPrice = product.sellingPrice * (1 - (tier.discountPercent / 100));
                          
                          return (
                            <div key={idx} className={`flex justify-between items-center text-xs p-1.5 rounded-lg border ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-inner' : 'bg-white border-slate-200'}`}>
                              <span className={`font-semibold ${isActive ? 'text-indigo-700' : 'text-slate-600'}`}>
                                {tier.minQty}+ boxes
                              </span>
                              <div className="text-right">
                                <span className={`font-black ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>
                                  ৳{tierPrice.toFixed(2)}
                                </span>
                                <span className="ml-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                                  {tier.discountPercent}% OFF
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="p-4 bg-white border-t border-slate-200">
                      {currentQty > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl p-1.5">
                            <button
                              onClick={() => onUpdateCartQty && onUpdateCartQty(product.id, currentQty, -1)}
                              className="w-8 h-8 flex items-center justify-center bg-white text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-600 hover:text-white transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <div className="text-center flex-1">
                              <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider">In Cart</span>
                              <span className="block font-black text-indigo-700">{currentQty} Boxes</span>
                            </div>
                            <button
                              onClick={() => onUpdateCartQty && onUpdateCartQty(product.id, currentQty, 1)}
                              className="w-8 h-8 flex items-center justify-center bg-white text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-600 hover:text-white transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {nextAscendingTier && (
                            <p className="text-[10px] text-center text-slate-500">
                              Add <span className="font-bold text-emerald-600">{nextAscendingTier.minQty - currentQty} more</span> to unlock {nextAscendingTier.discountPercent}% off!
                            </p>
                          )}
                          {!nextAscendingTier && (
                            <p className="text-[10px] text-center font-bold text-emerald-600">
                              Maximum tier discount unlocked!
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={handleAddToCartClick}
                          disabled={cartAdding[product.id]}
                          className="w-full py-2.5 bg-brand-charcoal text-brand-lime font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {cartAdding[product.id] ? (
                            <span className="animate-pulse">Adding...</span>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4" />
                              Start Bulk Order
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
