import React, { useState, useEffect } from "react";
import Splash from "./components/Splash";
import Login from "./components/Login";
import ProfileSetup from "./components/ProfileSetup";
import Home from "./components/Home";
import SearchSystem from "./components/SearchSystem";
import ProductDetails from "./components/ProductDetails";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import OrderSuccess from "./components/OrderSuccess";
import OrderTracking from "./components/OrderTracking";
import OrderHistory from "./components/OrderHistory";
import PrescriptionUpload from "./components/PrescriptionUpload";
import Account from "./components/Account";
import NotificationsPanel from "./components/NotificationsPanel";
import AdminPanel from "./components/AdminPanel";
import DepotDashboard from "./components/DepotDashboard";
import DeliveryDashboard from "./components/DeliveryDashboard";
import FloatingCartBar from "./components/FloatingCartBar";
import FlyToCartOverlay from "./components/FlyToCartOverlay";
import { FlyToCartProvider } from "./context/FlyToCartContext";
import { Product, Pharmacy, Order, Notification, User } from "./types";
import { Home as HomeIcon, Search as SearchIcon, Package as PackageIcon, FileText as FileIcon, ClipboardList as ListIcon, User as UserIcon, Shield, Smartphone } from "lucide-react";
import { authService, productService, orderService, profileService, notificationService } from "./services";

// Global fetch interceptor to inject session fallback headers for iframe environment
try {
  const originalFetch = window.fetch;
  Object.defineProperty(window, "fetch", {
    value: async function (input: RequestInfo | URL, init?: RequestInit) {
      try {
        const userStr = localStorage.getItem("medichain_user");
        const pharmacyStr = localStorage.getItem("medichain_pharmacy");

        if (userStr) {
          const user = JSON.parse(userStr);
          const pharmacy = pharmacyStr ? JSON.parse(pharmacyStr) : null;

          init = init || {};
          const headers = init.headers ? new Headers(init.headers) : new Headers();
          if (user.id) headers.set("x-session-user-id", user.id);
          if (user.email) headers.set("x-session-user-email", user.email);
          if (user.role) headers.set("x-session-user-role", user.role);
          if (user.name) headers.set("x-session-user-name", user.name);
          const pharmId = pharmacy?.id || user.pharmacy_id;
          if (pharmId) {
            headers.set("x-session-pharmacy-id", pharmId);
          }
          init.headers = headers;
        }
      } catch (err) {
        console.error("Fetch interceptor session inject error:", err);
      }
      
      const response = await originalFetch(input, init);
      
      if (response.status === 401 && typeof input === "string" && !input.includes("/api/auth")) {
        const hadUser = localStorage.getItem("medichain_user");
        if (hadUser) {
          localStorage.removeItem("medichain_user");
          localStorage.removeItem("medichain_pharmacy");
          window.dispatchEvent(new Event("auth-expired"));
        }
      }
      
      return response;
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (err) {
  console.error("Failed to intercept fetch via Object.defineProperty:", err);
}

export default function App() {
  // Mobile app navigation state
  const [appStep, setAppStep] = useState<"splash" | "login" | "setup" | "main" | "cart" | "checkout" | "success" | "tracking">("splash");
  const [activeTab, setActiveTab] = useState<"home" | "search" | "upload" | "history" | "account">("home");

  // Core Data State
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(() => {
    try {
      const stored = localStorage.getItem("medichain_pharmacy");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("medichain_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem("medichain_phone") || "";
    } catch {
      return "";
    }
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);

  // UI state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>("");
  const [cartCount, setCartCount] = useState(0);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [cartData, setCartData] = useState<{
    items: Array<{ product: Product; quantity: number }>;
    totalMrp: number;
    totalAmount: number;
    totalSavings: number;
  } | null>(null);

  // Sync products and credentials
  const refreshProducts = async () => {
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshPharmacyProfile = async () => {
    try {
      const res = await fetch("/api/pharmacy/profile");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setPharmacy(data.pharmacy);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshOrders = async () => {
    try {
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshCartCounter = async () => {
    try {
      const data = await orderService.getCart();
      setCartData(data);
      const totalItems = data.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;
      setCartCount(totalItems);

      const qtyMap: Record<string, number> = {};
      data.items?.forEach((item: any) => {
        qtyMap[item.productId] = item.quantity;
      });
      setCartQuantities(qtyMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCartQty = async (productId: string, currentQty: number, change: number) => {
    try {
      const newQty = currentQty + change;
      if (newQty <= 0) {
        await orderService.removeFromCart(productId);
      } else {
        await orderService.updateCartItem(productId, newQty);
      }
      await refreshCartCounter();
    } catch (err) {
      console.error(err);
    }
  };

  const refreshFavourites = async () => {
    try {
      const data = await productService.getFavouritesIds();
      setFavouriteIds(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavourite = async (productId: string) => {
    try {
      await productService.toggleFavourite(productId);
      refreshFavourites();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Initial fetch of static assets and verify existing session
    refreshProducts();
    if (currentUser) {
      refreshPharmacyProfile();
    }
  }, []);

  useEffect(() => {
    if (currentUser && (pharmacy || ["Admin", "Depot Staff", "Delivery Staff"].includes(currentUser.role))) {
      const isSpecialRole = ["Admin", "Depot Staff", "Delivery Staff"].includes(currentUser.role);
      if (!isSpecialRole) {
        refreshOrders();
        refreshNotifications();
        refreshCartCounter();
        refreshFavourites();
      }
    } else if (!currentUser) {
      setOrders([]);
      setNotifications([]);
      setCartCount(0);
      setFavouriteIds([]);
    }
  }, [currentUser, pharmacy]);

  // Synchronize auth state changes to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("medichain_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("medichain_user");
    }
  }, [currentUser]);

  useEffect(() => {
    if (pharmacy) {
      localStorage.setItem("medichain_pharmacy", JSON.stringify(pharmacy));
    } else {
      localStorage.removeItem("medichain_pharmacy");
    }
  }, [pharmacy]);

  useEffect(() => {
    if (phone) {
      localStorage.setItem("medichain_phone", phone);
    } else {
      localStorage.removeItem("medichain_phone");
    }
  }, [phone]);

  // Compute unread count
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Find an active order that needs delivery progress (oldest non-delivered order)
  const activeOrderToDeliver = orders.find(o => o.status !== "Delivered");

  // Authentication callbacks
  const handleLoginSuccess = (user: any, needsSetup: boolean) => {
    setPhone(user.phone || user.email);
    setCurrentUser(user);
    localStorage.setItem("medichain_user", JSON.stringify(user));
    
    const isSpecialRole = ["Admin", "Depot Staff", "Delivery Staff"].includes(user.role);
    if (needsSetup && !isSpecialRole) {
      setAppStep("setup");
    } else {
      refreshPharmacyProfile();
      setAppStep("main");
    }
  };

  const handleSetupComplete = () => {
    refreshPharmacyProfile();
    setAppStep("main");
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setPharmacy(null);
      setPhone("");
      setCurrentUser(null);
      localStorage.removeItem("medichain_user");
      localStorage.removeItem("medichain_pharmacy");
      localStorage.removeItem("medichain_phone");
      setAppStep("login");
    } catch (err) {
      console.error(err);
    }
  };

  // Add to cart proxy callback
  const handleAddToCart = async (productId: string, qty: number): Promise<boolean> => {
    try {
      await orderService.addToCart(productId, qty);
      await refreshCartCounter();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Custom Operations cockpit triggers
  const handleTriggerPriceDrop = async () => {
    try {
      await productService.triggerAdminPriceDrop();
      refreshNotifications();
      refreshProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerNewOffer = async () => {
    try {
      await productService.triggerAdminNewOffer();
      refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateDeliveryStatus = async () => {
    if (!activeOrderToDeliver) return;
    const statuses: Array<"Confirmed" | "Processing" | "Packed" | "Out for Delivery" | "Delivered"> = [
      "Confirmed",
      "Processing",
      "Packed",
      "Out for Delivery",
      "Delivered"
    ];
    const currentIdx = statuses.indexOf(activeOrderToDeliver.status);
    if (currentIdx < statuses.length - 1) {
      const nextStatus = statuses[currentIdx + 1];
      try {
        await orderService.updateOrderStatus(activeOrderToDeliver.id, nextStatus);
        refreshOrders();
        refreshProducts();
        refreshPharmacyProfile();
        refreshNotifications();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Render proper sub-screens in the Mobile frame
  const renderMobileContent = () => {
    switch (appStep) {
      case "splash":
        return (
          <Splash
            onComplete={() => {
              if (currentUser) {
                const isSpecialRole = ["Admin", "Depot Staff", "Delivery Staff"].includes(currentUser.role);
                setAppStep(pharmacy || isSpecialRole ? "main" : "setup");
              } else {
                setAppStep("login");
              }
            }}
          />
        );
      case "login":
        return <Login onLoginSuccess={handleLoginSuccess} />;
      case "setup":
        return <ProfileSetup phone={phone} onSetupComplete={handleSetupComplete} onBack={() => setAppStep("login")} />;
      case "cart":
        return (
          <Cart
            onBack={() => setAppStep("main")}
            onCheckoutTrigger={() => setAppStep("checkout")}
            onRefreshCartCounter={refreshCartCounter}
          />
        );
      case "checkout":
        return (
          <Checkout
            onBackToCart={() => setAppStep("cart")}
            onOrderPlaced={(orderId) => {
              refreshOrders();
              refreshPharmacyProfile();
              refreshProducts();
              refreshCartCounter();
              setTrackingOrderId(orderId);
              setAppStep("success");
            }}
            pharmacy={pharmacy}
          />
        );
      case "success":
        return (
          <OrderSuccess
            orderId={trackingOrderId}
            onTrackOrder={(orderId) => {
              setTrackingOrderId(orderId);
              setAppStep("tracking");
            }}
            onContinueShopping={() => {
              setAppStep("main");
              setActiveTab("home");
            }}
          />
        );
      case "tracking":
        return (
          <OrderTracking
            orderId={trackingOrderId}
            onBack={() => {
              setAppStep("main");
              setActiveTab("history");
            }}
            onRefreshStats={() => {
              refreshProducts();
              refreshPharmacyProfile();
              refreshOrders();
            }}
          />
        );
      case "main":
      default:
        // Render depending on active bottom tab
        switch (activeTab) {
          case "search":
            return (
              <SearchSystem
                onAddToCart={handleAddToCart}
                onToggleFavourite={handleToggleFavourite}
                favouriteIds={favouriteIds}
                onOpenProductDetails={(p) => setSelectedProduct(p)}
                orders={orders}
                cartQuantities={cartQuantities}
                onUpdateCartQty={handleUpdateCartQty}
                onOpenCart={() => setAppStep("cart")}
                cartCount={cartCount}
              />
            );
          case "upload":
            return (
              <PrescriptionUpload
                onAddToCart={handleAddToCart}
                onTriggerTab={(tab) => {
                  setActiveTab(tab as any);
                }}
              />
            );
          case "history":
            return (
              <OrderHistory
                onTrackOrder={(orderId) => {
                  setTrackingOrderId(orderId);
                  setAppStep("tracking");
                }}
                onRefreshCart={refreshCartCounter}
                onTriggerTab={(tab) => {
                  setActiveTab(tab as any);
                }}
              />
            );
          case "account":
            return (
              <Account
                pharmacy={pharmacy}
                currentUser={currentUser}
                onLogout={handleLogout}
                onAddToCart={handleAddToCart}
                favouriteIds={favouriteIds}
                onRefreshProfile={refreshPharmacyProfile}
              />
            );
          case "home":
          default:
            return (
              <Home
                onTriggerSearch={(query, cat) => {
                  setActiveTab("search");
                }}
                onAddToCart={handleAddToCart}
                onToggleFavourite={handleToggleFavourite}
                favouriteIds={favouriteIds}
                pharmacyName={pharmacy?.pharmacyName || "City Pharma"}
                onOpenProductDetails={(p) => setSelectedProduct(p)}
                onOpenNotifications={() => setShowNotifications(true)}
                unreadNotificationsCount={unreadNotificationsCount}
                cartQuantities={cartQuantities}
                onUpdateCartQty={handleUpdateCartQty}
                onOpenCart={() => setAppStep("cart")}
                cartCount={cartCount}
              />
            );
        }
    }
  };

  if (currentUser?.role === "Admin") {
    return <AdminPanel currentUser={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser?.role === "Depot Staff") {
    return <DepotDashboard currentUser={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser?.role === "Delivery Staff") {
    return <DeliveryDashboard currentUser={currentUser} onLogout={handleLogout} />;
  }

  return (
    <FlyToCartProvider>
      <div className="flex h-screen w-screen bg-slate-50 font-sans select-none overflow-hidden justify-center items-center">
        <div className="w-full h-full max-w-md bg-white shadow-2xl relative flex flex-col overflow-hidden">
          {/* Screen Content */}
          <div className="flex-1 overflow-hidden relative">
            {renderMobileContent()}
            
            {/* Floating product details overlay */}
            {selectedProduct && (
              <ProductDetails
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAddToCart={(pid, qty) => handleAddToCart(pid, qty)}
              />
            )}

            {/* Broadcast notifications panel overlay */}
            {showNotifications && (
              <NotificationsPanel
                onClose={() => {
                  setShowNotifications(false);
                  refreshNotifications();
                }}
                onRefreshNotifications={() => {
                  refreshNotifications();
                }}
              />
            )}
          </div>

          {/* Floating Bottom Cart Bar (Sticky Footer) & Slide-Up Cart Drawer */}
          <FloatingCartBar
            cartData={cartData}
            cartCount={cartCount}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveItem={async (productId) => {
              await orderService.removeFromCart(productId);
              await refreshCartCounter();
            }}
            onCheckoutTrigger={() => {
              setAppStep("checkout");
            }}
            onRefreshCartCounter={refreshCartCounter}
            isVisible={appStep === "main"}
          />

          {/* Dynamic Fly-To-Cart Parabolic Overlay */}
          <FlyToCartOverlay />

          {/* Bottom persistent Nav Bar */}
          {appStep === "main" && (
            <div className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 flex-shrink-0">
              <button
                onClick={() => setActiveTab("home")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  activeTab === "home" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                }`}
              >
                <HomeIcon className="w-5 h-5" />
                <span className="text-[10px] font-bold">Home</span>
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all relative ${
                  activeTab === "search" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                }`}
              >
                <PackageIcon className="w-5 h-5" />
                <span className="text-[10px] font-bold">Products</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-brand-lime text-slate-900 font-extrabold text-[8px] px-1.5 py-0.5 rounded-full min-w-4 text-center">
                    {cartCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  activeTab === "upload" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                }`}
              >
                <FileIcon className="w-5 h-5" />
                <span className="text-[10px] font-bold">AI OCR</span>
              </button>
              
              <button
                onClick={() => setActiveTab("history")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  activeTab === "history" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                }`}
              >
                <ListIcon className="w-5 h-5" />
                <span className="text-[10px] font-bold">Orders</span>
              </button>
              
              <button
                onClick={() => setActiveTab("account")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  activeTab === "account" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                }`}
              >
                <UserIcon className="w-5 h-5" />
                <span className="text-[10px] font-bold">Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </FlyToCartProvider>
  );
}
