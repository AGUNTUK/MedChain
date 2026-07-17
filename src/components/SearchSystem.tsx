import React, { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  Heart,
  History,
  Sparkles,
  Star,
  ArrowRight,
  ArrowLeft,
  X,
  RefreshCw,
  TrendingUp,
  Award,
  Clock,
  ThumbsUp,
  AlertCircle
} from "lucide-react";
import { Product, Order } from "../types";
import { productService } from "../services";

interface SearchSystemProps {
  onAddToCart: (productId: string, qty: number) => Promise<boolean>;
  onToggleFavourite: (productId: string) => void;
  favouriteIds: string[];
  onOpenProductDetails: (product: Product) => void;
  orders?: Order[];
  cartQuantities?: Record<string, number>;
  onUpdateCartQty?: (productId: string, currentQty: number, change: number) => Promise<void>;
  onOpenCart?: () => void;
  cartCount?: number;
}

export default function SearchSystem({
  onAddToCart,
  onToggleFavourite,
  favouriteIds,
  onOpenProductDetails,
  orders = [],
  cartQuantities = {},
  onUpdateCartQty,
  onOpenCart,
  cartCount = 0
}: SearchSystemProps) {
  // Input states
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Loaded states
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [correctedQuery, setCorrectedQuery] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Order & History
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [isReordering, setIsReordering] = useState<Record<string, boolean>>({});

  // Interaction states
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cartAdding, setCartAdding] = useState<Record<string, boolean>>({});
  const [addedSuccess, setAddedSuccess] = useState<Record<string, boolean>>({});
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  const defaultCategories = ["All", "Tablet", "Capsule", "Syrup", "Suspension", "Drops", "Injection", "Infusion", "Inhaler", "Cream", "Ointment", "Gel", "Lotion", "Powder", "Sachet", "Oral Solution", "Oral Saline", "Eye Drop", "Eye Ointment", "Ear Drop", "Nasal Spray", "Suppository", "Pessary", "Patch", "Insulin", "Vaccine", "Medical Devices", "Surgical Items", "Dressing", "Bandage", "Gloves", "Masks", "Test Kits", "Nebulizer Solution", "Herbal", "Ayurvedic", "Homeopathic", "Vitamins", "Supplements", "Baby Care", "Personal Care", "Diabetic Care", "First Aid", "Others"];

  const categories = dbCategories.length > 0 ? ["All", ...dbCategories] : defaultCategories;

  // 1. Load Recent Searches & Frequent Products on Mount
  useEffect(() => {
    const saved = localStorage.getItem("medi_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    
    // Load categories
    productService.getCategories()
      .then(data => {
        if (data.length > 0) {
          setDbCategories(data);
        }
      })
      .catch(console.error);

    // Load popular/frequently ordered items
    productService.getProducts({ filter: "frequent" })
      .then(data => {
        setFrequentProducts(data.slice(0, 4));
      })
      .catch(err => console.error("Error loading frequent products:", err));
  }, []);

  // 2. Debounce Search Input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search string change
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  // 3. Fetch products dynamically when state parameters change
  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const response = await productService.getProductsPaginated({
          search: debouncedSearch || undefined,
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          filter: selectedFilter !== "all" ? (selectedFilter as any) : undefined,
          page,
          limit: 10
        });

        setProducts(response.products);
        setTotalProducts(response.total);
        setTotalPages(response.pages || 1);
        setSuggestions(response.suggestions || []);
        setCorrectedQuery(response.correctedQuery);

        // Save successful search query
        if (debouncedSearch.trim() && response.products.length > 0) {
          saveRecentSearch(debouncedSearch.trim());
        }
      } catch (err) {
        console.error("Error querying products catalog:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedSearch, selectedCategory, selectedFilter, page]);

  // Helper to save a query to recent searches list
  const saveRecentSearch = (query: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 5);
      localStorage.setItem("medi_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    localStorage.removeItem("medi_recent_searches");
    setRecentSearches([]);
  };

  const handleQtyChange = (productId: string, val: number) => {
    const minVal = 1;
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(minVal, val)
    }));
  };

  const handleAddToCartClick = async (productId: string, stock: number) => {
    const qty = quantities[productId] || 10; // Default bulk size (e.g. 10 boxes)
    if (qty > stock) return;

    setCartAdding(prev => ({ ...prev, [productId]: true }));
    const success = await onAddToCart(productId, qty);
    setCartAdding(prev => ({ ...prev, [productId]: false }));

    if (success) {
      setAddedSuccess(prev => ({ ...prev, [productId]: true }));
      setTimeout(() => {
        setAddedSuccess(prev => ({ ...prev, [productId]: false }));
      }, 1500);
    }
  };

  // One-tap reorder of a previous order's lines
  const handleOneTapReorder = async (order: Order) => {
    if (!order.items || order.items.length === 0) return;
    setIsReordering(prev => ({ ...prev, [order.id]: true }));

    let allSuccessful = true;
    for (const item of order.items) {
      const success = await onAddToCart(item.productId, item.quantity);
      if (!success) {
        allSuccessful = false;
      }
    }

    setIsReordering(prev => ({ ...prev, [order.id]: false }));

    if (allSuccessful) {
      alert(`Success: Reordered ${order.items.length} items from past invoice ${order.id} directly to your active cart.`);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-brand-bg select-none">
      {/* Search Header Area */}
      <div className="p-4 bg-white border-b border-slate-100 flex-shrink-0 shadow-xs flex items-center gap-2">
        <div className="flex-1 relative flex items-center bg-slate-100 rounded-2xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-brand-purple/20 focus-within:bg-white transition-all border border-transparent focus-within:border-brand-purple/30">
          <Search className="text-slate-400 w-4 h-4 mr-2" />
          <input
            type="text"
            placeholder="Search brand, generic formula, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs font-semibold text-slate-800 placeholder-slate-400"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
              className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {onOpenCart && (
          <button
            type="button"
            onClick={onOpenCart}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 relative cursor-pointer flex items-center justify-center flex-shrink-0 border border-slate-200/40 transition-colors"
          >
            <ShoppingCart className="w-4.5 h-4.5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-lime text-slate-900 font-extrabold text-[8px] px-1.5 py-0.5 rounded-full min-w-4 text-center">
                {cartCount}
              </span>
            )}
          </button>
        )}

        {/* Spelling Suggestions Bar */}
        {correctedQuery && (
          <div className="mt-2 text-[10.5px] text-slate-500 bg-brand-purple/5 border border-brand-purple/10 px-3 py-1.5 rounded-xl flex items-center justify-between">
            <span className="font-semibold">
              Showing corrected results for: <strong className="text-brand-purple font-black">{correctedQuery}</strong>
            </span>
            <button
              onClick={() => {
                setSearch(correctedQuery);
                setCorrectedQuery(undefined);
              }}
              className="text-[9.5px] font-black text-brand-purple underline cursor-pointer"
            >
              Use this query
            </button>
          </div>
        )}

        {suggestions.length > 0 && !correctedQuery && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Suggestions:</span>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setSearch(s)}
                className="bg-brand-purple/5 hover:bg-brand-purple/10 border border-brand-purple/10 text-brand-purple text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Quick Horizontal Scroll Category Filters */}
        <div className="flex gap-1.5 overflow-x-auto mt-3 pr-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-brand-purple text-white shadow-sm shadow-brand-purple/20"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort and Filters */}
        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-50">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {debouncedSearch ? `Catalog Matches (${totalProducts})` : "Instant B2B Procurement"}
          </span>
          <div className="flex gap-2">
            <select
              value={selectedFilter}
              onChange={(e) => {
                setSelectedFilter(e.target.value);
                setPage(1);
              }}
              className="text-[10px] font-bold text-slate-600 bg-slate-100 py-1 px-2.5 rounded-lg border-none outline-none cursor-pointer hover:bg-slate-150 transition-colors"
            >
              <option value="all">Default Sorting</option>
              <option value="deals">Highest Discount</option>
              <option value="frequent">Most Popular</option>
              <option value="low_stock">Low Stock Warnings</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="w-8 h-8 text-brand-purple animate-spin mb-3" />
            <span className="text-xs font-bold text-slate-500">Searching MediChain Ledger...</span>
          </div>
        ) : debouncedSearch ? (
          /* Search results matching state */
          <>
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-slate-100 p-6">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No matching medicine found</p>
                <p className="text-[10px] text-slate-400 max-w-[240px] mt-1 leading-relaxed">
                  Verify the spelling or search using a generic formula like "Paracetamol" or "Omeprazole".
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {products.map(p => {
                  const currentQty = quantities[p.id] || 10;
                  const isFav = favouriteIds.includes(p.id);
                  const isLowStock = p.availableStock <= 150;

                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl p-4 border border-slate-150/70 hover:border-slate-200 transition-all shadow-sm relative overflow-hidden flex flex-col justify-between"
                    >
                      {/* Discount ribbon */}
                      <div className="absolute top-0 left-0 bg-brand-purple text-white text-[9px] font-black px-2.5 py-1 rounded-br-xl uppercase tracking-wider shadow-sm">
                        {p.discountPercentage}% OFF
                      </div>

                      {/* Header Actions */}
                      <div className="flex justify-end mb-1">
                        <button
                          onClick={() => onToggleFavourite(p.id)}
                          className={`p-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer ${
                            isFav ? "text-rose-500" : "text-slate-300 hover:text-slate-400"
                          }`}
                        >
                          <Heart className="w-4.5 h-4.5 fill-current" />
                        </button>
                      </div>

                      {/* Product details */}
                      <div onClick={() => onOpenProductDetails(p)} className="cursor-pointer flex gap-3 mt-1">
                        {p.imageUrl && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0">
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 flex items-start justify-between">
                          <div>
                            <h3 className="text-xs font-black text-brand-charcoal hover:text-brand-purple transition-colors leading-tight">
                              {p.name} <span className="text-[10px] font-bold text-slate-400">{p.strength}</span>
                            </h3>
                            <p className="text-[9.5px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                              {p.genericName}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1 font-semibold">{p.company}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            {isLowStock ? (
                              <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-100 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider block mb-1">
                                Low Stock
                              </span>
                            ) : (
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider block mb-1">
                                Available
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 block font-mono">Pack: {p.packSize}</span>
                            <span className="text-[9px] text-slate-500 block font-mono font-bold mt-0.5">Stock: {p.availableStock}</span>
                          </div>
                        </div>

                        {/* Price box */}
                        <div className="flex items-center gap-2 mt-3 bg-slate-50 p-2.5 rounded-xl">
                          <div className="flex-1">
                            <span className="text-[8.5px] text-slate-400 block font-mono uppercase tracking-wider">MRP Box</span>
                            <span className="text-xs font-bold text-slate-400 line-through">৳{p.mrp}</span>
                          </div>
                          <div className="flex-1 border-l border-slate-200 pl-2">
                            <span className="text-[8.5px] text-slate-400 block font-mono uppercase tracking-wider">MediChain Net</span>
                            <span className="text-xs font-black text-brand-purple">৳{p.sellingPrice}</span>
                          </div>
                          <div className="bg-brand-purple/5 text-brand-purple px-2 py-1 rounded-lg text-right">
                            <span className="text-[7.5px] uppercase font-mono block font-black">Net Rebate</span>
                            <span className="text-[11px] font-black">৳{p.mrp - p.sellingPrice}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Preset Selectors & Controls */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-2">
                        {(() => {
                          const inCartQty = cartQuantities[p.id] || 0;
                          if (inCartQty > 0) {
                            return (
                              <div className="flex items-center justify-between gap-3 w-full animate-fade-in">
                                <span className="text-[10px] text-brand-purple font-black uppercase tracking-wider">
                                  In Basket:
                                </span>
                                <div className="flex-1 flex items-center justify-between bg-brand-purple/5 border border-brand-purple/20 rounded-xl px-2 py-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, -5)}
                                    className="text-brand-purple hover:bg-brand-purple hover:text-white p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-black text-brand-purple font-mono">
                                    {inCartQty} boxes
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, 5)}
                                    className="text-brand-purple hover:bg-brand-purple hover:text-white p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <>
                              {/* Quick preset boxes */}
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mr-1">Boxes:</span>
                                {[10, 50, 100, 200].map(qtyVal => (
                                  <button
                                    key={qtyVal}
                                    type="button"
                                    onClick={() => handleQtyChange(p.id, qtyVal)}
                                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                                      currentQty === qtyVal
                                        ? "bg-brand-purple text-white font-black"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {qtyVal} Box
                                  </button>
                                ))}
                              </div>

                              {/* Action controllers */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center bg-slate-100 rounded-xl px-2 py-1.5 border border-slate-200/40">
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(p.id, currentQty - 5)}
                                    className="text-slate-500 hover:text-brand-purple p-1 rounded hover:bg-white transition-all cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    value={currentQty}
                                    onChange={(e) => handleQtyChange(p.id, parseInt(e.target.value) || 1)}
                                    className="w-10 text-center text-xs font-extrabold text-slate-800 bg-transparent outline-none border-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(p.id, currentQty + 5)}
                                    className="text-slate-500 hover:text-brand-purple p-1 rounded hover:bg-white transition-all cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleAddToCartClick(p.id, p.availableStock)}
                                  disabled={cartAdding[p.id] || (isLowStock && p.availableStock <= 0)}
                                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    addedSuccess[p.id]
                                      ? "bg-brand-purple text-white"
                                      : "bg-brand-lime text-slate-900 hover:shadow-md hover:shadow-brand-lime/20"
                                  }`}
                                >
                                  {addedSuccess[p.id] ? (
                                    <>
                                      <Check className="w-4 h-4" />
                                      Added!
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingCart className="w-3.5 h-3.5" />
                                      Cart (৳{(currentQty * p.sellingPrice).toLocaleString()})
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl p-3 shadow-3xs">
                    <button
                      onClick={() => setPage(prev => Math.max(1, prev - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 disabled:opacity-40 text-[10.5px] font-bold cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-[10.5px] font-extrabold text-slate-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 disabled:opacity-40 text-[10.5px] font-bold cursor-pointer hover:bg-slate-50 transition-colors flex items-center gap-1"
                    >
                      Next <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Empty Search Query: Show Quick Order Cockpit Hub */
          <div className="space-y-4">
            {/* Recent Searches Row */}
            {recentSearches.length > 0 && (
              <div className="bg-white rounded-2xl p-3.5 border border-slate-100/80 shadow-3xs">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Recent Searches
                  </span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-[9px] text-slate-400 hover:text-rose-500 font-bold uppercase transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {recentSearches.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setSearch(q)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Search className="w-2.5 h-2.5 text-slate-400" /> {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Procurement (Frequently Ordered) */}
            {frequentProducts.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                  <TrendingUp className="w-4 h-4 text-brand-purple" /> Frequently Procured Medicines
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {frequentProducts.map(p => {
                    const currentQty = quantities[p.id] || 10;
                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl p-3 border border-slate-100 shadow-3xs flex flex-col justify-between hover:border-slate-200 transition-all"
                      >
                        <div onClick={() => onOpenProductDetails(p)} className="cursor-pointer">
                          {p.imageUrl && (
                            <div className="w-full h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 mb-2">
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <span className="text-[7.5px] bg-brand-purple/10 text-brand-purple px-1.5 py-0.5 rounded uppercase font-black tracking-wider inline-block mb-1">
                            {p.category}
                          </span>
                          <h4 className="text-[11px] font-black text-brand-charcoal truncate">{p.name}</h4>
                          <p className="text-[8px] font-bold text-slate-400 truncate uppercase">{p.genericName}</p>
                          <p className="text-[8.5px] text-brand-purple font-black mt-1">৳{p.sellingPrice} <span className="text-[8px] font-bold text-slate-400 line-through">৳{p.mrp}</span></p>
                        </div>

                        {(() => {
                          const inCartQty = cartQuantities[p.id] || 0;
                          if (inCartQty > 0) {
                            return (
                              <div className="mt-2.5 pt-2 border-t border-slate-50 flex flex-col gap-1 w-full animate-fade-in">
                                <span className="text-[8px] font-black text-brand-purple text-center">In Basket: {inCartQty} box</span>
                                <div className="flex items-center justify-between bg-brand-purple/5 border border-brand-purple/20 rounded-lg p-1">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, -1)}
                                    className="text-brand-purple hover:bg-brand-purple hover:text-white p-0.5 rounded transition-all cursor-pointer flex items-center justify-center"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-[10px] font-black text-brand-purple font-mono">{inCartQty}</span>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, 1)}
                                    className="text-brand-purple hover:bg-brand-purple hover:text-white p-0.5 rounded transition-all cursor-pointer flex items-center justify-center"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center gap-1.5">
                              <input
                                type="number"
                                value={currentQty}
                                onChange={(e) => handleQtyChange(p.id, parseInt(e.target.value) || 1)}
                                className="w-8 text-center text-[10px] font-bold text-slate-800 bg-slate-100 rounded-md py-1 border-none outline-none font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddToCartClick(p.id, p.availableStock)}
                                disabled={cartAdding[p.id]}
                                className="flex-1 bg-brand-lime hover:bg-brand-lime/90 text-slate-900 py-1 rounded-md text-[9.5px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                {addedSuccess[p.id] ? <Check className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                                Buy
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Invoices One-Tap Reorders */}
            {orders.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                  <History className="w-4 h-4 text-emerald-500" /> One-Tap Past Invoice Reorders
                </span>
                <div className="space-y-2.5">
                  {orders.slice(0, 2).map(o => (
                    <div
                      key={o.id}
                      className="bg-white rounded-2xl p-3 border border-slate-100 shadow-3xs flex flex-col gap-2 hover:border-slate-200 transition-all"
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <div>
                          <span className="font-extrabold text-slate-700">Invoice {o.id}</span>
                          <span className="text-slate-400 ml-1.5 font-mono">{o.items.length} medicines</span>
                        </div>
                        <span className="font-mono text-slate-500 font-extrabold">৳{o.totalAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {o.items.slice(0, 3).map((item, idx) => (
                            <span
                              key={idx}
                              className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-semibold"
                            >
                              {item.name} ({item.quantity})
                            </span>
                          ))}
                          {o.items.length > 3 && <span className="text-[8px] text-slate-400 font-bold">+{o.items.length - 3} more</span>}
                        </div>

                        <button
                          onClick={() => handleOneTapReorder(o)}
                          disabled={isReordering[o.id]}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 py-1 px-2.5 rounded-lg text-[9px] font-black flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {isReordering[o.id] ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          1-Tap Reorder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
