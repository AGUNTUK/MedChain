import React, { useState, useEffect, useRef, useCallback } from "react";
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
  AlertCircle,
  Store,
  Mic,
  Camera
} from "lucide-react";
import { Product, Order } from "../types";
import { productService } from "../services";
import { formatRefId, formatProductPriceLabel } from "../lib/utils";
import { useFlyToCart } from "../context/FlyToCartContext";

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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);

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

  const categories = Array.from(new Set([
    "All",
    ...defaultCategories.slice(1),
    ...dbCategories
  ]));

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

  // Infinite scrolling observer ref
  const observer = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && page < totalPages) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, page, totalPages]);

  // 3. Fetch products dynamically when state parameters change
  useEffect(() => {
    const fetchResults = async () => {
      // Only set loading if it's the first page to not flash empty screen on scroll
      if (page === 1) setIsLoading(true);
      try {
        const response = await productService.getProductsPaginated({
          search: debouncedSearch || undefined,
          category: selectedCategory !== "All" ? selectedCategory : undefined,
          filter: selectedFilter !== "all" ? (selectedFilter as any) : undefined,
          page,
          limit: 50
        });

        if (page === 1) {
          setProducts(response.products);
        } else {
          setProducts(prev => {
            // Deduplicate products based on ID to avoid duplicate rendering issues on double fetch
            const newProducts = response.products.filter(p => !prev.some(existing => existing.id === p.id));
            return [...prev, ...newProducts];
          });
        }
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

  const handleVoiceSearch = async () => {
    try {
      // Prompt for microphone permissions if not already granted
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required for voice search. Please allow microphone access in your browser settings.");
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearch(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert("Microphone access was blocked. Please enable it in your browser settings to use voice search.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleQtyChange = (productId: string, val: number) => {
    const minVal = 1;
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(minVal, val)
    }));
  };

  const { triggerFlyToCart } = useFlyToCart();

  const handleAddToCartClick = async (
    productId: string,
    stock: number,
    e?: React.MouseEvent<HTMLElement>,
    imageSrc?: string
  ) => {
    if (e) {
      e.stopPropagation();
    }
    if (e && e.currentTarget) {
      triggerFlyToCart(e.currentTarget, imageSrc);
    }

    const qty = quantities[productId] || 1; // Default bulk size (e.g. 1 box)

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
      <div className="p-4 bg-white border-b border-slate-100 flex-shrink-0 shadow-xs flex flex-col gap-3">
        {/* Top Header Row */}
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-black text-brand-charcoal tracking-tight">Products</h1>
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
        </div>

        {/* Quick Horizontal Scroll Category Filters */}
        <div className="flex gap-1.5 overflow-x-auto pr-2 scrollbar-none">
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
        <div className="flex justify-between items-center pt-2.5 border-t border-slate-50">
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
      <div className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col">
        {/* Dedicated Full-Width Search Bar Section */}
        <div className="px-4 pt-4 pb-2 sticky top-0 z-10 bg-slate-50">
          <div className="relative">
            <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-3 min-h-[52px] focus-within:ring-2 focus-within:ring-brand-purple/20 focus-within:border-brand-purple/40 transition-all">
              <Search className="text-slate-400 w-5 h-5 mr-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by medicine name, generic, or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-800 placeholder-slate-400"
              />
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setDebouncedSearch("");
                    }}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mr-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleVoiceSearch}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    isListening 
                      ? 'bg-rose-100 text-rose-500 animate-pulse' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
                  }`}
                  title="Voice Search"
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>
                <button className="p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
                  <Camera className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
            
            {/* Recent Search Dropdown */}
            {isSearchFocused && !search && recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden z-20 animate-fade-in">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recent Searches</span>
                  <button onMouseDown={(e) => { e.preventDefault(); clearRecentSearches(); }} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase cursor-pointer">Clear All</button>
                </div>
                <div>
                  {recentSearches.map((q, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearch(q);
                      }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none cursor-pointer"
                    >
                      <History className="w-4 h-4 text-slate-300" />
                      <span className="text-[13px] font-semibold text-slate-700">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

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
        </div>

        <div className="p-4 pb-24 space-y-4">
        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="w-8 h-8 text-brand-purple animate-spin mb-3" />
            <span className="text-xs font-bold text-slate-500">Searching MediChain Ledger...</span>
          </div>
        ) : true ? (
          /* Search results matching state */
          <>
            {/* Quick Order Cockpit Hub - Shown only when there is no search query */}
            {!debouncedSearch && (
              <div className="space-y-4 mb-5 animate-fade-in">
                {/* Quick Procurement (Frequently Ordered) */}
                {frequentProducts.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                      <TrendingUp className="w-4 h-4 text-brand-purple" /> Frequently Procured Medicines
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {frequentProducts.map(p => {
                        const currentQty = quantities[p.id] || 1;
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
                              const inCartQty = cartQuantities ? cartQuantities[p.id] || 0 : 0;
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
                                    onClick={(e) => handleAddToCartClick(p.id, p.availableStock, e, p.imageUrl || p.image_url)}
                                    disabled={cartAdding[p.id]}
                                    className={`flex-1 py-1 rounded-md text-[9.5px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                                      addedSuccess[p.id]
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "bg-brand-lime hover:bg-brand-lime/90 text-slate-900"
                                    }`}
                                  >
                                    {addedSuccess[p.id] ? <Check className="w-3 h-3 text-white" /> : <ShoppingCart className="w-3 h-3" />}
                                    {addedSuccess[p.id] ? "✓ Added" : "Buy"}
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
                              <span className="font-extrabold text-slate-700">Invoice {formatRefId(o.id, "INV")}</span>
                              <span className="text-slate-400 ml-1.5 font-mono">{o.items.length} lines</span>
                            </div>
                            <span className="font-mono text-slate-600 font-extrabold">৳{o.totalAmount.toLocaleString()}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-50 pt-2 gap-2">
                            <div className="text-[9px] text-slate-500 font-semibold leading-relaxed max-w-[210px] truncate">
                              {o.items.slice(0, 2).map(item => `${item.name} (${item.quantity} Box)`).join(", ")}
                              {o.items.length > 2 ? ` + ${o.items.length - 2} more` : ""}
                            </div>

                            <button
                              onClick={() => handleOneTapReorder(o)}
                              disabled={isReordering[o.id]}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 py-1 px-2.5 rounded-lg text-[9px] font-black flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0"
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

            {/* Section label for wholesale medicine catalog */}
            <div className="flex items-center gap-1.5 mb-3 px-1 pt-2 border-t border-slate-100/50">
              <Store className="w-4 h-4 text-brand-purple" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {debouncedSearch ? `Catalog Matches (${totalProducts} items)` : `${selectedCategory === "All" ? "Wholesale Medicine Catalog" : `${selectedCategory} Catalog`} (${totalProducts} items)`}
              </span>
            </div>

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
                {products.map((p, index) => {
                  const currentQty = quantities[p.id] || 1;
                  const isFav = favouriteIds.includes(p.id);
                  const isLowStock = p.availableStock <= 150;

                  return (
                    <div
                      key={p.id}
                      ref={products.length === index + 1 ? lastProductElementRef : null}
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
                            {p.availableStock <= 0 ? (
                              <span className="text-[8px] bg-slate-100 text-slate-500 border border-slate-200 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider block mb-1">
                                Restocking Soon
                              </span>
                            ) : p.availableStock <= 15 ? (
                              <span className="text-[8.5px] bg-rose-50 text-rose-600 border border-rose-100 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider block mb-1 animate-pulse">
                                Only {p.availableStock} Left
                              </span>
                            ) : (
                              <span className="text-[8px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider block mb-1">
                                In Stock
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 block font-mono">Pack: {p.packSize}</span>
                            <span className="text-[9px] text-slate-500 block font-mono font-bold mt-0.5">Stock: {p.availableStock} Box</span>
                          </div>
                        </div>

                        {/* Price box with sharp B2B hierarchy */}
                        <div className="grid grid-cols-3 items-center gap-2 mt-3.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <div>
                            <span className="text-[8px] text-slate-400 block font-bold uppercase tracking-wider">Retail MRP</span>
                            <span className="text-xs font-bold text-slate-400 line-through">৳{p.mrp}</span>
                          </div>
                          <div className="border-l border-slate-200 pl-2.5">
                            <span className="text-[8px] text-brand-purple block font-black uppercase tracking-wider">B2B Wholesale</span>
                            <span className="text-xs font-black text-brand-purple">৳{p.sellingPrice}</span>
                            <span className="text-[7.5px] text-slate-400 font-bold block leading-tight">{formatProductPriceLabel(p.sellingPrice, p.packSize)}</span>
                          </div>
                          <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-xl text-center flex flex-col justify-center items-center">
                            <span className="text-[7px] uppercase font-bold block">Net Savings</span>
                            <span className="text-[11px] font-black tracking-tight text-emerald-700">Save ৳{p.mrp - p.sellingPrice}</span>
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
                                    onClick={() => onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, -1)}
                                    className="text-brand-purple hover:bg-brand-purple hover:text-white p-1 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-black text-brand-purple font-mono">
                                    {inCartQty} boxes
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateCartQty && onUpdateCartQty(p.id, inCartQty, 1)}
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
                                {[1, 5, 10, 50].map(qtyVal => (
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
                                    onClick={() => handleQtyChange(p.id, currentQty - 1)}
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
                                    onClick={() => handleQtyChange(p.id, currentQty + 1)}
                                    className="text-slate-500 hover:text-brand-purple p-1 rounded hover:bg-white transition-all cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => handleAddToCartClick(p.id, p.availableStock, e, p.imageUrl || p.image_url)}
                                  disabled={cartAdding[p.id]}
                                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    addedSuccess[p.id]
                                      ? "bg-emerald-600 text-white shadow-md scale-102"
                                      : "bg-brand-lime text-slate-900 hover:shadow-md hover:shadow-brand-lime/20"
                                  }`}
                                >
                                  {addedSuccess[p.id] ? (
                                    <>
                                      <Check className="w-4 h-4 text-white" />
                                      ✓ Added to Cart!
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingCart className="w-3.5 h-3.5" />
                                      Buy (৳{(currentQty * p.sellingPrice).toLocaleString()})
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

                {/* Infinite Scroll Loading Indicator */}
                {isLoading && page > 1 && (
                  <div className="flex justify-center items-center py-4">
                    <RefreshCw className="w-5 h-5 text-brand-purple animate-spin" />
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
      </div>
    </div>
  );
}
