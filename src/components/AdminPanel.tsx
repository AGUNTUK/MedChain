import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Pill, 
  Boxes, 
  ShoppingCart, 
  Store, 
  Bell, 
  Settings, 
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
  RefreshCw,
  Eye,
  Calendar,
  AlertCircle,
  Clock,
  Check,
  Building,
  History,
  CircleDollarSign,
  ClipboardList
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import * as XLSX from "xlsx";
import { Product, Order, Pharmacy, Notification, User, OrderStatus } from "../types";
import { productService, orderService, notificationService } from "../services";
import NotificationBell from "./NotificationBell";

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
    "/admin/settings"
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
        "/admin/settings"
      ];
      if (validRoutes.includes(matched)) {
        setActiveRoute(matched);
      }
    } else {
      // Default to dashboard and push state
      window.history.replaceState(null, "", "/admin/dashboard");
    }
  }, []);

  const navigateTo = (route: typeof activeRoute) => {
    window.history.pushState(null, "", route);
    setActiveRoute(route);
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
      // Get Products
      const prodData = await productService.getProducts();
      setProducts(prodData);

      // Get Orders (All orders are returned for Admin on /api/orders)
      const ordData = await orderService.getOrders();
      setOrders(ordData);

      // Get Pharmacies
      const pharmRes = await fetch("/api/admin/pharmacies");
      if (pharmRes.ok) {
        const pharmData = await pharmRes.json();
        setPharmacies(pharmData.pharmacies || []);
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
      console.error(err);
      setErrorMsg("Failed to synchronize B2B ledger and medicine catalogs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
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

  // Calculations for dashboard
  const totalProducts = products.length;
  const totalStock = products.reduce((acc, p) => acc + (p.availableStock || 0), 0);
  const totalRegisteredPharmacies = pharmacies.length;
  const totalOrders = orders.length;

  const ordersPending = orders.filter(o => o.status === "Pending").length;
  const ordersProcessing = orders.filter(o => o.status === "Processing" || o.status === "Confirmed").length;
  const ordersCompleted = orders.filter(o => o.status === "Delivered" || o.status === "Completed").length;
  const ordersCancelled = orders.filter(o => o.status === "Cancelled").length;

  const lowStockThreshold = 100;
  const lowStockProducts = products.filter(p => p.availableStock < lowStockThreshold);
  const lowStockCount = lowStockProducts.length;

  // Near expiry: <= 180 days from now
  const getDaysToExpiry = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const expiringProducts = products.filter(p => {
    const days = getDaysToExpiry(p.expiryDate);
    return days <= 180; // expired or expiring in 6 months
  });
  const expiringCount = expiringProducts.length;

  // --- Sub-Module States & Actions ---

  // 1. Medicine Product Management Module
  const [prodSearch, setProdSearch] = useState("");
  const [prodCategoryFilter, setProdCategoryFilter] = useState("");
  const [prodCompanyFilter, setProdCompanyFilter] = useState("");
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
        body.id = selectedProductForEdit.id;
      }

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update catalog.");
      }

      setSuccessMsg(selectedProductForEdit ? "Medicine details updated successfully." : "New medicine added to platform catalog.");
      setIsProductModalOpen(false);
      refreshAllData();
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
        creditLimit: 150000,
        usedCredit: 35400,
        availableCredit: 114600
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
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* 1. Global Alert Toast HUD */}
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

      {/* 2. Admin Sidebar HUD */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 select-none">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-black text-slate-950">
              MC
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white">MEDICHAIN</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Admin Console</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => navigateTo("/admin/dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/dashboard" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Operations Hub</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/products")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/products" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Pill className="w-4 h-4" />
              <span>Medicine Catalog</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/inventory")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/inventory" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Inventory Logs</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all relative ${
                activeRoute === "/admin/orders" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
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
                activeRoute === "/admin/pharmacies" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Pharmacy Registry</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/notifications")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/notifications" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Broadcaster HUD</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/finance")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/finance" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <CircleDollarSign className="w-4 h-4" />
              <span>Finance Panel</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/audit-logs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/audit-logs" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Audit Logs</span>
            </button>

            <button
              onClick={() => navigateTo("/admin/settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeRoute === "/admin/settings" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>System Settings</span>
            </button>
          </nav>
        </div>

        {/* User profile logout */}
        <div className="p-6 border-t border-slate-900 bg-slate-950/60 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Super Administrator</p>
          </div>
          <button 
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* 3. Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        {/* Top Header Panel */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/40 px-8 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white tracking-wider uppercase">
              {activeRoute === "/admin/dashboard" && "OPERATIONS CONTROL CENTER"}
              {activeRoute === "/admin/products" && "MEDICINE MASTER REGISTRY"}
              {activeRoute === "/admin/inventory" && "STOCK LOGISTICS DISPATCH"}
              {activeRoute === "/admin/orders" && "B2B WHOLESALE PROCUREMENTS"}
              {activeRoute === "/admin/pharmacies" && "B2B PHARMACY REGISTRY"}
              {activeRoute === "/admin/notifications" && "ALERTS BROADCAST RADAR"}
              {activeRoute === "/admin/finance" && "FINANCE & CREDIT ACCOUNTING"}
              {activeRoute === "/admin/audit-logs" && "SYSTEM TRANSACTION AUDIT LOGS"}
              {activeRoute === "/admin/settings" && "SYSTEM PLATFORM SCHEMAS"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button 
              onClick={refreshAllData}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh Global Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Synchronize Ledger</span>
            </button>
            <div className="text-[11px] font-mono text-slate-500 tracking-wider bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              GMT 2026-07-14 03:00
            </div>
          </div>
        </header>

        {/* Content Screens Router */}
        <div className="p-8 flex-1">
          {loading && products.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-400">Loading wholesale ledger streams...</p>
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
                        dashboardSubTab === "hud" ? "border-indigo-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Operations HUD
                    </button>
                    <button
                      onClick={() => setDashboardSubTab("analytics")}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                        dashboardSubTab === "analytics" ? "border-indigo-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      B2B Analytics Radar
                    </button>
                  </div>

                  {dashboardSubTab === "hud" ? (
                    <>
                      {/* Stats Grid */}
                      <div className="grid grid-cols-5 gap-4">
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1">Catalog Medicines</span>
                          <span className="text-2xl font-black text-white">{totalProducts}</span>
                          <p className="text-[10px] text-indigo-400 font-bold mt-1.5 flex items-center gap-1">
                            <Pill className="w-3 h-3" /> Fully Audited Formulas
                          </p>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1">Total Stock Count</span>
                          <span className="text-2xl font-black text-white">{totalStock.toLocaleString()}</span>
                          <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                            <Boxes className="w-3 h-3" /> In-Store Reserves
                          </p>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1">Registered Pharmacies</span>
                          <span className="text-2xl font-black text-white">{totalRegisteredPharmacies}</span>
                          <p className="text-[10px] text-amber-400 font-bold mt-1.5 flex items-center gap-1">
                            <Store className="w-3 h-3" /> Licensed Accounts
                          </p>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1">Total B2B Orders</span>
                          <span className="text-2xl font-black text-white">{totalOrders}</span>
                          <p className="text-[10px] text-blue-400 font-bold mt-1.5 flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" /> Pipeline Procurement
                          </p>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                          <span className="text-[9px] uppercase font-bold text-rose-400 tracking-widest block mb-1">Warnings Checklist</span>
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
                      <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Orders Pipeline Progress</h3>
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Unprocessed</span>
                            <span className="text-xl font-black text-slate-300">{ordersPending}</span>
                          </div>
                          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900">
                            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block mb-1">Active Assembly</span>
                            <span className="text-xl font-black text-amber-400">{ordersProcessing}</span>
                          </div>
                          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900">
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Dispatched & Complete</span>
                            <span className="text-xl font-black text-emerald-400">{ordersCompleted}</span>
                          </div>
                          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900">
                            <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block mb-1">Cancelled</span>
                            <span className="text-xl font-black text-rose-400">{ordersCancelled}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions & Recent Tables */}
                      <div className="grid grid-cols-3 gap-6">
                        {/* Column 1: Quick Actions panel */}
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2">Platform Quick Controls</h3>
                          
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
                            className="w-full bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 p-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Upload className="w-4 h-4" /> Bulk Import Panel
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={handleTriggerPriceDropAction}
                            className="w-full bg-slate-900 hover:bg-slate-850 text-rose-400 border border-rose-500/10 p-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4" /> Trigger 5% Price Drop
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={handleTriggerFlashOfferAction}
                            className="w-full bg-slate-900 hover:bg-slate-850 text-emerald-400 border border-emerald-500/10 p-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4" /> Publish Flash Offer
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Column 2 & 3: Recent Activity Lists */}
                        <div className="col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                          <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center justify-between">
                              <span>Active B2B Pipeline Transactions</span>
                              <button onClick={() => navigateTo("/admin/orders")} className="text-[10px] text-indigo-400 font-bold hover:underline">View All</button>
                            </h3>
                            {orders.length === 0 ? (
                              <p className="text-xs text-slate-500">No recent wholesale orders detected.</p>
                            ) : (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                {orders.slice(0, 3).map(o => {
                                  const orderPharmacy = pharmacies.find(ph => ph.id === o.pharmacyId);
                                  return (
                                    <div key={o.id} className="bg-slate-900/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between text-xs hover:border-slate-850 transition-all">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                          <ShoppingCart className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <p className="font-bold text-white text-xs">{o.id}</p>
                                          <p className="text-[10px] text-slate-500">{orderPharmacy?.pharmacyName || "Lazz Pharma (Dhanmondi)"}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-extrabold text-white">৳{o.totalAmount.toLocaleString()}</p>
                                        <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                          o.status === "Pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                          o.status === "Delivered" || o.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                          "bg-slate-800 text-slate-400 border border-slate-700/50"
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
                            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">Recent Pharmacy Enlistments</h3>
                            <div className="space-y-2">
                              {pharmacies.slice(0, 3).map(ph => (
                                <div key={ph.id} className="bg-slate-900/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                      <Store className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-white text-xs">{ph.pharmacyName}</p>
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
                    <div className="space-y-6 animate-fade-in">
                      {/* B2B Analytics Dashboard */}
                      <div className="grid grid-cols-3 gap-6">
                        {/* Revenue Over Time Chart */}
                        <div className="col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Historical Sales Revenue Stream</span>
                            <h3 className="text-sm font-black text-white mt-1">B2B Sales Trends (BDT ৳)</h3>
                          </div>
                          <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analyticsData?.revenueOverTime || [
                                { date: "07/10", amount: 154000 },
                                { date: "07/11", amount: 320000 },
                                { date: "07/12", amount: 284000 },
                                { date: "07/13", amount: 489000 },
                                { date: "07/14", amount: 531000 }
                              ]}>
                                <defs>
                                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "12px", fontSize: "11px" }}
                                  labelClassName="text-slate-500 font-bold"
                                />
                                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Order status allocation */}
                        <div className="col-span-1 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-1">Status Allocation</span>
                            <h3 className="text-sm font-black text-white">Pipeline Distribution</h3>
                          </div>
                          <div className="h-[220px] w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analyticsData?.orderStatusDistribution || [
                                    { name: "Pending", value: ordersPending },
                                    { name: "Processing", value: ordersProcessing },
                                    { name: "Completed", value: ordersCompleted },
                                    { name: "Cancelled", value: ordersCancelled }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={75}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  <Cell fill="#f59e0b" />
                                  <Cell fill="#6366f1" />
                                  <Cell fill="#10b981" />
                                  <Cell fill="#f43f5e" />
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "10px" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold border-t border-slate-900 pt-3">
                            <div className="flex items-center gap-1.5 text-amber-400">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending: {ordersPending}
                            </div>
                            <div className="flex items-center gap-1.5 text-indigo-400">
                              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Processing: {ordersProcessing}
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed: {ordersCompleted}
                            </div>
                            <div className="flex items-center gap-1.5 text-rose-400">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Cancelled: {ordersCancelled}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stock reserves by pharmaceutical company */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Manufacturer Reserves Radar</span>
                          <h3 className="text-sm font-black text-white">Stock Allocation by Pharmaceutical Manufacturer</h3>
                        </div>
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData?.companyStockAllocation || [
                              { name: "Square", stock: 15400 },
                              { name: "Incepta", stock: 12800 },
                              { name: "Beximco", stock: 9400 },
                              { name: "Opsonin", stock: 6700 },
                              { name: "Renata", stock: 4500 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: "11px" }}
                                cursor={{ fill: "#1e293b", opacity: 0.2 }}
                              />
                              <Bar dataKey="stock" fill="#10b981" radius={[4, 4, 0, 0]}>
                                <Cell fill="#10b981" />
                                <Cell fill="#06b6d4" />
                                <Cell fill="#6366f1" />
                                <Cell fill="#3b82f6" />
                                <Cell fill="#f59e0b" />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCREEN 2: MEDICINE PRODUCT CATALOG MANAGEMENT */}
              {activeRoute === "/admin/products" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Action Filters Panel */}
                  <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="relative flex-1 max-w-xs">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search global formulas..."
                          value={prodSearch}
                          onChange={(e) => setProdSearch(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>

                      <select
                        value={prodCategoryFilter}
                        onChange={(e) => setProdCategoryFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">All Categories</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Injection">Injection</option>
                        <option value="Cream">Cream</option>
                        <option value="Supplement">Supplement</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Filter Company..."
                        value={prodCompanyFilter}
                        onChange={(e) => setProdCompanyFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[150px]"
                      />
                    </div>

                    <button
                      onClick={handleOpenAddProduct}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                    >
                      <Plus className="w-4 h-4" /> Add Manual Medicine
                    </button>
                  </div>

                  {/* Bulk Import Section */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Bulk Medicine Catalog Import</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Upload wholesale medicine files supporting both .csv and .xlsx spreadsheets.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDownloadCSVTemplate}
                          className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> CSV Template
                        </button>
                        <button
                          onClick={handleDownloadExcelTemplate}
                          className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
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
                        dragActive ? "border-indigo-500 bg-indigo-500/5" : "border-slate-800 bg-slate-950/20 hover:border-slate-700"
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
                        <div className="p-3 bg-slate-900 rounded-full text-indigo-400">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Drag & Drop Catalog Spreadsheet, or <span className="text-indigo-400 hover:underline">Browse files</span></p>
                          <p className="text-[10px] text-slate-500 mt-1">Accepts official CSV template or Excel spreadsheets with column validation.</p>
                        </div>
                      </label>
                    </div>

                    {/* Column Mapping Wizard Step */}
                    {showMappingStep && (
                      <div className="mt-6 bg-slate-950 p-6 rounded-xl border border-indigo-500/30 space-y-4 animate-fade-in text-slate-200">
                        <div className="border-b border-slate-850 pb-3">
                          <span className="text-[9px] uppercase font-black text-indigo-400 tracking-wider">Excel Spreadsheet Column Mapping Wizard</span>
                          <h4 className="text-xs font-extrabold text-white mt-0.5">We auto-detected columns in your spreadsheet. Review and align headers with MediChain models:</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
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
                            <div key={field.key} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-900 text-xs">
                              <span className="font-semibold text-slate-300">
                                {field.label} {field.required && <span className="text-rose-500">*</span>}
                              </span>
                              <select
                                value={columnMapping[field.key] || ""}
                                onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer min-w-[140px]"
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
                            className="bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer"
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
                        <span className="text-xs font-semibold text-slate-400">Parsing and running validation dry-run on server...</span>
                      </div>
                    )}

                    {previewData && (
                      <div className="mt-6 bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Dry-Run Review Sheet</span>
                            <h4 className="text-xs font-bold text-white mt-0.5">Parsed file: {importedFile?.name}</h4>
                          </div>
                          <div className="flex gap-4 text-xs font-bold">
                            <span className="text-slate-400">Total Rows: {previewData.totalProcessed}</span>
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
                                <thead className="bg-slate-900 text-slate-400 sticky top-0">
                                  <tr>
                                    <th className="p-2 font-bold uppercase">Medicine Name</th>
                                    <th className="p-2 font-bold uppercase">Generic</th>
                                    <th className="p-2 font-bold uppercase">Mfg</th>
                                    <th className="p-2 font-bold uppercase">Price (৳)</th>
                                    <th className="p-2 font-bold uppercase">Batch</th>
                                    <th className="p-2 font-bold uppercase">Expiry</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850 text-slate-300">
                                  {previewData.importedProducts.map((p: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-900/40">
                                      <td className="p-2 font-semibold text-white">{p.name}</td>
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
                            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer transition-all"
                          >
                            Cancel Import
                          </button>
                          <button
                            onClick={handleConfirmImport}
                            disabled={previewData.successCount === 0}
                            className={`text-xs font-semibold py-2 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
                              previewData.successCount > 0 ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-slate-800 text-slate-500 cursor-not-allowed"
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
                          importHistory.map(hist => (
                            <div key={hist.id} className="bg-slate-900/40 border border-slate-900 p-2.5 rounded-lg flex items-center justify-between text-[11px]">
                              <div className="space-y-0.5 text-left">
                                <p className="font-extrabold text-slate-300 truncate max-w-[200px]">{hist.fileName}</p>
                                <p className="text-[9px] text-slate-500 font-bold">{new Date(hist.date).toLocaleString()} • by {hist.importedBy}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right text-[10px] font-bold">
                                  <span className="text-slate-400">Total: {hist.totalRows}</span> • <span className="text-emerald-400">Success: {hist.successCount}</span> • <span className="text-rose-400">Failed: {hist.failureCount}</span>
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
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                    <div className="max-h-[500px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-850 sticky top-0 z-10">
                          <tr>
                            <th className="p-4 font-bold">Formula / Brand</th>
                            <th className="p-4 font-bold">Category</th>
                            <th className="p-4 font-bold">Supplier Company</th>
                            <th className="p-4 font-bold">Strength & Pack</th>
                            <th className="p-4 font-bold text-right">MRP (৳)</th>
                            <th className="p-4 font-bold text-right">Trade Price (৳)</th>
                            <th className="p-4 font-bold text-right">Discount</th>
                            <th className="p-4 font-bold text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-slate-950/30">
                          {products
                            .filter(p => {
                              const matchesSearch = p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.genericName.toLowerCase().includes(prodSearch.toLowerCase());
                              const matchesCategory = !prodCategoryFilter || p.category === prodCategoryFilter;
                              const matchesCompany = !prodCompanyFilter || p.company.toLowerCase().includes(prodCompanyFilter.toLowerCase());
                              return matchesSearch && matchesCategory && matchesCompany;
                            })
                            .map(p => (
                              <tr key={p.id} className="hover:bg-slate-900/40 group">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-indigo-400 font-extrabold uppercase overflow-hidden">
                                      {p.imageUrl || p.image_url ? (
                                        <img src={p.imageUrl || p.image_url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        p.name.slice(0, 2)
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold text-white text-xs">{p.name}</p>
                                      <p className="text-[10px] text-slate-500 font-semibold">{p.genericName}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 font-semibold text-slate-400">{p.category}</td>
                                <td className="p-4 text-slate-400 truncate max-w-[150px]">{p.company}</td>
                                <td className="p-4 text-slate-400 font-medium">
                                  <span>{p.strength}</span>
                                  <span className="block text-[10px] text-slate-500">{p.packSize}</span>
                                </td>
                                <td className="p-4 text-right text-slate-400">৳{p.mrp.toFixed(2)}</td>
                                <td className="p-4 text-right font-bold text-white">৳{p.sellingPrice.toFixed(2)}</td>
                                <td className="p-4 text-right font-extrabold text-emerald-400">{p.discountPercentage}% OFF</td>
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleOpenEditProduct(p)}
                                      className="p-1.5 rounded bg-slate-900 hover:bg-slate-850 text-indigo-400 transition-all cursor-pointer"
                                      title="Edit Details"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(p.id)}
                                      className="p-1.5 rounded bg-slate-900 hover:bg-rose-500/15 text-rose-400 transition-all cursor-pointer"
                                      title="Delete Product"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 3: INVENTORY LOGISTICS DISPATCH */}
              {activeRoute === "/admin/inventory" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Filter Hub */}
                  <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm w-full">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search stock reserves..."
                        value={invSearch}
                        onChange={(e) => setInvSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={inventoryLowStockOnly}
                          onChange={(e) => setInventoryLowStockOnly(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                        />
                        <span>Low Stock Only (&lt; {lowStockThreshold})</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold uppercase">Expiry Range:</span>
                        <select
                          value={inventoryExpiryDaysRange}
                          onChange={(e: any) => setInventoryExpiryDaysRange(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                    <div className="max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-850 sticky top-0 z-10">
                          <tr>
                            <th className="p-4 font-bold">Medicine Brand</th>
                            <th className="p-4 font-bold">Wholesale Stock Status</th>
                            <th className="p-4 font-bold">Available Reserve Count</th>
                            <th className="p-4 font-bold">Batch Reference</th>
                            <th className="p-4 font-bold">Ledger Expiry Date</th>
                            <th className="p-4 font-bold text-center">Operation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-slate-950/30">
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
                            .map(p => {
                              const daysToExpiry = getDaysToExpiry(p.expiryDate);
                              const isEditing = editingInvId === p.id;
                              const isLow = p.availableStock < lowStockThreshold;

                              return (
                                <tr key={p.id} className="hover:bg-slate-900/40">
                                  <td className="p-4">
                                    <p className="font-bold text-white text-xs">{p.name}</p>
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
                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white max-w-[100px] font-bold"
                                      />
                                    ) : (
                                      <span className={isLow ? "text-amber-400" : "text-white"}>{p.availableStock.toLocaleString()} units</span>
                                    )}
                                  </td>
                                  <td className="p-4 font-mono text-slate-300">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editingInvBatch}
                                        onChange={(e) => setEditingInvBatch(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white max-w-[120px]"
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
                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                      />
                                    ) : (
                                      <span className={daysToExpiry <= 180 ? "text-amber-400" : "text-slate-400"}>
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
                                          className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded transition-all cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleStartEditInventory(p)}
                                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/30 text-indigo-400 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
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
                  <div className="grid grid-cols-3 gap-8">
                    {/* Orders List Pane */}
                    <div className="col-span-2 space-y-4">
                      {/* Search */}
                      <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search procurement order ID or invoice ID..."
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* List */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-3">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2">Orders Ledger Pipeline</h3>
                        
                        {orders.length === 0 ? (
                          <p className="text-xs text-slate-500">No matching wholesale pipeline orders found.</p>
                        ) : (
                          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                            {orders
                              .filter(o => o.id.toLowerCase().includes(orderSearch.toLowerCase()) || o.pharmacyId.toLowerCase().includes(orderSearch.toLowerCase()))
                              .map(o => {
                                const isSelected = selectedOrderDetails?.id === o.id;
                                const orderPharmacy = pharmacies.find(ph => ph.id === o.pharmacyId);
                                return (
                                  <div
                                    key={o.id}
                                    onClick={() => setSelectedOrderDetails(o)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                                      isSelected ? "border-indigo-500 bg-indigo-500/5 shadow" : "border-slate-900 bg-slate-950 hover:border-slate-850"
                                    }`}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className={`p-2.5 rounded-lg ${
                                        o.status === "Pending" ? "bg-amber-500/10 text-amber-400" :
                                        o.status === "Delivered" || o.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" :
                                        "bg-slate-800 text-slate-400"
                                      }`}>
                                        <ShoppingCart className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="font-extrabold text-white text-xs">{o.id}</p>
                                          <span className="text-[10px] text-slate-500 font-bold">•</span>
                                          <p className="text-[10px] text-slate-400 font-bold">{new Date(o.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{orderPharmacy?.pharmacyName || "Lazz Pharma"}</p>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <p className="font-black text-white text-xs">৳{o.totalAmount.toLocaleString()}</p>
                                      <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full block mt-1 w-max ml-auto ${
                                        o.status === "Pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                        o.status === "Delivered" || o.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                        o.status === "Cancelled" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                                        "bg-slate-800 text-slate-400 border border-slate-700/50"
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
                    <div className="col-span-1">
                      {selectedOrderDetails ? (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in">
                          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Active Workspace Sheet</span>
                              <h4 className="text-xs font-black text-white mt-0.5">{selectedOrderDetails.id}</h4>
                            </div>
                            <button
                              onClick={() => setSelectedOrderDetails(null)}
                              className="p-1 rounded hover:bg-slate-850 text-slate-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Pharmacy Info Block */}
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">Buyer Enlistment Info</span>
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900 text-xs text-slate-300">
                              <p className="font-extrabold text-white text-xs">Lazz Pharma (Dhanmondi)</p>
                              <p className="text-[10px] text-slate-400 mt-1">Owner: Zahid Hasan</p>
                              <p className="text-[10px] text-slate-400">Phone: 01712345678</p>
                              <p className="text-[10px] text-slate-400">Address: House 42, Road 9A, Dhanmondi</p>
                              <p className="text-[10px] text-slate-400">License No: DC-PH-2025-1194</p>
                            </div>
                          </div>

                          {/* Items Purchased List */}
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">Wholesale Manifest items</span>
                            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                              {selectedOrderDetails.items?.map((item, idx) => (
                                <div key={idx} className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900 text-xs flex justify-between items-center">
                                  <div>
                                    <p className="font-bold text-white">{item.name}</p>
                                    <p className="text-[9px] text-slate-500">{item.strength} • {item.packSize}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-slate-300">{item.quantity} Qty</p>
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
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                        <div className="bg-slate-950/20 border border-slate-850 border-dashed rounded-2xl p-8 text-center text-slate-500 text-xs">
                          Select a wholesale order from the pipeline to review inventory manifests and update delivery routing.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 5: B2B PHARMACY REGISTRY */}
              {activeRoute === "/admin/pharmacies" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-3 gap-8">
                    {/* Pharmacies list */}
                    <div className="col-span-2 space-y-4">
                      {/* Search */}
                      <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-3">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search registered pharmacies by name, license, or address..."
                            value={pharmacySearch}
                            onChange={(e) => setPharmacySearch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase mr-1 tracking-wider">Verification Filter:</span>
                          {(["All", "Pending", "Verified", "Suspended"] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => setPharmacySearchStatus(status)}
                              className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-md border transition-all cursor-pointer ${
                                pharmacySearchStatus === status
                                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                                  : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Registry cards */}
                      <div className="grid grid-cols-2 gap-4">
                        {pharmacies
                          .filter(ph => 
                            ph.pharmacyName.toLowerCase().includes(pharmacySearch.toLowerCase()) || 
                            ph.licenseNo.toLowerCase().includes(pharmacySearch.toLowerCase()) ||
                            ph.city.toLowerCase().includes(pharmacySearch.toLowerCase())
                          )
                          .filter(ph => pharmacySearchStatus === "All" || (ph.status || "Pending") === pharmacySearchStatus)
                          .map(ph => {
                            const isSelected = selectedPharmacyProfile?.id === ph.id;
                            return (
                              <div
                                key={ph.id}
                                onClick={() => setSelectedPharmacyProfile(ph)}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                                  isSelected ? "border-indigo-500 bg-indigo-500/5 shadow-lg" : "border-slate-800 bg-slate-950 hover:border-slate-700"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                                    <Store className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs font-black text-white">{ph.pharmacyName}</h4>
                                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                        ph.status === "Verified" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                                        ph.status === "Suspended" ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" :
                                        "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                      }`}>
                                        {ph.status || "Pending"}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold">{ph.city}</p>
                                  </div>
                                </div>

                                <div className="text-[11px] text-slate-400 space-y-1">
                                  <p className="truncate"><span className="text-slate-500 font-bold">Address:</span> {ph.address}</p>
                                  <p><span className="text-slate-500 font-bold">License:</span> {ph.licenseNo}</p>
                                </div>

                                <div className="border-t border-slate-900 pt-3 flex items-center justify-between">
                                  <span className="text-[9px] uppercase font-extrabold text-indigo-400 tracking-wider">Credit Account Limit:</span>
                                  <span className="text-xs font-black text-white">৳{ph.creditLimit.toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Pharmacy profile drill down */}
                    <div className="col-span-1">
                      {selectedPharmacyProfile ? (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in">
                          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Licensed Registry Profile</span>
                              <h4 className="text-xs font-black text-white mt-0.5">{selectedPharmacyProfile.pharmacyName}</h4>
                            </div>
                            <button
                              onClick={() => setSelectedPharmacyProfile(null)}
                              className="p-1 rounded hover:bg-slate-850 text-slate-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Verification Workflow */}
                          <div className="space-y-2 text-xs text-slate-300">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">Account Verification Status</span>
                            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-900 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 font-semibold">Verification Badge:</span>
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  selectedPharmacyProfile.status === "Verified" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  selectedPharmacyProfile.status === "Suspended" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                  "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}>
                                  {selectedPharmacyProfile.status || "Pending"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {selectedPharmacyProfile.status !== "Verified" && (
                                  <button
                                    onClick={() => handleUpdatePharmacyStatus(selectedPharmacyProfile.id, "Verified")}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wide transition-all cursor-pointer shadow"
                                  >
                                    Approve & Verify
                                  </button>
                                )}
                                {selectedPharmacyProfile.status !== "Suspended" && (
                                  <button
                                    onClick={() => handleUpdatePharmacyStatus(selectedPharmacyProfile.id, "Suspended")}
                                    className="flex-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wide transition-all border border-rose-500/20 cursor-pointer"
                                  >
                                    Suspend Acc.
                                  </button>
                                )}
                                {selectedPharmacyProfile.status === "Suspended" && (
                                  <button
                                    onClick={() => handleUpdatePharmacyStatus(selectedPharmacyProfile.id, "Pending")}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wide transition-all cursor-pointer"
                                  >
                                    Set Pending
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Owners info */}
                          <div className="space-y-2 text-xs text-slate-300">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">Account Owners Details</span>
                            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-900 space-y-1.5">
                              <p><span className="text-slate-500 font-bold">Authorized Owner Name:</span> {selectedPharmacyProfile.ownerName}</p>
                              <p><span className="text-slate-500 font-bold">Registered Mobile No:</span> {selectedPharmacyProfile.phone}</p>
                              <p><span className="text-slate-500 font-bold">Geographic Sector:</span> {selectedPharmacyProfile.city}</p>
                              <p><span className="text-slate-500 font-bold">Drug Administration License:</span> {selectedPharmacyProfile.licenseNo}</p>
                            </div>
                          </div>

                          {/* Credit Account Ledger */}
                          <div className="space-y-2 text-xs text-slate-300">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">Credit Ledger Status</span>
                            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-900 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Total Credit bounds:</span>
                                <span className="font-bold text-white">৳{selectedPharmacyProfile.creditLimit.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500 font-semibold">Used Accounts Balance:</span>
                                <span className="font-bold text-rose-400">৳{selectedPharmacyProfile.usedCredit.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-850 pt-2 font-bold">
                                <span className="text-slate-500">Unused Credit availability:</span>
                                <span className="text-emerald-400">৳{selectedPharmacyProfile.availableCredit.toLocaleString()}</span>
                              </div>
                              
                              <div className="border-t border-slate-800 pt-3 mt-1.5 space-y-2">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Adjust Credit Limit</span>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    placeholder="Enter new limit in ৳"
                                    value={creditAdjustmentLimit}
                                    onChange={(e) => setCreditAdjustmentLimit(e.target.value)}
                                    className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                                  />
                                  <button
                                    onClick={() => handleAdjustPharmacyCredit(selectedPharmacyProfile.id, creditAdjustmentLimit)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shadow-md uppercase tracking-wide"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Historical Orders list */}
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block">Pharmacy Procurement Transactions ({
                              orders.filter(o => o.pharmacyId === selectedPharmacyProfile.id).length
                            })</span>
                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                              {orders
                                .filter(o => o.pharmacyId === selectedPharmacyProfile.id)
                                .map(o => (
                                  <div key={o.id} className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900 text-[11px] flex justify-between items-center">
                                    <div>
                                      <p className="font-bold text-white">{o.id}</p>
                                      <p className="text-[9px] text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-extrabold text-white">৳{o.totalAmount.toLocaleString()}</p>
                                      <span className="text-[8px] text-indigo-400 font-bold">{o.status}</span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-950/20 border border-slate-850 border-dashed rounded-2xl p-8 text-center text-slate-500 text-xs">
                          Select a pharmacy from the registry grid to audit drug authorization credentials, credit accounts ledger, and purchase logs.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 6: ALERTS BROADCAST RADAR */}
              {activeRoute === "/admin/notifications" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-3 gap-8">
                    {/* Left: Compose Form */}
                    <div className="col-span-1 bg-slate-950/60 border border-slate-800 rounded-2xl p-6">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4">Compose Broadcast System Alert</h3>
                      <form onSubmit={handleBroadcastAlert} className="space-y-4 text-xs">
                        <div className="space-y-1">
                          <label className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Notification Title</label>
                          <input
                            type="text"
                            placeholder="e.g., Incepta Stock Restock Alert"
                            value={broadcastTitle}
                            onChange={(e) => setBroadcastTitle(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Notification Channel Category</label>
                          <select
                            value={broadcastType}
                            onChange={(e) => setBroadcastType(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="system">Standard System Update</option>
                            <option value="offer">Special Flash Wholesale Offer</option>
                            <option value="price_drop">Platform Price Cut Enactment</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Broadcasting Alert Message Content</label>
                          <textarea
                            placeholder="Provide details about the catalog restocks, pricing, or system events..."
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            rows={5}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                        >
                          <Bell className="w-4 h-4" /> Dispatch System Broadcast
                        </button>
                      </form>
                    </div>

                    {/* Right: Broadcast Logs */}
                    <div className="col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">System Alerts Dispatch Logs</h3>
                      
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {notifications.map(notif => (
                          <div key={notif.id} className="bg-slate-900/60 border border-slate-900 p-4 rounded-xl text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                  notif.type === "offer" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  notif.type === "price_drop" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                                  "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                }`}>
                                  {notif.type}
                                </span>
                                <h4 className="font-extrabold text-white text-xs">{notif.title}</h4>
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold">{new Date(notif.date || Date.now()).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">{notif.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN: FINANCE & CREDIT ACCOUNTING */}
              {activeRoute === "/admin/finance" && (
                <div className="space-y-6 animate-fade-in text-slate-200">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-6">
                    <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Credit Limits Authorized</p>
                      <h3 className="text-xl font-black text-white">৳{financeSummary?.totalCreditLimit?.toLocaleString() || "0"}</h3>
                      <p className="text-[9px] text-slate-400">Aggregated credit caps across registry</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Outstanding Balances (Receivables)</p>
                      <h3 className="text-xl font-black text-rose-400">৳{financeSummary?.totalOutstanding?.toLocaleString() || "0"}</h3>
                      <p className="text-[9px] text-slate-400">Aggregated credit balances currently utilized</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Aggregated Available Credit</p>
                      <h3 className="text-xl font-black text-emerald-400">৳{financeSummary?.totalAvailableCredit?.toLocaleString() || "0"}</h3>
                      <p className="text-[9px] text-slate-400 font-medium text-emerald-500/80">Liquidity safety headroom buffer</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-2">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Revenue Paid</p>
                      <h3 className="text-xl font-black text-indigo-400">৳{financeSummary?.totalPaidAmount?.toLocaleString() || "0"}</h3>
                      <p className="text-[9px] text-slate-400">Aggregated invoice payouts recorded</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    {/* Left 2 cols: Pharmacy Credit Accounts */}
                    <div className="col-span-2 space-y-4">
                      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-white uppercase tracking-wider">B2B Pharmacy Credit Registers</h3>
                          <div className="relative w-64">
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search pharmacy accounts..."
                              value={financeSearch}
                              onChange={(e) => setFinanceSearch(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-8 pr-3 text-[11px] font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>

                        <div className="overflow-x-auto border border-slate-900 rounded-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-900 text-slate-400 uppercase text-[9px] font-extrabold tracking-wider border-b border-slate-850">
                                <th className="px-4 py-3">Pharmacy</th>
                                <th className="px-4 py-3 text-right">Credit Bound</th>
                                <th className="px-4 py-3 text-right">Used Credit</th>
                                <th className="px-4 py-3 text-right">Available Limit</th>
                                <th className="px-4 py-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850 bg-slate-950/40">
                              {pharmacies
                                .filter(ph => ph.pharmacyName.toLowerCase().includes(financeSearch.toLowerCase()))
                                .map(ph => (
                                  <tr key={ph.id} className="hover:bg-slate-900/40 transition-colors">
                                    <td className="px-4 py-3">
                                      <p className="font-extrabold text-white">{ph.pharmacyName}</p>
                                      <p className="text-[10px] text-slate-500 font-bold">{ph.city}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-white">
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
                    <div className="col-span-1 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Payment Transaction History</h3>
                      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                        {paymentLedger.length === 0 ? (
                          <div className="text-center p-8 text-slate-500 text-xs border border-slate-900 border-dashed rounded-xl">
                            No ledger receipts or transactions logged yet.
                          </div>
                        ) : (
                          paymentLedger.map((pay, idx) => (
                            <div key={idx} className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-white text-[11px]">{pay.pharmacyName}</span>
                                <span className="text-emerald-400 font-bold">৳{pay.amountPaid?.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span>Ref: {pay.orderId}</span>
                                <span>Method: <span className="text-slate-300 font-semibold">{pay.paymentMethod}</span></span>
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

              {/* SCREEN: AUDIT TRANSACTION LOGS */}
              {activeRoute === "/admin/audit-logs" && (
                <div className="space-y-6 animate-fade-in text-slate-200">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                    {/* Filters bar */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Security & Transaction Audit Ledger</h3>
                        <p className="text-[10px] text-slate-500 font-bold">Real-time trails tracking administrative & catalog changes</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={auditFilterModule}
                          onChange={(e) => setAuditFilterModule(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">All Modules</option>
                          <option value="Products">Products Catalog</option>
                          <option value="Pharmacies">Pharmacies Registry</option>
                          <option value="Orders">Orders Log</option>
                          <option value="Finance">Finance & Credit</option>
                        </select>

                        <div className="relative w-64">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search by action, user..."
                            value={auditSearch}
                            onChange={(e) => setAuditSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto border border-slate-900 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 uppercase text-[9px] font-extrabold tracking-wider border-b border-slate-850">
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Affected Module</th>
                            <th className="px-4 py-3">Action Completed</th>
                            <th className="px-4 py-3 text-right">Record ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-slate-950/40">
                          {auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center p-8 text-slate-500 text-xs">
                                No security audit logs or events captured on platform yet.
                              </td>
                            </tr>
                          ) : (
                            auditLogs
                              .filter(log => {
                                const matchSearch = (log.user || "").toLowerCase().includes(auditSearch.toLowerCase()) || 
                                                    (log.action || "").toLowerCase().includes(auditSearch.toLowerCase());
                                const matchModule = !auditFilterModule || log.affectedModule === auditFilterModule;
                                return matchSearch && matchModule;
                              })
                              .map(log => (
                                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                                  <td className="px-4 py-3 font-mono text-[10px] text-indigo-400 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 font-extrabold text-white">
                                    {log.user}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                      {log.role}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-400 border border-indigo-900/30">
                                      {log.affectedModule}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-300 font-semibold leading-relaxed">
                                    {log.action}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-500">
                                    {log.recordId}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 7: SYSTEM PLATFORM SCHEMAS */}
              {activeRoute === "/admin/settings" && (
                <div className="space-y-6 max-w-xl animate-fade-in">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2">B2B Platform Operations Profile</h3>
                    
                    <div className="text-xs space-y-3.5 text-slate-300">
                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1">Platform Instance Node ID</span>
                        <p className="font-mono bg-slate-900 px-3 py-2 rounded-lg border border-slate-850 text-slate-400">c2e94b69-4bca-494d-b42f-f8adefd8426f</p>
                      </div>

                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1">Ledger Database State Storage</span>
                        <p className="font-mono bg-slate-900 px-3 py-2 rounded-lg border border-slate-850 text-slate-400">db-store.json (In-Memory synchronized file system)</p>
                      </div>

                      <div>
                        <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-1">Authorization Credentials RBAC Bounds</span>
                        <p className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-850 text-slate-400">
                          Authorized Admin Account: <span className="font-bold text-white font-mono">admin@medichain.com</span> <br />
                          Required authorization level: <span className="text-indigo-400 font-bold font-mono">Role == "Admin"</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Backup & Export Tools Panel */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">State Management & Snapshots</span>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider mt-1">Backup & Export Ledger Tools</h3>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Generate high-fidelity snapshots of the MediChain wholesale ledger. Download compiled lists of verified catalog products in high-precision Excel format or structural JSON database dumps.
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleExportData("excel")}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
                      >
                        <FileText className="w-4 h-4" /> Export as Excel (.xlsx)
                      </button>

                      <button
                        onClick={() => handleExportData("json")}
                        className="flex-1 bg-slate-900 hover:bg-slate-850 text-white border border-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
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
                            <div key={item.id || index} className="bg-slate-900/60 p-3 rounded-xl border border-slate-900 flex justify-between items-center text-[11px]">
                              <div>
                                <p className="font-extrabold text-white text-xs">{item.type}</p>
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
            </>
          )}
        </div>
      </main>

      {/* --- FLOATING DETAILED MEDICINE ADJUSTMENTS DIALOG --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Catalog Schema Sheet</span>
                <h4 className="text-sm font-black text-white mt-0.5">
                  {selectedProductForEdit ? `Edit Product: ${selectedProductForEdit.name}` : "Add Manual Medicine Product"}
                </h4>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1 rounded hover:bg-slate-800 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Napa Extra"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Generic Formula *</label>
                  <input
                    type="text"
                    placeholder="e.g., Paracetamol + Caffeine"
                    value={formGeneric}
                    onChange={(e) => setFormGeneric(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Supplier Manufacturer Company *</label>
                  <input
                    type="text"
                    placeholder="e.g., Beximco Pharmaceuticals"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Classification Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    required
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Cream">Cream</option>
                    <option value="Supplement">Supplement</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Strength (e.g. 500mg) *</label>
                  <input
                    type="text"
                    placeholder="e.g., 500mg + 65mg"
                    value={formStrength}
                    onChange={(e) => setFormStrength(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Pack Size (e.g. 100's Box) *</label>
                  <input
                    type="text"
                    placeholder="e.g., 240's Box"
                    value={formPackSize}
                    onChange={(e) => setFormPackSize(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Wholesale MRP (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 480.00"
                    value={formMrp}
                    onChange={(e) => setFormMrp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">MediChain Trade Selling Price (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 360.00"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Initial Reserves Stock *</label>
                  <input
                    type="number"
                    placeholder="e.g., 1000"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Batch Code Reference *</label>
                  <input
                    type="text"
                    placeholder="e.g., B-NPE92"
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block uppercase text-[9px]">Expiration Date *</label>
                  <input
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block uppercase text-[9px]">Medicine Image URL</label>
                <input
                  type="url"
                  placeholder="e.g., https://example.com/images/napa.png"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {selectedProductForEdit && (
                <div className="border-t border-slate-800 pt-5 space-y-3">
                  <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Medicine Price History Trail
                  </h5>
                  {priceHistory.filter(h => h.productId === selectedProductForEdit.id).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No price adjustments have been registered for this medicine yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {priceHistory.filter(h => h.productId === selectedProductForEdit.id).map((h, i) => (
                        <div key={i} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 flex justify-between items-center text-[10px] text-slate-400">
                          <div>
                            <p className="text-slate-300 font-semibold">
                              MRP: <span className="font-mono text-slate-500 line-through">৳{h.oldMrp}</span> → <span className="font-mono font-bold text-emerald-400">৳{h.newMrp}</span> | 
                              Selling Price: <span className="font-mono text-slate-500 line-through">৳{h.oldSellingPrice}</span> → <span className="font-mono font-bold text-indigo-400">৳{h.newSellingPrice}</span>
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">Changed by {h.changedByAdmin} on {new Date(h.changedDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-slate-800 pt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer transition-all shadow-lg"
                >
                  Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
