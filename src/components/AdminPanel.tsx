import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { MediChainIconOnly } from './MediChainLogo';
const AdminCharts = lazy(() => import("./AdminCharts"));
import { io } from "socket.io-client";
import ProductEditModal from "./ProductEditModal";
import AIEnrichmentPanel from "./AIEnrichmentPanel";
import BulkDealsAdmin from "./BulkDealsAdmin";
import { 
  LayoutDashboard, 
  Pill, 
  Boxes, 
  ShoppingCart, 
  Store, 
  Bell, 
  Settings,
  Cpu, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  FileText, 
  TrendingDown, 
  Percent, 
  Sparkles, 
  LogOut, 
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Calendar,
  AlertCircle,
  Clock,
  Check,
  Building,
  History,
  CircleDollarSign,
  ClipboardList,
  Menu
} from "lucide-react";

import * as XLSX from "xlsx";
import { Product, Order, Pharmacy, Notification, User, OrderStatus } from "../types";
import { productService, orderService, notificationService } from "../services";
import { storageService } from "../services/storage";
import NotificationBell from "./NotificationBell";
import PharmacyVerificationPanel from "./PharmacyVerificationPanel";
import AdminNotificationCenter from "./AdminNotificationCenter";
import AuditLogPanel from "./AuditLogPanel";

interface AdminPanelProps {
  currentUser: User;
  onLogout: () => void;
}

export default function AdminPanel({ currentUser, onLogout }: AdminPanelProps) {
  // Navigation state (matches requested /admin protected route structure)
  const [activeRoute, setActiveRoute] = useState<
    "/admin/dashboard" | 
    "/admin/products" | 
    "/admin/inventory" | 
    "/admin/orders" | 
    "/admin/pharmacies" | 
    "/admin/notifications" | 
    "/admin/settings" | "/admin/ai-enrichment" | "/admin/bulk-deals"
  >("/admin/dashboard");

  // Sync state with URL if user visits directly or refreshes
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/admin/")) {
      const matched = path as any;
      const validRoutes = [
        "/admin/dashboard",
        "/admin/products",
        "/admin/inventory",
        "/admin/orders",
        "/admin/pharmacies",
        "/admin/notifications",
        "/admin/settings",
        "/admin/ai-enrichment",
        "/admin/bulk-deals"
      ];
      if (validRoutes.includes(matched)) {
        setActiveRoute(matched);
      }
    } else {
      // Default to dashboard and push state
      window.history.replaceState(null, "", "/admin/dashboard");
    }
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateTo = (route: typeof activeRoute) => {
    window.history.pushState(null, "", route);
    setActiveRoute(route);
    setMobileMenuOpen(false);
  };

  // Listen to browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname as any;
      if (path.startsWith("/admin/")) {
        setActiveRoute(path);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Backend state synchronization
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState<number>(1);
  const [catalogTotalCount, setCatalogTotalCount] = useState<number>(0);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [prodCategoryFilter, setProdCategoryFilter] = useState("");
  const [prodCompanyFilter, setProdCompanyFilter] = useState("");
  const [prodStockFilter, setProdStockFilter] = useState<"" | "in_stock" | "low_stock" | "out_of_stock">("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // New modules states
  const [dashboardSubTab, setDashboardSubTab] = useState<"hud" | "analytics">("hud");
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [selectedProdForHistory, setSelectedProdForHistory] = useState<Product | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [exportFilterCategory, setExportFilterCategory] = useState("");

  // Filters for inventory alerts
  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState(false);
  const [inventoryExpiryDaysRange, setInventoryExpiryDaysRange] = useState<"all" | "30" | "90" | "180">("all");

  // Complete Operations Management Suite States
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [paymentLedger, setPaymentLedger] = useState<any[]>([]);
  const [financeSearch, setFinanceSearch] = useState("");
  
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifTargetType, setNotifTargetType] = useState<"global" | "pharmacy" | "offer" | "price_drop">("global");
  const [notifSelectedPharmacy, setNotifSelectedPharmacy] = useState("");
  const [notifHistory, setNotifHistory] = useState<any[]>([]);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilterModule, setAuditFilterModule] = useState("");

  const [importHistory, setImportHistory] = useState<any[]>([]);

  // Column Mapping states
  const [rawUploadedData, setRawUploadedData] = useState<any[]>([]);
  const [uploadedHeaders, setUploadedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showMappingStep, setShowMappingStep] = useState(false);

  // Pharmacy Management Search Filters
  const [pharmacySearchStatus, setPharmacySearchStatus] = useState<"All" | "Pending" | "Verified" | "Suspended">("All");
  const [creditAdjustmentLimit, setCreditAdjustmentLimit] = useState<string>("");

  const fetchPriceHistory = async (productId: string) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/price-history`);
      if (res.ok) {
        const data = await res.json();
        setPriceHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch price history", err);
    }
  };

  const syncInventoryAlerts = async () => {
    try {
      const res = await fetch("/api/admin/inventory/alerts/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.alertsCreated && data.alertsCreated.length > 0) {
          setSuccessMsg(`Synchronized ${data.alertsCreated.length} new inventory alerts.`);
        } else {
          setSuccessMsg("Inventory alerts synchronized. No new warnings detected.");
        }
        refreshAllData();
      }
    } catch (err) {
      console.error("Failed to sync inventory alerts", err);
      setErrorMsg("Failed to sync inventory alerts.");
    }
  };

  const recordExportHistory = async (type: string, format: string, filters: any) => {
    try {
      await fetch("/api/admin/export-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, format, filters })
      });
      // reload history
      const expRes = await fetch("/api/admin/export-history");
      if (expRes.ok) {
        const expData = await expRes.json();
        setExportHistory(expData.history || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    try {
      // Get Admin Dashboard Metrics
      const dashRes = await fetch("/api/admin/dashboard");
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData.metrics) {
          setTotalProductsCount(dashData.metrics.totalProducts || 0);
        }
      }

      // Get Paginated Catalog Products
      const paginatedRes = await productService.getProductsPaginated({
        page: catalogPage,
        limit: 50,
        search: prodSearch,
        category: prodCategoryFilter
      });
      setProducts(paginatedRes.products || []);
      setCatalogTotalCount(paginatedRes.total || 0);
      setCatalogTotalPages(paginatedRes.pages || 1);

      // Get Orders (All orders are returned for Admin on /api/orders)
      const ordData = await orderService.getOrders();
      setOrders(ordData);

      // Get Pharmacies
      const pharmRes = await fetch("/api/admin/pharmacies");
      if (pharmRes.ok) {
        const pharmData = await pharmRes.json();
        const list = Array.isArray(pharmData) ? pharmData : (pharmData.pharmacies || []);
        setPharmacies(list);
      }

      // Get Notifications
      const notifData = await notificationService.getNotifications();
      setNotifications(notifData);

      // Get Invoices
      const invRes = await fetch("/api/admin/invoices");
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }

      // Get Export History
      const expRes = await fetch("/api/admin/export-history");
      if (expRes.ok) {
        const expData = await expRes.json();
        setExportHistory(expData.history || []);
      }

      // Get Analytics
      const analRes = await fetch("/api/admin/analytics");
      if (analRes.ok) {
        const analData = await analRes.json();
        setAnalyticsData(analData);
      }

      // Fetch Complete Operational Admin Suite Data
      const auditRes = await fetch("/api/admin/audit-logs");
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.auditLogs || []);
      }

      const importHistRes = await fetch("/api/admin/import-history");
      if (importHistRes.ok) {
        const importHistData = await importHistRes.json();
        setImportHistory(importHistData.history || []);
      }

      const financeRes = await fetch("/api/admin/finance/summary");
      if (financeRes.ok) {
        const financeData = await financeRes.json();
        setFinanceSummary(financeData);
        setPaymentLedger(financeData.paymentHistory || []);
      }

      const notifHistRes = await fetch("/api/admin/notifications");
      if (notifHistRes.ok) {
        const notifHistData = await notifHistRes.json();
        setNotifHistory(notifHistData.history || []);
      }
    } catch (err: any) {
      console.warn("Admin refresh network warning:", err);
      setErrorMsg("Failed to synchronize B2B ledger and medicine catalogs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    
    // Connect to Socket.io for Real-time admin updates
    const socket = io();

    socket.on("connect", () => {
      socket.emit("join_role_room", "Admin");
    });

    socket.on("admin_order_updated", () => {
      // Refresh the orders non-obtrusively
      refreshAllData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Timed dismiss for messages
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(""), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // Debounce search query for Admin catalog
  const [debouncedProdSearch, setDebouncedProdSearch] = useState(prodSearch);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedProdSearch(prodSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [prodSearch]);

  // Reset catalog page to 1 when search or category filter changes
  useEffect(() => {
    setCatalogPage(1);
  }, [debouncedProdSearch, prodCategoryFilter]);

  // Refetch catalog when page or debounced search/category filters change
  useEffect(() => {
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const paginatedRes = await productService.getProductsPaginated({
          page: catalogPage,
          limit: 50,
          search: debouncedProdSearch,
          category: prodCategoryFilter
        });
        setProducts(paginatedRes.products || []);
        setCatalogTotalCount(paginatedRes.total || 0);
        setCatalogTotalPages(paginatedRes.pages || 1);
      } catch (err) {
        console.error("Error refetching catalog:", err);
      } finally {
        setCatalogLoading(false);
      }
    };

    if (!loading) {
      fetchCatalog();
    }
  }, [catalogPage, debouncedProdSearch, prodCategoryFilter]);

  const lowStockThreshold = 100;
  const getDaysToExpiry = (dateStr?: string) => {
    if (!dateStr) return 9999;
    const expDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculations for dashboard memoized
  const {
    totalProducts,
    totalStock,
    totalRegisteredPharmacies,
    totalOrders,
    ordersPending,
    ordersProcessing,
    ordersCompleted,
    ordersCancelled,
    lowStockProducts,
    lowStockCount,
    expiringProducts,
    expiringCount
  } = useMemo(() => {
    const totalProducts = totalProductsCount || catalogTotalCount || products.length;
    const totalStock = products.reduce((acc, p) => acc + (p.availableStock || 0), 0);
    const totalRegisteredPharmacies = pharmacies.length;
    const totalOrders = orders.length;

    const ordersPending = orders.filter(o => o.status === "Pending").length;
    const ordersProcessing = orders.filter(o => o.status === "Processing" || o.status === "Confirmed").length;
    const ordersCompleted = orders.filter(o => o.status === "Delivered" || o.status === "Completed").length;
    const ordersCancelled = orders.filter(o => o.status === "Cancelled").length;

    const lowStockThreshold = 100;
    const lowStockProducts = products.filter(p => (p.availableStock || 0) < lowStockThreshold);
    const lowStockCount = lowStockProducts.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const expiringProducts = products.filter(p => {
      if (!p.expiryDate) return false;
      const expDateMs = new Date(p.expiryDate).getTime();
      const diffTime = expDateMs - todayMs;
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return days <= 180;
    });
    const expiringCount = expiringProducts.length;

    return {
      totalProducts,
      totalStock,
      totalRegisteredPharmacies,
      totalOrders,
      ordersPending,
      ordersProcessing,
      ordersCompleted,
      ordersCancelled,
      lowStockProducts,
      lowStockCount,
      expiringProducts,
      expiringCount
    };
  }, [totalProductsCount, catalogTotalCount, products, pharmacies, orders]);

  // --- Sub-Module States & Actions ---

  // 1. Medicine Product Management Module
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formGeneric, setFormGeneric] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formCategory, setFormCategory] = useState<any>("Tablet");
  const [formStrength, setFormStrength] = useState("");
  const [formPackSize, setFormPackSize] = useState("");
  const [formMrp, setFormMrp] = useState("");
  const [formSellingPrice, setFormSellingPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formBatch, setFormBatch] = useState("");
  const [formExpiry, setFormExpiry] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const { url } = await storageService.uploadProductImage(file);
      setFormImageUrl(url);
      setSuccessMsg("Product image uploaded successfully");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleOpenAddProduct = () => {
    setSelectedProductForEdit(null);
    setFormName("");
    setFormGeneric("");
    setFormCompany("");
    setFormCategory("Tablet");
    setFormStrength("");
    setFormPackSize("");
    setFormMrp("");
    setFormSellingPrice("");
    setFormStock("1000");
    setFormBatch(`B-MAN${Math.floor(100 + Math.random() * 900)}`);
    // default 1 year future
    setFormExpiry(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setFormImageUrl("");
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setSelectedProductForEdit(p);
    setFormName(p.name);
    setFormGeneric(p.genericName);
    setFormCompany(p.company);
    setFormCategory(p.category);
    setFormStrength(p.strength);
    setFormPackSize(p.packSize);
    setFormMrp(p.mrp.toString());
    setFormSellingPrice(p.sellingPrice.toString());
    setFormStock(p.availableStock.toString());
    setFormBatch(p.batchNumber);
    setFormExpiry(p.expiryDate);
    setFormImageUrl(p.imageUrl || p.image_url || "");
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formGeneric || !formCompany || !formMrp || !formSellingPrice || !formExpiry || !formBatch) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    const mrpValue = parseFloat(formMrp);
    const sellingPriceValue = parseFloat(formSellingPrice);
    if (mrpValue < sellingPriceValue) {
      setErrorMsg("Maximum Retail Price (MRP) must be greater than or equal to the wholesale Selling Price.");
      return;
    }

    try {
      const body: any = {
        name: formName,
        genericName: formGeneric,
        company: formCompany,
        category: formCategory,
        strength: formStrength,
        packSize: formPackSize,
        mrp: formMrp,
        sellingPrice: formSellingPrice,
        availableStock: formStock,
        batchNumber: formBatch,
        expiryDate: formExpiry,
        imageUrl: formImageUrl
      };

      if (selectedProductForEdit) {
        const res = await fetch(`/api/admin/products/${selectedProductForEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update catalog via PATCH.");
        }

        const data = await res.json();
        const updatedProduct = data.product || { ...selectedProductForEdit, ...body };
        
        // Update product row in place without full page refetch
        setProducts(prev => prev.map(p => p.id === selectedProductForEdit.id ? updatedProduct : p));
        setSuccessMsg("Medicine details updated successfully (saved via PATCH).");
      } else {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update catalog.");
        }

        setSuccessMsg("New medicine added to platform catalog.");
        refreshAllData();
      }

      setIsProductModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to remove this medicine from the global wholesale catalog?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("Failed to delete product.");
      }

      setSuccessMsg("Medicine removed from catalog.");
      refreshAllData();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    }
  };

  // --- Bulk Import CSV & XLSX States ---
  const [isImporting, setIsImporting] = useState(false);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [rawCsvString, setRawCsvString] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    setImportedFile(file);
    setPreviewData(null);
    setImportErrors([]);
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const ab = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(ab, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        
        // Get rows as 2D array
        const sheetRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (sheetRows.length === 0) {
          throw new Error("Spreadsheet is empty.");
        }
        
        const headers = (sheetRows[0] || []).map((h: any) => String(h).trim());
        const rawData = sheetRows.slice(1);
        
        setUploadedHeaders(headers);
        setRawUploadedData(rawData);
        
        // Auto-detect mapping
        const standardFields = [
          { key: "name", synonyms: ["product name", "medicine name", "name", "medicine"] },
          { key: "genericName", synonyms: ["generic name", "generic", "formula"] },
          { key: "company", synonyms: ["company", "manufacturer", "mfg", "brand"] },
          { key: "category", synonyms: ["category", "type", "form"] },
          { key: "strength", synonyms: ["strength", "power", "mg"] },
          { key: "packSize", synonyms: ["pack size", "pack", "size"] },
          { key: "mrp", synonyms: ["mrp", "retail price", "price mrp", "m.r.p"] },
          { key: "sellingPrice", synonyms: ["selling price", "wholesale price", "price", "rate", "selling_price"] },
          { key: "availableStock", synonyms: ["available stock", "stock", "quantity", "qty", "stock quantity"] },
          { key: "batchNumber", synonyms: ["batch number", "batch", "batch no", "batch_number"] },
          { key: "expiryDate", synonyms: ["expiry date", "expiry", "exp date", "exp", "expiry_date"] },
          { key: "imageUrl", synonyms: ["image url", "image", "img url", "img", "image_url"] }
        ];
        
        const initialMap: Record<string, string> = {};
        standardFields.forEach(field => {
          const matchedHeader = headers.find(h => {
            const normalizedHeader = h.toLowerCase().replace(/[^a-z0-9]/g, "");
            return field.synonyms.some(syn => {
              const normalizedSyn = syn.toLowerCase().replace(/[^a-z0-9]/g, "");
              return normalizedHeader === normalizedSyn || normalizedHeader.includes(normalizedSyn);
            });
          });
          if (matchedHeader) {
            initialMap[field.key] = matchedHeader;
          } else {
            initialMap[field.key] = ""; // unmapped
          }
        });
        
        setColumnMapping(initialMap);
        setShowMappingStep(true);
        setIsImporting(false);
      } catch (err: any) {
        setErrorMsg("Failed to parse the uploaded spreadsheet. " + err.message);
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleApplyColumnMappingAndValidate = async () => {
    setIsImporting(true);
    setShowMappingStep(false);
    
    try {
      // Map JSON to standard CSV structure
      const csvHeader = "Product Name,Generic Name,Company,Category,Strength,Pack Size,MRP,Selling Price,Stock,Batch Number,Expiry Date,Image URL";
      const csvRows = rawUploadedData.map(row => {
        const getValueForField = (fieldKey: string) => {
          const mappedHeader = columnMapping[fieldKey];
          if (!mappedHeader) return "";
          const headerIdx = uploadedHeaders.indexOf(mappedHeader);
          if (headerIdx === -1) return "";
          const val = row[headerIdx];
          return val !== undefined && val !== null ? String(val).replace(/"/g, '""') : "";
        };
        
        const name = getValueForField("name");
        const genericName = getValueForField("genericName");
        const company = getValueForField("company");
        const category = getValueForField("category") || "Tablet";
        const strength = getValueForField("strength") || "N/A";
        const packSize = getValueForField("packSize") || "N/A";
        const mrp = getValueForField("mrp") || "0";
        const sellingPrice = getValueForField("sellingPrice") || "0";
        const stock = getValueForField("availableStock") || "0";
        const batchNumber = getValueForField("batchNumber") || `B-IMP${Math.floor(100+Math.random()*900)}`;
        const expiryDate = getValueForField("expiryDate") || new Date(Date.now() + 365*24*60*60*1000).toISOString().split("T")[0];
        const imageUrl = getValueForField("imageUrl") || "";
        
        return `"${name}","${genericName}","${company}","${category}","${strength}","${packSize}",${mrp},${sellingPrice},${stock},"${batchNumber}","${expiryDate}","${imageUrl}"`;
      });
      
      const csvContent = [csvHeader, ...csvRows].join("\n");
      setRawCsvString(csvContent);
      await runDryRun(csvContent);
    } catch (err: any) {
      setErrorMsg("Error compiling mapped spreadsheet. " + err.message);
      setIsImporting(false);
    }
  };

  const runDryRun = async (csvContent: string) => {
    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent, commit: false }) // commit false for dry-run validation preview
      });

      if (!res.ok) {
        throw new Error("Validation dry-run failed on server.");
      }

      const data = await res.json();
      setPreviewData(data);
      setImportErrors(data.errors || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Dry run validation failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!rawCsvString || !previewData) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: rawCsvString, commit: true }) // commit true to save to DB
      });

      if (!res.ok) {
        throw new Error("Bulk import final commit failed.");
      }

      const data = await res.json();
      
      // Save import history event on server
      await fetch("/api/admin/import-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: importedFile?.name || "catalog_upload.xlsx",
          totalRows: previewData.totalProcessed,
          successCount: data.successCount,
          failureCount: previewData.failureCount
        })
      });

      setSuccessMsg(`Bulk Import Success: Created ${data.successCount} wholesale medicines.`);
      setImportedFile(null);
      setPreviewData(null);
      setImportErrors([]);
      refreshAllData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to finalize bulk product import.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSVTemplate = () => {
    window.open("/api/admin/products/import/template", "_blank");
  };

  const handleDownloadExcelTemplate = () => {
    const headers = [
      "Product Name", "Generic Name", "Company", "Category", "Strength", 
      "Pack Size", "MRP", "Selling Price", "Stock", "Batch Number", "Expiry Date", "Image URL"
    ];
    const sampleData = [
      [
        "Napa Extra", "Paracetamol + Caffeine", "Beximco Pharmaceuticals", "Tablet", 
        "500mg + 65mg", "240's Box", "480.00", "360.00", "450", "B-NPE92", "2027-10-15", "https://example.com/napa.png"
      ],
      [
        "Seclo 20", "Omeprazole", "Square Pharmaceuticals", "Capsule", 
        "20mg", "120's Box", "720.00", "576.00", "550", "SQ-SEC20", "2027-12-05", "https://example.com/seclo.png"
      ]
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MediChain Bulk Catalog");
    XLSX.writeFile(workbook, "medi_chain_bulk_import_template.xlsx");
  };

  // 2. Inventory Management Module
  const [invSearch, setInvSearch] = useState("");
  const [invFilterLowStock, setInvFilterLowStock] = useState(false);
  const [invFilterExpiry, setInvFilterExpiry] = useState(false);
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [editingInvStock, setEditingInvStock] = useState("");
  const [editingInvBatch, setEditingInvBatch] = useState("");
  const [editingInvExpiry, setEditingInvExpiry] = useState("");

  const handleStartEditInventory = (p: Product) => {
    setEditingInvId(p.id);
    setEditingInvStock(p.availableStock.toString());
    setEditingInvBatch(p.batchNumber);
    setEditingInvExpiry(p.expiryDate);
  };

  const handleSaveInventoryRow = async (id: string) => {
    if (!editingInvStock || !editingInvBatch || !editingInvExpiry) {
      setErrorMsg("All inventory fields are required.");
      return;
    }
    const parsedStock = parseInt(editingInvStock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setErrorMsg("Stock count must be a non-negative integer.");
      return;
    }

    try {
      const res = await fetch("/api/admin/inventory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          availableStock: parsedStock,
          batchNumber: editingInvBatch,
          expiryDate: editingInvExpiry
        })
      });

      if (!res.ok) {
        throw new Error("Failed to save inventory updates.");
      }

      setSuccessMsg("Batch stock count and expiration date synchronized.");
      setEditingInvId(null);
      refreshAllData();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    }
  };

  // 3. Order Operations Module
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await orderService.updateOrderStatus(orderId, status);
      setSuccessMsg(`Order workflow status set to ${status}.`);
      if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
        setSelectedOrderDetails(prev => prev ? { ...prev, status } : null);
      }
      refreshAllData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to route order status.");
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        setErrorMsg("Order details not found.");
        return;
      }
      
      const invId = "INV-" + orderId.replace("MCH-", "");
      await fetch(`/api/admin/invoices/${invId}/download`, { method: "POST" });
      
      // refresh invoices
      const invRes = await fetch("/api/admin/invoices");
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
      
      const pharmacy = pharmacies.find(p => p.id === order.pharmacyId) || {
        id: "pharm_default",
        pharmacyName: "Lazz Pharma (Dhanmondi)",
        ownerName: "Zahid Hasan",
        phone: "01712345678",
        address: "House 42, Road 9A, Dhanmondi",
        city: "Dhaka",
        licenseNo: "DC-PH-2025-1194",
        creditLimit: 20000,
        usedCredit: 0,
        availableCredit: 20000
      };

      setSelectedInvoice({
        id: invId,
        orderId,
        order,
        pharmacy,
        downloadCount: ((invoices.find(i => i.id === invId)?.downloadCount) || 0) + 1
      });
      setSuccessMsg("Procurement invoice ledger generated successfully.");
    } catch (err: any) {
      setErrorMsg("An error occurred generating invoice.");
    }
  };

  // 4. Pharmacy Registry Module
  const [pharmacySearch, setPharmacySearch] = useState("");
  const [selectedPharmacyProfile, setSelectedPharmacyProfile] = useState<Pharmacy | null>(null);

  // 5. Alert Broadcasting Center
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastType, setBroadcastType] = useState<any>("system");

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) {
      setErrorMsg("Title and message body are required.");
      return;
    }

    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMsg,
          type: broadcastType
        })
      });

      if (!res.ok) {
        throw new Error("Failed to dispatch broadcast alert.");
      }

      setSuccessMsg(`High-priority notification dispatched to all registered pharmacies.`);
      setBroadcastTitle("");
      setBroadcastMsg("");
      refreshAllData();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    }
  };

  const handleExportData = async (format: "excel" | "json") => {
    try {
      const type = format === "excel" ? "Excel Spreadsheet" : "JSON Database Backup";
      const res = await fetch("/api/admin/export-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      if (!res.ok) {
        throw new Error("Failed to register export ledger log.");
      }
      
      if (format === "json") {
        const jsonStr = JSON.stringify({ products, orders, pharmacies, invoices, priceHistory }, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `medichain-db-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
      } else {
        const worksheet = XLSX.utils.json_to_sheet(products.map(p => ({
          Name: p.name,
          Company: p.company,
          Strength: p.strength,
          Batch: p.batchNumber,
          Stock: p.availableStock,
          MRP: p.mrp,
          SellingPrice: p.sellingPrice,
          Expiry: p.expiryDate
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Medicines");
        XLSX.writeFile(workbook, `medichain-medicines-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      }
      
      setSuccessMsg(`Database state exported successfully as: ${format.toUpperCase()}`);
      
      const logsRes = await fetch("/api/admin/export-history");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setExportHistory(logsData.history || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to perform system state backup.");
    }
  };

  const handleExportProductsCSV = () => {
    if (!products || products.length === 0) {
      setErrorMsg("No products available in the catalog to export.");
      return;
    }
    const headers = [
      "ID",
      "Product Name",
      "Generic Formula Name",
      "Manufacturer Company",
      "Category",
      "Strength",
      "Pack Size",
      "MRP (BDT)",
      "Selling Price (BDT)",
      "Available Stock",
      "Batch Number",
      "Expiry Date",
      "Image URL"
    ];

    const escapeCSVCell = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = products.map(p => [
      p.id,
      p.name,
      p.genericName,
      p.company,
      p.category,
      p.strength,
      p.packSize,
      p.mrp,
      p.sellingPrice,
      p.availableStock,
      p.batchNumber,
      p.expiryDate,
      p.imageUrl || p.image_url || ""
    ]);

    const csvContent = [
      headers.map(escapeCSVCell).join(","),
      ...rows.map(r => r.map(escapeCSVCell).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `medichain-all-products-catalog-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessMsg(`All products catalog (${products.length} medicines) downloaded in CSV format.`);
    recordExportHistory("CSV Product Catalog", "CSV", { count: products.length });
  };

  const handleExportProductsExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(products.map(p => ({
      "Product Name": p.name,
      "Generic Name": p.genericName,
      "Company": p.company,
      "Category": p.category,
      "Strength": p.strength,
      "Pack Size": p.packSize,
      "MRP": p.mrp,
      "Selling Price": p.sellingPrice,
      "Stock": p.availableStock,
      "Batch": p.batchNumber,
      "Expiry": p.expiryDate
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Medicine Catalog");
    XLSX.writeFile(workbook, `medichain-catalog-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setSuccessMsg("Catalog exported as Excel.");
  };

  // Quick Action Utilities
  const handleTriggerPriceDropAction = async () => {
    if (!window.confirm("Broadcast 5% Wholesale Catalog Price Drop to all pharmacies?")) return;
    try {
      await productService.triggerAdminPriceDrop();
      setSuccessMsg("Ledger Event: Global 5% price drop enacted.");
      refreshAllData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to enact price drop.");
    }
  };

  const handleTriggerFlashOfferAction = async () => {
    try {
      await productService.triggerAdminNewOffer();
      setSuccessMsg("Dispatched high-priority flash procurement offer.");
      refreshAllData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to trigger flash offer.");
    }
  };

  const handleUpdatePharmacyStatus = async (pharmacyId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/pharmacies/${pharmacyId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSuccessMsg(`Pharmacy account verification status updated to: ${status}`);
        setPharmacies(prev => prev.map(p => p.id === pharmacyId ? { ...p, status } : p));
        if (selectedPharmacyProfile && selectedPharmacyProfile.id === pharmacyId) {
          setSelectedPharmacyProfile(prev => prev ? { ...prev, status } : null);
        }
        refreshAllData();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to update pharmacy verification status.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to update pharmacy verification status.");
    }
  };

  const handleAdjustPharmacyCredit = async (pharmacyId: string, creditLimit: string) => {
    try {
      const res = await fetch(`/api/admin/pharmacies/${pharmacyId}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditLimit })
      });
      if (res.ok) {
        setSuccessMsg("Credit limit adjusted successfully.");
        setCreditAdjustmentLimit("");
        refreshAllData();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to adjust credit limit.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to adjust credit limit.");
    }
  };

  const handleSendBroadcasterNotification = async () => {
    if (!notifTitle || !notifMessage) {
      setErrorMsg("Please fill in both title and message.");
      return;
    }
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notifTitle,
          message: notifMessage,
          targetType: notifTargetType,
          pharmacyId: notifTargetType === "pharmacy" ? notifSelectedPharmacy : undefined
        })
      });
      if (res.ok) {
        setSuccessMsg("Notification dispatched successfully!");
        setNotifTitle("");
        setNotifMessage("");
        setNotifSelectedPharmacy("");
        refreshAllData();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to dispatch notification.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to dispatch notification.");
    }
  };

  // --- RENDERING VIEWS ---

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Global Alert Toast HUD */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-emerald-500 text-slate-950 px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3 font-semibold text-sm border border-emerald-400 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 bg-rose-500 text-slate-950 px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3 font-semibold text-sm border border-rose-400 animate-slide-in">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Mobile Top App Header Bar */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 select-none">
            <MediChainIconOnly className="w-7 h-7 object-contain" />
            <div>
              <span className="text-xs font-black tracking-wider text-slate-900">MEDICHAIN</span>
              <span className="text-[8px] text-indigo-400 font-extrabold uppercase block tracking-wider">Admin</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={refreshAllData}
            className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
            title="Refresh Sync"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-white/80 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Admin Sidebar HUD (responsive drawer on mobile, static on desktop) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-white border-r border-slate-200 flex flex-col justify-between
        transform transition-transform duration-200 ease-in-out
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8 select-none">
            <div className="flex items-center gap-2">
              <MediChainIconOnly className="w-8 h-8 object-contain" />
              <div>
                <h1 className="text-sm font-black tracking-wider text-slate-900">MEDICHAIN</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Admin Console</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => navigateTo("/admin/dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/dashboard" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Operations Hub</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/products")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/products" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Pill className="w-4 h-4" />
              <span>Medicine Catalog</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/inventory")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/inventory" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Inventory Logs</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all relative ${
                activeRoute === "/admin/orders" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>B2B Orders</span>
              {ordersPending > 0 && (
                <span className="absolute right-3 bg-rose-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {ordersPending}
                </span>
              )}
            </button>

            <button
              onClick={() => navigateTo("/admin/pharmacies")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/pharmacies" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Pharmacy Registry</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/notifications")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/notifications" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Broadcaster HUD</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/finance")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/finance" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <CircleDollarSign className="w-4 h-4" />
              <span>Finance Panel</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/audit-logs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/audit-logs" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Audit Logs</span>
            </button>

            
            <button
              onClick={() => navigateTo("/admin/ai-enrichment")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/ai-enrichment" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>AI Enrichment</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/bulk-deals")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/bulk-deals" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Bulk Deals</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/settings" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>System Settings</span>
            </button>
          </nav>
        </div>

        {/* User profile logout */}
        <div className="p-6 border-t border-slate-900 bg-white/60 flex items-center justify-between flex-shrink-0">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Super Administrator</p>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto min-h-0">
        {/* Top Header Panel */}
        <header className="hidden lg:flex min-h-14 border-b border-slate-200 bg-white/40 px-6 lg:px-8 py-3 items-center justify-between gap-3 flex-shrink-0">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wider uppercase">
              {activeRoute === "/admin/dashboard" && "OPERATIONS CONTROL CENTER"}
              {activeRoute === "/admin/products" && "MEDICINE MASTER REGISTRY"}
              {activeRoute === "/admin/inventory" && "STOCK LOGISTICS DISPATCH"}
              {activeRoute === "/admin/orders" && "B2B WHOLESALE PROCUREMENTS"}
              {activeRoute === "/admin/pharmacies" && "B2B PHARMACY REGISTRY"}
              {activeRoute === "/admin/notifications" && "ALERTS BROADCAST RADAR"}
              {activeRoute === "/admin/finance" && "FINANCE & CREDIT ACCOUNTING"}
              {activeRoute === "/admin/audit-logs" && "SYSTEM TRANSACTION AUDIT LOGS"}
              {activeRoute === "/admin/settings" && "SYSTEM PLATFORM SCHEMAS"}
              {activeRoute === "/admin/ai-enrichment" && "AI PRODUCT ENRICHMENT ENGINE"}
              {activeRoute === "/admin/bulk-deals" && "BULK DEALS MANAGER"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <NotificationBell />
            <button 
              onClick={refreshAllData}
              className="p-2 rounded-lg bg-slate-200 hover:bg-slate-700 text-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh Global Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Synchronize Ledger</span>
              <span className="sm:hidden">Sync</span>
            </button>
            <div className="text-[10px] sm:text-[11px] font-mono text-slate-500 tracking-wider bg-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200">
              GMT 2026-07-14 03:00
            </div>
          </div>
        </header>

        {/* Content Screens Router */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {loading && products.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Loading wholesale ledger streams...</p>
            </div>
          ) : (
            <>
              {/* SCREEN 1: OPERATIONS HUD / DASHBOARD */}
              {activeRoute === "/admin/dashboard" && (
                <div className="space-y-8 animate-fade-in">
                  {/* Dashboard Sub Tab Switcher */}
                  <div className="flex items-center gap-3 border-b border-slate-900 pb-1">
                    <button
                      onClick={() => setDashboardSubTab("hud")}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                        dashboardSubTab === "hud" ? "border-indigo-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Operations HUD
                    </button>
                    <button
                      onClick={() => setDashboardSubTab("analytics")}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                        dashboardSubTab === "analytics" ? "border-indigo-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      B2B Analytics Radar
                    </button>
                  </div>

                  {dashboardSubTab === "hud" ? (
                    <>
                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                        <div 
                          onClick={() => navigateTo("/admin/products")}
                          className="bg-white/60 border border-slate-200 rounded-2xl p-5 shadow-lg relative overflow-hidden hover:scale-[1.02] hover:shadow-xl hover:border-indigo-400 transition-all cursor-pointer group"
                          title="Click to manage catalog medicines"
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1 group-hover:text-indigo-600 transition-colors">Catalog Medicines</span>
                          <span className="text-2xl font-black text-slate-900">{totalProducts}</span>
                          <p className="text-[10px] text-indigo-400 font-bold mt-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1"><Pill className="w-3 h-3" /> Fully Audited Formulas</span>
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                          </p>
                        </div>

                        <div 
                          onClick={() => navigateTo("/admin/inventory")}
                          className="bg-white/60 border border-slate-200 rounded-2xl p-5 shadow-lg relative overflow-hidden hover:scale-[1.02] hover:shadow-xl hover:border-emerald-400 transition-all cursor-pointer group"
                          title="Click to view inventory levels"
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1 group-hover:text-emerald-600 transition-colors">Total Stock Count</span>
                          <span className="text-2xl font-black text-slate-900">{totalStock.toLocaleString()}</span>
                          <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1"><Boxes className="w-3 h-3" /> In-Store Reserves</span>
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                          </p>
                        </div>

                        <div 
                          onClick={() => navigateTo("/admin/pharmacies")}
                          className="bg-white/60 border border-slate-200 rounded-2xl p-5 shadow-lg relative overflow-hidden hover:scale-[1.02] hover:shadow-xl hover:border-amber-400 transition-all cursor-pointer group"
                          title="Click to manage registered pharmacies"
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1 group-hover:text-amber-600 transition-colors">Registered Pharmacies</span>
                          <span className="text-2xl font-black text-slate-900">{totalRegisteredPharmacies}</span>
                          <p className="text-[10px] text-amber-400 font-bold mt-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1"><Store className="w-3 h-3" /> Licensed Accounts</span>
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
                          </p>
                        </div>

                        <div 
                          onClick={() => navigateTo("/admin/orders")}
                          className="bg-white/60 border border-slate-200 rounded-2xl p-5 shadow-lg relative overflow-hidden hover:scale-[1.02] hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer group"
                          title="Click to view B2B orders"
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1 group-hover:text-blue-600 transition-colors">Total B2B Orders</span>
                          <span className="text-2xl font-black text-slate-900">{totalOrders}</span>
                          <p className="text-[10px] text-blue-400 font-bold mt-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Pipeline Procurement</span>
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                          </p>
                        </div>

                        <div 
                          onClick={() => {
                            setInventoryLowStockOnly(true);
                            navigateTo("/admin/inventory");
                          }}
                          className="bg-white/60 border border-slate-200 rounded-2xl p-5 shadow-lg relative overflow-hidden sm:col-span-2 md:col-span-1 hover:scale-[1.02] hover:shadow-xl hover:border-rose-400 transition-all cursor-pointer group"
                          title="Click to inspect low stock & expiring warnings"
                        >
                          <span className="text-[9px] uppercase font-bold text-rose-400 tracking-widest block mb-1 group-hover:text-rose-600 transition-colors">Warnings Checklist</span>
                          <div className="flex gap-4 mt-1">
                            <div>
                              <span className="text-lg font-black text-rose-500">{lowStockCount}</span>
                              <span className="text-[8px] text-slate-500 font-bold block uppercase">Stockout</span>
                            </div>
                            <div>
                              <span className="text-lg font-black text-amber-500">{expiringCount}</span>
                              <span className="text-[8px] text-slate-500 font-bold block uppercase">Expiry</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Order pipeline states breakdown */}
                      <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 sm:p-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Orders Pipeline Progress</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="bg-white/80 p-3 sm:p-4 rounded-xl border border-slate-900">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Unprocessed</span>
                            <span className="text-lg sm:text-xl font-black text-slate-700">{ordersPending}</span>
                          </div>
                          <div className="bg-white/80 p-3 sm:p-4 rounded-xl border border-slate-900">
                            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block mb-1">Active Assembly</span>
                            <span className="text-lg sm:text-xl font-black text-amber-400">{ordersProcessing}</span>
                          </div>
                          <div className="bg-white/80 p-3 sm:p-4 rounded-xl border border-slate-900">
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Dispatched & Complete</span>
                            <span className="text-lg sm:text-xl font-black text-emerald-400">{ordersCompleted}</span>
                          </div>
                          <div className="bg-white/80 p-3 sm:p-4 rounded-xl border border-slate-900">
                            <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block mb-1">Cancelled</span>
                            <span className="text-lg sm:text-xl font-black text-rose-400">{ordersCancelled}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions & Recent Tables */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column 1: Quick Actions panel */}
                        <div className="bg-white/60 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Platform Quick Controls</h3>
                          
                          <button
                            onClick={handleOpenAddProduct}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-between cursor-pointer shadow-lg"
                          >
                            <span className="flex items-center gap-2">
                              <Plus className="w-4 h-4" /> Add Manual Medicine
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => navigateTo("/admin/products")}
                            className="w-full bg-slate-50 hover:bg-slate-850 text-slate-700 border border-slate-200 p-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Upload className="w-4 h-4" /> Bulk Import Panel
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={handleTriggerPriceDropAction}
                            className="w-full bg-slate-50 hover:bg-slate-850 text-rose-400 border border-rose-500/10 p-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4" /> Trigger 5% Price Drop
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={handleTriggerFlashOfferAction}
                            className="w-full bg-slate-50 hover:bg-slate-850 text-emerald-400 border border-emerald-500/10 p-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4" /> Publish Flash Offer
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Column 2 & 3: Recent Activity Lists */}
                        <div className="lg:col-span-2 bg-white/60 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-6">
                          <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                              <span>Active B2B Pipeline Transactions</span>
                              <button onClick={() => navigateTo("/admin/orders")} className="text-[10px] text-indigo-400 font-bold hover:underline">View All</button>
                            </h3>
                            {orders.length === 0 ? (
                              <p className="text-xs text-slate-500">No recent wholesale orders detected.</p>
                            ) : (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                {orders.slice(0, 3).map((o, idx) => {
                                  const orderPharmacy = pharmacies.find(ph => ph.id === o.pharmacyId);
                                  return (
                                    <div key={o.id || `order-${idx}`} className="bg-slate-50/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between text-xs hover:border-slate-850 transition-all">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                          <ShoppingCart className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-900 text-xs">{o.id}</p>
                                          <p className="text-[10px] text-slate-500">{orderPharmacy?.pharmacyName || "Lazz Pharma (Dhanmondi)"}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-extrabold text-slate-900">৳{o.totalAmount.toLocaleString()}</p>
                                        <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                          o.status === "Pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                          o.status === "Delivered" || o.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                          "bg-slate-200 text-slate-500 border border-slate-700/50"
                                        }`}>
                                          {o.status}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Recent Pharmacy Enlistments</h3>
                            <div className="space-y-2">
                              {pharmacies.slice(0, 3).map((ph, idx) => (
                                <div key={ph.id || `ph-${idx}`} className="bg-slate-50/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                      <Store className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 text-xs">{ph.pharmacyName}</p>
                                      <p className="text-[10px] text-slate-500">License: {ph.licenseNo}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-emerald-400 text-[10px]">৳{ph.availableCredit.toLocaleString()} Credit</p>
                                    <p className="text-[9px] text-slate-500">{ph.city}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <Suspense fallback={<div className="h-48 w-full flex items-center justify-center text-slate-500 font-bold text-xs bg-white/60 rounded-2xl animate-pulse border border-slate-200">Loading charts...</div>}>
                      <AdminCharts analyticsData={analyticsData} ordersPending={ordersPending} ordersProcessing={ordersProcessing} ordersCompleted={ordersCompleted} ordersCancelled={ordersCancelled} />
                    </Suspense>
                  )}
                </div>
              )}

              {/* SCREEN 2: MEDICINE PRODUCT CATALOG MANAGEMENT */}
              {activeRoute === "/admin/products" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Back Navigation Header */}
                  <div className="flex items-center justify-between bg-white/40 border border-slate-200/80 px-4 py-3 rounded-2xl">
                    <button
                      onClick={() => navigateTo("/admin/dashboard")}
                      className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:border-indigo-300">
                        <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
                      </div>
                      <span>Back to Operations Control Center</span>
                    </button>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Product Catalog Management
                    </span>
                  </div>

                  {/* Action Filters Panel */}
                  <div className="bg-white/60 border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search product name, generic formula, or category..."
                          value={prodSearch}
                          onChange={(e) => setProdSearch(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>

                      <select
                        value={prodCategoryFilter}
                        onChange={(e) => setProdCategoryFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">All Categories</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Injection">Injection</option>
                        <option value="Cream">Cream</option>
                        <option value="Supplement">Supplement</option>
                      </select>

                      <select
                        value={prodStockFilter}
                        onChange={(e) => setProdStockFilter(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">All Stock Statuses</option>
                        <option value="in_stock">In Stock (&gt; 20)</option>
                        <option value="low_stock">Low Stock (1 - 20)</option>
                        <option value="out_of_stock">Out of Stock (0)</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Filter Company..."
                        value={prodCompanyFilter}
                        onChange={(e) => setProdCompanyFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 w-full sm:w-auto sm:max-w-[150px]"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={handleExportProductsCSV}
                        className="flex-1 sm:flex-initial justify-center bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 text-xs font-bold py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                        title="Download current complete product catalog in CSV format"
                      >
                        <Download className="w-4 h-4 text-slate-900" />
                        <span>Download Catalog (CSV)</span>
                      </button>
                      <button
                        onClick={handleExportProductsExcel}
                        className="flex-1 sm:flex-initial justify-center bg-slate-50 hover:bg-slate-850 text-slate-700 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        title="Export Catalog as Excel spreadsheet"
                      >
                        <FileText className="w-4 h-4" /> XLSX
                      </button>
                      <button
                        onClick={handleOpenAddProduct}
                        className="w-full sm:w-auto justify-center bg-slate-200 hover:bg-slate-700 text-white text-xs font-semibold py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                      >
                        <Plus className="w-4 h-4" /> Add Medicine
                      </button>
                    </div>
                  </div>

                  {/* Bulk Import Section */}
                  <div className="bg-white/40 border border-slate-200 rounded-2xl p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Bulk Medicine Catalog Import</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Upload wholesale medicine files supporting both .csv and .xlsx spreadsheets.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleExportProductsCSV}
                          className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Download current live catalog as CSV file"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-400" /> Current Catalog CSV ({products.length})
                        </button>
                        <button
                          onClick={handleDownloadCSVTemplate}
                          className="bg-slate-50 hover:bg-slate-850 text-slate-700 border border-slate-200 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> CSV Template
                        </button>
                        <button
                          onClick={handleDownloadExcelTemplate}
                          className="bg-slate-50 hover:bg-slate-850 text-slate-700 border border-slate-200 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Excel Template (.xlsx)
                        </button>
                      </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all relative ${
                        dragActive ? "border-indigo-500 bg-indigo-500/5" : "border-slate-200 bg-white/20 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="file"
                        id="file-upload-input"
                        className="hidden"
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileInput}
                      />
                      <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                        <div className="p-3 bg-slate-50 rounded-full text-indigo-400">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Drag & Drop Catalog Spreadsheet, or <span className="text-indigo-400 hover:underline">Browse files</span></p>
                          <p className="text-[10px] text-slate-500 mt-1">Accepts official CSV template or Excel spreadsheets with column validation.</p>
                        </div>
                      </label>
                    </div>

                    {/* Column Mapping Wizard Step */}
                    {showMappingStep && (
                      <div className="mt-6 bg-white p-6 rounded-xl border border-indigo-500/30 space-y-4 animate-fade-in text-slate-700">
                        <div className="border-b border-slate-850 pb-3">
                          <span className="text-[9px] uppercase font-black text-indigo-400 tracking-wider">Excel Spreadsheet Column Mapping Wizard</span>
                          <h4 className="text-xs font-extrabold text-slate-900 mt-0.5">We auto-detected columns in your spreadsheet. Review and align headers with MediChain models:</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          {[
                            { key: "name", label: "Product Name (Required)", required: true },
                            { key: "genericName", label: "Generic Formula Name (Required)", required: true },
                            { key: "company", label: "Manufacturer Company (Required)", required: true },
                            { key: "category", label: "Category (Tablet/Capsule/Syrup...)", required: false },
                            { key: "strength", label: "Strength (mg/ml)", required: false },
                            { key: "packSize", label: "Pack Size", required: false },
                            { key: "mrp", label: "Maximum Retail Price (MRP)", required: true },
                            { key: "sellingPrice", label: "Selling Wholesale Price", required: true },
                            { key: "availableStock", label: "Available Stock Qty", required: false },
                            { key: "batchNumber", label: "Batch Number", required: false },
                            { key: "expiryDate", label: "Expiry Date (YYYY-MM-DD)", required: false },
                            { key: "imageUrl", label: "Product Image URL", required: false }
                          ].map(field => (
                            <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/60 p-3 rounded-lg border border-slate-900 text-xs gap-2">
                              <span className="font-semibold text-slate-700">
                                {field.label} {field.required && <span className="text-rose-500">*</span>}
                              </span>
                              <select
                                value={columnMapping[field.key] || ""}
                                onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer w-full sm:w-auto sm:min-w-[140px]"
                              >
                                <option value="">-- Ignore / Unmapped --</option>
                                {uploadedHeaders.map((header, idx) => (
                                  <option key={idx} value={header}>{header}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                          <button
                            onClick={() => {
                              setShowMappingStep(false);
                              setImportedFile(null);
                            }}
                            className="bg-slate-50 hover:bg-slate-850 text-slate-500 border border-slate-200 text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleApplyColumnMappingAndValidate}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-5 rounded-xl transition-all cursor-pointer shadow-lg"
                          >
                            Analyze & Validate Catalog
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Import Preview HUD */}
                    {isImporting && (
                      <div className="mt-4 flex items-center justify-center gap-2 py-4">
                        <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span className="text-xs font-semibold text-slate-500">Parsing and running validation dry-run on server...</span>
                      </div>
                    )}

                    {previewData && (
                      <div className="mt-6 bg-white p-5 rounded-xl border border-slate-850 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Dry-Run Review Sheet</span>
                            <h4 className="text-xs font-bold text-slate-900 mt-0.5">Parsed file: {importedFile?.name}</h4>
                          </div>
                          <div className="flex gap-4 text-xs font-bold">
                            <span className="text-slate-500">Total Rows: {previewData.totalProcessed}</span>
                            <span className="text-emerald-400">Valid: {previewData.successCount}</span>
                            <span className="text-rose-400">Errors: {previewData.failureCount}</span>
                          </div>
                        </div>

                        {/* Error log details */}
                        {importErrors.length > 0 && (
                          <div className="bg-rose-950/20 border border-rose-950 p-4 rounded-lg space-y-2">
                            <h5 className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" /> Spreadsheet Schema Violations Detected:
                            </h5>
                            <div className="max-h-[140px] overflow-y-auto space-y-1 text-[11px] font-mono text-rose-300 pr-1">
                              {importErrors.map((err, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="font-bold text-rose-400">Row {err.row}:</span>
                                  <span>{err.productName} — {err.errors.join("; ")}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Valid records preview table */}
                        {previewData.successCount > 0 && (
                          <div>
                            <h5 className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-2">Valid Products Ready for Wholesale Listing:</h5>
                            <div className="max-h-[200px] overflow-y-auto border border-slate-850 rounded-lg">
                              <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                  <tr>
                                    <th className="p-2 font-bold uppercase">Medicine Name</th>
                                    <th className="p-2 font-bold uppercase">Generic</th>
                                    <th className="p-2 font-bold uppercase">Mfg</th>
                                    <th className="p-2 font-bold uppercase">Price (৳)</th>
                                    <th className="p-2 font-bold uppercase">Batch</th>
                                    <th className="p-2 font-bold uppercase">Expiry</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850 text-slate-700">
                                  {previewData.importedProducts.map((p: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/40">
                                      <td className="p-2 font-semibold text-slate-900">{p.name}</td>
                                      <td className="p-2">{p.genericName}</td>
                                      <td className="p-2">{p.company}</td>
                                      <td className="p-2">৳{p.sellingPrice} <span className="text-[9px] text-slate-500">(MRP ৳{p.mrp})</span></td>
                                      <td className="p-2 font-mono">{p.batchNumber}</td>
                                      <td className="p-2">{p.expiryDate}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Trigger Commit Buttons */}
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={() => {
                              setPreviewData(null);
                              setImportedFile(null);
                              setImportErrors([]);
                            }}
                            className="bg-slate-50 hover:bg-slate-850 border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer transition-all"
                          >
                            Cancel Import
                          </button>
                          <button
                            onClick={handleConfirmImport}
                            disabled={previewData.successCount === 0}
                            className={`text-xs font-semibold py-2 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
                              previewData.successCount > 0 ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"
                            }`}
                          >
                            <Check className="w-4 h-4" /> Import {previewData.successCount} Valid Medicines
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Import History Trail */}
                    <div className="mt-6 pt-6 border-t border-slate-850 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Spreadsheet Import Audit Trail</span>
                        <span className="text-[9px] text-indigo-400 font-extrabold uppercase">({importHistory.length} successful bulk operations)</span>
                      </div>
                      
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {importHistory.length === 0 ? (
                          <p className="text-[10px] text-slate-600 italic">No historical catalog uploads logged yet.</p>
                        ) : (
                          importHistory.map((hist, idx) => (
                            <div key={hist.id || `hist-${idx}`} className="bg-slate-50/40 border border-slate-900 p-2.5 rounded-lg flex items-center justify-between text-[11px]">
                              <div className="space-y-0.5 text-left">
                                <p className="font-extrabold text-slate-700 truncate max-w-[200px]">{hist.fileName}</p>
                                <p className="text-[9px] text-slate-500 font-bold">{new Date(hist.date).toLocaleString()} • by {hist.importedBy}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right text-[10px] font-bold">
                                  <span className="text-slate-500">Total: {hist.totalRows}</span> • <span className="text-emerald-400">Success: {hist.successCount}</span> • <span className="text-rose-400">Failed: {hist.failureCount}</span>
                                </div>
                                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                  hist.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}>
                                  {hist.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Medicine Catalog Grid */}
                  <div className="bg-white/60 border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
                    <div className="max-h-[500px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-white text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-850 sticky top-0 z-10">
                          <tr>
                            <th className="p-4 font-bold">Formula / Brand</th>
                            <th className="p-4 font-bold">Category</th>
                            <th className="p-4 font-bold">Supplier Company</th>
                            <th className="p-4 font-bold">Strength & Pack</th>
                            <th className="p-4 font-bold text-center">Stock Level</th>
                            <th className="p-4 font-bold text-right">MRP (৳)</th>
                            <th className="p-4 font-bold text-right">Trade Price (৳)</th>
                            <th className="p-4 font-bold text-right">Discount</th>
                            <th className="p-4 font-bold text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-white/30">
                          {catalogLoading ? (
                            Array.from({ length: 6 }).map((_, idx) => (
                              <tr key={`skel-${idx}`} className="animate-pulse">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-200"></div>
                                    <div className="space-y-1.5 flex-1">
                                      <div className="h-3 bg-slate-200 rounded w-28"></div>
                                      <div className="h-2 bg-slate-150 rounded w-20"></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4"><div className="h-3 bg-slate-200 rounded w-16"></div></td>
                                <td className="p-4"><div className="h-3 bg-slate-200 rounded w-24"></div></td>
                                <td className="p-4"><div className="h-3 bg-slate-200 rounded w-20"></div></td>
                                <td className="p-4"><div className="h-3 bg-slate-200 rounded w-12 mx-auto"></div></td>
                                <td className="p-4"><div className="h-3 bg-slate-200 rounded w-12 ml-auto"></div></td>
                                <td className="p-4"><div className="h-3 bg-slate-200 rounded w-12 ml-auto"></div></td>
                                <td className="p-4"><div className="h-3 bg-slate-200 rounded w-14 ml-auto"></div></td>
                                <td className="p-4"><div className="h-6 bg-slate-200 rounded w-12 mx-auto"></div></td>
                               </tr>
                            ))
                          ) : (
                            products
                              .filter(p => {
                                const q = prodSearch.toLowerCase().trim();
                                const matchesSearch = !q || 
                                  p.name.toLowerCase().includes(q) || 
                                  p.genericName.toLowerCase().includes(q) || 
                                  p.category.toLowerCase().includes(q);
                                const matchesCategory = !prodCategoryFilter || p.category === prodCategoryFilter;
                                const matchesCompany = !prodCompanyFilter || p.company.toLowerCase().includes(prodCompanyFilter.toLowerCase());
                                
                                const stock = p.availableStock ?? 0;
                                let matchesStock = true;
                                if (prodStockFilter === "in_stock") matchesStock = stock > 20;
                                else if (prodStockFilter === "low_stock") matchesStock = stock > 0 && stock <= 20;
                                else if (prodStockFilter === "out_of_stock") matchesStock = stock === 0;

                                return matchesSearch && matchesCategory && matchesCompany && matchesStock;
                              })
                              .map((p, idx) => {
                                const stock = p.availableStock ?? 0;
                                return (
                              <tr key={p.id || `prod-${idx}`} className="hover:bg-slate-50/40 group">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] text-indigo-400 font-extrabold uppercase overflow-hidden">
                                      {p.imageUrl || p.image_url ? (
                                        <img src={p.imageUrl || p.image_url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        p.name.slice(0, 2)
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                                      <p className="text-[10px] text-slate-500 font-semibold">{p.genericName}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 font-semibold text-slate-500">{p.category}</td>
                                <td className="p-4 text-slate-500 truncate max-w-[150px]">{p.company}</td>
                                <td className="p-4 text-slate-500 font-medium">
                                  <span>{p.strength}</span>
                                  <span className="block text-[10px] text-slate-500">{p.packSize}</span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    stock === 0 ? "bg-rose-100 text-rose-700 border border-rose-200" :
                                    stock <= 20 ? "bg-amber-100 text-amber-700 border border-amber-200" :
                                    "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  }`}>
                                    {stock === 0 ? "Out of Stock" : stock <= 20 ? `Low (${stock})` : `${stock} units`}
                                  </span>
                                </td>
                                <td className="p-4 text-right text-slate-500">৳{p.mrp.toFixed(2)}</td>
                                <td className="p-4 text-right font-bold text-slate-900">৳{p.sellingPrice.toFixed(2)}</td>
                                <td className="p-4 text-right font-extrabold text-emerald-400">{p.discountPercentage}% OFF</td>
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleOpenEditProduct(p)}
                                      className="p-1.5 rounded bg-slate-50 hover:bg-slate-850 text-indigo-400 transition-all cursor-pointer"
                                      title="Edit Details"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(p.id)}
                                      className="p-1.5 rounded bg-slate-50 hover:bg-rose-500/15 text-rose-400 transition-all cursor-pointer"
                                      title="Delete Product"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/80 border-t border-slate-200">
                      <div className="text-xs text-slate-600 font-semibold">
                        Showing <span className="font-bold text-slate-900">{catalogTotalCount === 0 ? 0 : (catalogPage - 1) * 50 + 1}</span> to{" "}
                        <span className="font-bold text-slate-900">{Math.min(catalogPage * 50, catalogTotalCount)}</span> of{" "}
                        <span className="font-bold text-slate-900">{catalogTotalCount}</span> medicines
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCatalogPage(prev => Math.max(prev - 1, 1))}
                          disabled={catalogPage <= 1}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-extrabold text-slate-800 px-3">
                          Page {catalogPage} of {catalogTotalPages || 1}
                        </span>
                        <button
                          onClick={() => setCatalogPage(prev => Math.min(prev + 1, catalogTotalPages))}
                          disabled={catalogPage >= catalogTotalPages}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 3: INVENTORY LOGISTICS DISPATCH */}
              {activeRoute === "/admin/inventory" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Filter Hub */}
                  <div className="bg-white/60 border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm w-full">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search stock reserves..."
                        value={invSearch}
                        onChange={(e) => setInvSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={inventoryLowStockOnly}
                          onChange={(e) => setInventoryLowStockOnly(e.target.checked)}
                          className="rounded border-slate-200 bg-slate-50 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                        />
                        <span>Low Stock Only (&lt; {lowStockThreshold})</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold uppercase">Expiry Range:</span>
                        <select
                          value={inventoryExpiryDaysRange}
                          onChange={(e: any) => setInventoryExpiryDaysRange(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="all">All Lifespans</option>
                          <option value="30">Within 30 Days</option>
                          <option value="90">Within 90 Days</option>
                          <option value="180">Within 180 Days (6 Months)</option>
                        </select>
                      </div>

                      <button
                        onClick={syncInventoryAlerts}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold py-2 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        title="Run sweep to generate automated admin & client warnings."
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Run Alerts Sweeper</span>
                      </button>
                    </div>
                  </div>

                  {/* Inventory Grid Table */}
                  <div className="bg-white/60 border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
                    <div className="max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-white text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-850 sticky top-0 z-10">
                          <tr>
                            <th className="p-4 font-bold">Medicine Brand</th>
                            <th className="p-4 font-bold">Wholesale Stock Status</th>
                            <th className="p-4 font-bold">Available Reserve Count</th>
                            <th className="p-4 font-bold">Batch Reference</th>
                            <th className="p-4 font-bold">Ledger Expiry Date</th>
                            <th className="p-4 font-bold text-center">Operation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-white/30">
                          {products
                            .filter(p => {
                              const matchesSearch = p.name.toLowerCase().includes(invSearch.toLowerCase()) || p.batchNumber.toLowerCase().includes(invSearch.toLowerCase());
                              const isLow = p.availableStock < lowStockThreshold;
                              const matchesLowStock = !inventoryLowStockOnly || isLow;
                              
                              const days = getDaysToExpiry(p.expiryDate);
                              let matchesExpiry = true;
                              if (inventoryExpiryDaysRange !== "all") {
                                const maxDays = parseInt(inventoryExpiryDaysRange, 10);
                                matchesExpiry = days <= maxDays && days >= 0;
                              }
                              return matchesSearch && matchesLowStock && matchesExpiry;
                            })
                            .map((p, idx) => {
                              const daysToExpiry = getDaysToExpiry(p.expiryDate);
                              const isEditing = editingInvId === p.id;
                              const isLow = p.availableStock < lowStockThreshold;

                              return (
                                <tr key={p.id || `inv-${idx}`} className="hover:bg-slate-50/40">
                                  <td className="p-4">
                                    <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                                    <p className="text-[10px] text-slate-500">{p.company} • {p.strength}</p>
                                  </td>
                                  <td className="p-4">
                                    {p.availableStock === 0 ? (
                                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">🚨 Stockout</span>
                                    ) : isLow ? (
                                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">⚠️ Low Stock</span>
                                    ) : (
                                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Healthy</span>
                                    )}

                                    {daysToExpiry <= 0 ? (
                                      <span className="ml-2 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">Expired</span>
                                    ) : daysToExpiry <= 180 ? (
                                      <span className="ml-2 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Near Expiry</span>
                                    ) : null}
                                  </td>
                                  <td className="p-4 font-mono font-bold">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        value={editingInvStock}
                                        onChange={(e) => setEditingInvStock(e.target.value)}
                                        className="bg-slate-50 border border-slate-700 rounded px-2 py-1 text-xs text-white max-w-[100px] font-bold"
                                      />
                                    ) : (
                                      <span className={isLow ? "text-amber-400" : "text-slate-900"}>{p.availableStock.toLocaleString()} units</span>
                                    )}
                                  </td>
                                  <td className="p-4 font-mono text-slate-700">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingInvBatch}
                                        onChange={(e) => setEditingInvBatch(e.target.value)}
                                        className="bg-slate-50 border border-slate-700 rounded px-2 py-1 text-xs text-white max-w-[120px]"
                                      />
                                    ) : (
                                      p.batchNumber
                                    )}
                                  </td>
                                  <td className="p-4">
                                    {isEditing ? (
                                      <input
                                        type="date"
                                        value={editingInvExpiry}
                                        onChange={(e) => setEditingInvExpiry(e.target.value)}
                                        className="bg-slate-50 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                      />
                                    ) : (
                                      <span className={daysToExpiry <= 180 ? "text-amber-400" : "text-slate-500"}>
                                        {p.expiryDate} <span className="text-[10px] text-slate-500">({daysToExpiry} days)</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center">
                                    {isEditing ? (
                                      <div className="flex justify-center gap-1.5">
                                        <button
                                          onClick={() => handleSaveInventoryRow(p.id)}
                                          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-all cursor-pointer"
                                          title="Save Adjustments"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setEditingInvId(null)}
                                          className="p-1.5 bg-slate-200 hover:bg-slate-750 text-slate-500 rounded transition-all cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleStartEditInventory(p)}
                                        className="bg-slate-50 hover:bg-slate-850 border border-slate-200 hover:border-indigo-500/30 text-indigo-400 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                      >
                                        Quick Adjust
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 4: B2B WHOLESALE PROCUREMENTS */}
              {activeRoute === "/admin/orders" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Orders List Pane */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Search */}
                      <div className="bg-white/60 border border-slate-200 p-4 rounded-2xl">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search procurement order ID or invoice ID..."
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* List */}
                      <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 space-y-3">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Orders Ledger Pipeline</h3>
                        
                        {orders.length === 0 ? (
                          <p className="text-xs text-slate-500">No matching wholesale pipeline orders found.</p>
                        ) : (
                          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                            {orders
                              .filter(o => o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.pharmacyId.toLowerCase().includes(orderSearch.toLowerCase()))
                              .map((o, idx) => {
                                const isSelected = selectedOrderDetails?.id === o.id;
                                const orderPharmacy = pharmacies.find(ph => ph.id === o.pharmacyId);
                                return (
                                  <div
                                    key={o.id || `order-${idx}`}
                                    onClick={() => setSelectedOrderDetails(o)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                                      isSelected ? "border-indigo-500 bg-indigo-500/5 shadow" : "border-slate-900 bg-white hover:border-slate-850"
                                    }`}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className={`p-2.5 rounded-lg ${
                                        o.status === "Pending" ? "bg-amber-500/10 text-amber-400" :
                                        o.status === "Delivered" || o.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" :
                                        "bg-slate-200 text-slate-500"
                                      }`}>
                                        <ShoppingCart className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="font-extrabold text-slate-900 text-xs">{o.id}</p>
                                          <span className="text-[10px] text-slate-500 font-bold">•</span>
                                          <p className="text-[10px] text-slate-500 font-bold">{new Date(o.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{orderPharmacy?.pharmacyName || "Lazz Pharma"}</p>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <p className="font-black text-slate-900 text-xs">৳{o.totalAmount.toLocaleString()}</p>
                                      <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full block mt-1 w-max ml-auto ${
                                        o.status === "Pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                        o.status === "Delivered" || o.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                        o.status === "Cancelled" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                                        "bg-slate-200 text-slate-500 border border-slate-700/50"
                                      }`}>
                                        {o.status}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Details Pane */}
                    <div className="lg:col-span-1">
                      {selectedOrderDetails ? (
                        <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 space-y-6 animate-fade-in">
                          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Active Workspace Sheet</span>
                              <h4 className="text-xs font-black text-slate-900 mt-0.5">{selectedOrderDetails.id}</h4>
                            </div>
                            <button
                              onClick={() => setSelectedOrderDetails(null)}
                              className="p-1 rounded hover:bg-slate-850 text-slate-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Pharmacy Info Block */}
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">Buyer Enlistment Info</span>
                            <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-900 text-xs text-slate-700">
                              <p className="font-extrabold text-slate-900 text-xs">Lazz Pharma (Dhanmondi)</p>
                              <p className="text-[10px] text-slate-500 mt-1">Owner: Zahid Hasan</p>
                              <p className="text-[10px] text-slate-500">Phone: 01712345678</p>
                              <p className="text-[10px] text-slate-500">Address: House 42, Road 9A, Dhanmondi</p>
                              <p className="text-[10px] text-slate-500">License No: DC-PH-2025-1194</p>
                            </div>
                          </div>

                          {/* Items Purchased List */}
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">Wholesale Manifest items</span>
                            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                              {selectedOrderDetails.items?.map((item, idx) => (
                                <div key={idx} className="bg-slate-50/40 p-2.5 rounded-lg border border-slate-900 text-xs flex justify-between items-center">
                                  <div>
                                    <p className="font-bold text-slate-900">{item.name}</p>
                                    <p className="text-[9px] text-slate-500">{item.strength} • {item.packSize}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-slate-700">{item.quantity} Qty</p>
                                    <p className="text-[9px] text-slate-500">৳{item.sellingPrice} ea</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Pipeline status controller */}
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">Routing workflow pipeline</span>
                            <select
                              value={selectedOrderDetails.status}
                              onChange={(e) => handleUpdateOrderStatus(selectedOrderDetails.id, e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="Pending">Pending Approval</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Processing">Processing Assembly</option>
                              <option value="Packed">Packed</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Completed">Delivered & Complete</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>

                          {/* Order actions */}
                          <div className="space-y-2 border-t border-slate-850 pt-4 flex gap-3">
                            <button
                              onClick={() => handleDownloadInvoice(selectedOrderDetails.id)}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow"
                            >
                              <FileText className="w-4 h-4" /> Download B2B Invoice
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/20 border border-slate-850 border-dashed rounded-2xl p-8 text-center text-slate-500 text-xs">
                          Select a wholesale order from the pipeline to review inventory manifests and update delivery routing.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 5: B2B PHARMACY REGISTRY & VERIFICATION PANEL */}
              {activeRoute === "/admin/pharmacies" && (
                <PharmacyVerificationPanel
                  pharmacies={pharmacies}
                  onPharmacyUpdated={refreshAllData}
                />
              )}

              {/* SCREEN 6: ALERTS BROADCAST RADAR */}
              {activeRoute === "/admin/notifications" && (
                <AdminNotificationCenter
                  notifications={notifications}
                  pharmacies={pharmacies}
                  onNavigateToTab={(tab) => navigateTo(tab as any)}
                  onRefreshNotifications={refreshAllData}
                />
              )}

              {/* SCREEN: FINANCE & CREDIT ACCOUNTING */}
              {activeRoute === "/admin/finance" && (
                <div className="space-y-6 animate-fade-in text-slate-700">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/60 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Credit Limits Authorized</p>
                      <h3 className="text-xl font-black text-slate-900">৳{financeSummary?.totalCreditLimit?.toLocaleString() || "0"}</h3>
                      <p className="text-[9px] text-slate-500">Aggregated credit caps across registry</p>
                    </div>
                    <div className="bg-white/60 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Outstanding Balances (Receivables)</p>
                      <h3 className="text-xl font-black text-rose-400">৳{financeSummary?.totalOutstanding?.toLocaleString() || "0"}</h3>
                      <p className="text-[9px] text-slate-500">Aggregated credit balances currently utilized</p>
                    </div>
                    <div className="bg-white/60 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Aggregated Available Credit</p>
                      <h3 className="text-xl font-black text-emerald-400">৳{financeSummary?.totalAvailableCredit?.toLocaleString() || "0"}</h3>
                      <p className="text-[9px] text-slate-500 font-medium text-emerald-500/80">Liquidity safety headroom buffer</p>
                    </div>
                    <div className="bg-white/60 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Revenue Paid</p>
                      <h3 className="text-xl font-black text-indigo-400">৳{financeSummary?.totalPaidAmount?.toLocaleString() || "0"}</h3>
                      <p className="text-[9px] text-slate-500">Aggregated invoice payouts recorded</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    {/* Left 2 cols: Pharmacy Credit Accounts */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="bg-white/60 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">B2B Pharmacy Credit Registers</h3>
                          <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search pharmacy accounts..."
                              value={financeSearch}
                              onChange={(e) => setFinanceSearch(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-[11px] font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>

                        <div className="overflow-x-auto border border-slate-900 rounded-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 uppercase text-[9px] font-extrabold tracking-wider border-b border-slate-850">
                                <th className="px-4 py-3">Pharmacy</th>
                                <th className="px-4 py-3 text-right">Credit Bound</th>
                                <th className="px-4 py-3 text-right">Used Credit</th>
                                <th className="px-4 py-3 text-right">Available Limit</th>
                                <th className="px-4 py-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850 bg-white/40">
                              {pharmacies
                                .filter(ph => ph.pharmacyName.toLowerCase().includes(financeSearch.toLowerCase()))
                                .map((ph, idx) => (
                                  <tr key={ph.id || `ph-${idx}`} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="px-4 py-3">
                                      <p className="font-extrabold text-slate-900">{ph.pharmacyName}</p>
                                      <p className="text-[10px] text-slate-500 font-bold">{ph.city}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-slate-900">
                                      ৳{ph.creditLimit?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-rose-400">
                                      ৳{ph.usedCredit?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-emerald-400">
                                      ৳{ph.availableCredit?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                        ph.status === "Verified" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                                        ph.status === "Suspended" ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" :
                                        "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                      }`}>
                                        {ph.status || "Pending"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right col: Payment Ledger Log */}
                    <div className="lg:col-span-1 bg-white/60 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Payment Transaction History</h3>
                      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                        {paymentLedger.length === 0 ? (
                          <div className="text-center p-8 text-slate-500 text-xs border border-slate-900 border-dashed rounded-xl">
                            No ledger receipts or transactions logged yet.
                          </div>
                        ) : (
                          paymentLedger.map((pay, idx) => (
                            <div key={idx} className="bg-slate-50/50 border border-slate-900 p-4 rounded-xl text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 text-[11px]">{pay.pharmacyName}</span>
                                <span className="text-emerald-400 font-bold">৳{pay.amountPaid?.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span>Ref: {pay.orderId}</span>
                                <span>Method: <span className="text-slate-700 font-semibold">{pay.paymentMethod}</span></span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] border-t border-slate-850 pt-2 text-slate-500 font-bold">
                                <span>{new Date(pay.paidAt).toLocaleString()}</span>
                                <span className="text-emerald-500">SUCCESS</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}



              
              {/* SCREEN 8: AI ENRICHMENT */}
              {activeRoute === "/admin/ai-enrichment" && (
                <AIEnrichmentPanel />
              )}

              {activeRoute === "/admin/bulk-deals" && (
                <BulkDealsAdmin />
              )}

              {/* SCREEN 7: SYSTEM PLATFORM SCHEMAS */}
              {activeRoute === "/admin/settings" && (
                <div className="space-y-6 max-w-xl animate-fade-in">
                  <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">B2B Platform Operations Profile</h3>
                    
                    <div className="text-xs space-y-3.5 text-slate-700">
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1">Platform Instance Node ID</span>
                        <p className="font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-850 text-slate-500">c2e94b69-4bca-494d-b42f-f8adefd8426f</p>
                      </div>

                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1">Ledger Database State Storage</span>
                        <p className="font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-850 text-slate-500">db-store.json (In-Memory synchronized file system)</p>
                      </div>

                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1">Authorization Credentials RBAC Bounds</span>
                        <p className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-850 text-slate-500">
                          Authorized Admin Account: <span className="font-bold text-slate-900 font-mono">admin@medichain.com</span> <br />
                          Required authorization level: <span className="text-indigo-400 font-bold font-mono">Role == "Admin"</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Backup & Export Tools Panel */}
                  <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 space-y-4">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">State Management & Snapshots</span>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mt-1">Backup & Export Ledger Tools</h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Generate high-fidelity snapshots of the MediChain wholesale ledger. Download compiled lists of verified catalog products in high-precision Excel format or structural JSON database dumps.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleExportProductsCSV}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                        title="Download current all products catalog in CSV format"
                      >
                        <Download className="w-4 h-4" /> Download Catalog (CSV)
                      </button>

                      <button
                        onClick={() => handleExportData("excel")}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                      >
                        <FileText className="w-4 h-4" /> Export as Excel (.xlsx)
                      </button>

                      <button
                        onClick={() => handleExportData("json")}
                        className="flex-1 bg-slate-50 hover:bg-slate-850 text-white border border-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" /> Export JSON DB Backup
                      </button>
                    </div>

                    {/* Historical Logs of Exports */}
                    <div className="space-y-3 pt-2">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block font-black">Export Event Log Trail</span>
                      {exportHistory.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">No historical backups have been generated yet in this instance session.</p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {exportHistory.map((item, index) => (
                            <div key={item.id || index} className="bg-slate-50/60 p-3 rounded-xl border border-slate-900 flex justify-between items-center text-[11px]">
                              <div>
                                <p className="font-extrabold text-slate-900 text-xs">{item.type}</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">By {item.exportedByAdmin} • {new Date(item.exportedAt).toLocaleString()}</p>
                              </div>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {item.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 8: AUDIT LOGS TRAIL */}
              {activeRoute === "/admin/audit-logs" && (
                <AuditLogPanel
                  auditLogs={auditLogs}
                  onRefresh={refreshAllData}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* --- FLOATING DETAILED MEDICINE ADJUSTMENTS DIALOG --- */}
      <ProductEditModal
        product={selectedProductForEdit}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={async (productData) => {
          const res = await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData)
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to update catalog.");
          }

          setSuccessMsg(selectedProductForEdit ? "Medicine details updated successfully." : "New medicine added to platform catalog.");
          setIsProductModalOpen(false);
          refreshAllData();
        }}
      />
    </div>
  );
}
