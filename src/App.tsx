import React, { useState, useEffect } from "react";
import DashboardStats from "./components/DashboardStats";
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
import { Product, Pharmacy, Order, Notification, User } from "./types";
import { Home as HomeIcon, Search as SearchIcon, FileText as FileIcon, ClipboardList as ListIcon, User as UserIcon, Shield, Smartphone } from "lucide-react";
import { authService, productService, orderService, profileService, notificationService } from "./services";

export default function App() {
  // Mobile app navigation state
  const [appStep, setAppStep] = useState<"splash" | "login" | "setup" | "main" | "checkout" | "success" | "tracking">("splash");
  const [activeTab, setActiveTab] = useState<"home" | "search" | "upload" | "history" | "account">("home");

  // Core Data State
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [phone, setPhone] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);

  // UI state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>("");
  const [cartCount, setCartCount] = useState(0);

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

  const handleRoleSwitch = async (role: string) => {
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        await refreshPharmacyProfile();
        await refreshOrders();
        await refreshProducts();
        await refreshNotifications();
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
      const totalItems = data.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;
      setCartCount(totalItems);
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
    // Initial fetch of static assets and current states
    refreshProducts();
    refreshPharmacyProfile();
    refreshOrders();
    refreshNotifications();
    refreshCartCounter();
    refreshFavourites();
  }, []);

  // Compute unread count
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Find an active order that needs delivery progress (oldest non-delivered order)
  const activeOrderToDeliver = orders.find(o => o.status !== "Delivered");

  // Authentication callbacks
  const handleLoginSuccess = (userPhone: string, needsSetup: boolean) => {
    setPhone(userPhone);
    if (needsSetup) {
      setAppStep("setup");
    } else {
      refreshPharmacyProfile();
      refreshOrders();
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
        return <Splash onComplete={() => setAppStep("login")} />;
      case "login":
        return <Login onLoginSuccess={handleLoginSuccess} />;
      case "setup":
        return <ProfileSetup phone={phone} onSetupComplete={handleSetupComplete} />;
      case "checkout":
        return (
          <Checkout
            onBackToCart={() => {
              setAppStep("main");
              setActiveTab("search"); // return to search which houses basket
            }}
            onOrderPlaced={(orderId) => {
              refreshOrders();
              refreshPharmacyProfile();
              refreshProducts();
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
                onRoleSwitch={handleRoleSwitch}
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
              />
            );
        }
    }
  };

  return (
    <div className="flex h-screen w-screen bg-brand-bg font-sans select-none overflow-hidden">
      {/* 1. Desktop Operational Cockpit (Left Side) */}
      <div className="hidden lg:block w-[420px] h-full flex-shrink-0">
        <DashboardStats
          products={products}
          orders={orders}
          pharmacy={pharmacy}
          currentUser={currentUser}
          onTriggerPriceDrop={handleTriggerPriceDrop}
          onTriggerNewOffer={handleTriggerNewOffer}
          onSimulateDeliveryStatus={handleSimulateDeliveryStatus}
          activeOrderToDeliver={activeOrderToDeliver}
          onRefreshProducts={refreshProducts}
        />
      </div>

      {/* 2. Centered Smartphone Preview Device Viewport (Right Side) */}
      <div className="flex-1 h-full bg-brand-bg relative flex items-center justify-center p-4">
        {/* Ambient surrounding glow highlights */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand-purple/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-lime/5 rounded-full blur-[140px]" />

        {/* Dynamic header watermark badge */}
        <div className="absolute top-6 left-6 text-[11px] text-gray-500 font-mono flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200/80 shadow-sm z-10">
          <Shield className="text-brand-lime w-4 h-4" />
          <span>Secure Sandbox • Role: <strong className="text-brand-purple">{currentUser?.role || "Pharmacy Owner"}</strong></span>
        </div>

        {/* Outer Phone shell */}
        <div className="relative w-[360px] h-[740px] bg-white rounded-[44px] p-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.06)] border-4 border-gray-200/80 flex flex-col justify-between overflow-hidden">
          {/* Inner glass bezel highlights */}
          <div className="absolute inset-0 rounded-[38px] border border-black/5 pointer-events-none z-50" />

          {/* Phone Top Notch bar */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-100 border-b border-x border-gray-200/50 rounded-b-2xl flex items-center justify-center gap-1.5 z-50 px-3">
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
            <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-pulse" />
          </div>

          {/* Actual Mobile Screen Inner frame */}
          <div className="w-full h-full bg-brand-bg rounded-[32px] overflow-hidden relative flex flex-col pt-3">
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

            {/* Bottom persistent Nav Bar (Only visible when user is registered in main flow) */}
            {appStep === "main" && (
              <div className="bg-white border-t border-slate-100 px-4 py-2 flex items-center justify-between rounded-b-[32px] shadow-lg sticky bottom-0 z-40 flex-shrink-0">
                <button
                  onClick={() => setActiveTab("home")}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    activeTab === "home" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                  }`}
                >
                  <HomeIcon className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Home</span>
                </button>

                <button
                  onClick={() => setActiveTab("search")}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-all relative ${
                    activeTab === "search" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                  }`}
                >
                  <SearchIcon className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Catalog</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 bg-brand-lime text-slate-900 font-extrabold text-[8px] px-1.5 py-0.5 rounded-full min-w-4 text-center">
                      {cartCount}
                    </span>
                  )}
                </button>

                {/* Main Action Action: Upload OCR */}
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    activeTab === "upload" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                  }`}
                >
                  <FileIcon className="w-5 h-5" />
                  <span className="text-[9px] font-bold">AI OCR</span>
                </button>

                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    activeTab === "history" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                  }`}
                >
                  <ListIcon className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Orders</span>
                </button>

                <button
                  onClick={() => setActiveTab("account")}
                  className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    activeTab === "account" ? "text-brand-purple scale-110" : "text-slate-400 hover:text-slate-500"
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Account</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
