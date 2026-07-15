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
    // Initial fetch of static assets and verify existing session
    refreshProducts();
    refreshPharmacyProfile();
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshOrders();
      refreshNotifications();
      refreshCartCounter();
      refreshFavourites();
    } else {
      setOrders([]);
      setNotifications([]);
      setCartCount(0);
      setFavouriteIds([]);
    }
  }, [currentUser]);

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
        return (
          <Splash
            onComplete={() => {
              if (currentUser) {
                setAppStep(pharmacy ? "main" : "setup");
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
              <SearchIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold">Catalog</span>
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
  );
}
