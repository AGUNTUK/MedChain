import React, { useState, useEffect, useRef } from "react";
import {
  X,
  UploadCloud,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCw,
  Tag,
  DollarSign,
  Package,
  Calendar,
  Layers,
  Building2,
  Sparkles,
  Link as LinkIcon,
  Trash2
} from "lucide-react";
import { Product } from "../types";

interface ProductEditModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Partial<Product>) => Promise<void> | void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState<Product["category"]>("Tablet");
  const [strength, setStrength] = useState("");
  const [packSize, setPackSize] = useState("");
  const [mrp, setMrp] = useState<number | "">("");
  const [sellingPrice, setSellingPrice] = useState<number | "">("");
  const [availableStock, setAvailableStock] = useState<number | "">("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Drag & Drop / Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setGenericName(product.genericName || "");
      setCompany(product.company || "");
      setCategory(product.category || "Tablet");
      setStrength(product.strength || "");
      setPackSize(product.packSize || "");
      setMrp(product.mrp ?? "");
      setSellingPrice(product.sellingPrice ?? "");
      setAvailableStock(product.availableStock ?? 100);
      setBatchNumber(product.batchNumber || "");
      setExpiryDate(product.expiryDate || "");
      setImageUrl(product.imageUrl || product.image_url || "");
      setUploadSuccess(!!(product.imageUrl || product.image_url));
    } else {
      setName("");
      setGenericName("");
      setCompany("");
      setCategory("Tablet");
      setStrength("");
      setPackSize("100's Box");
      setMrp("");
      setSellingPrice("");
      setAvailableStock(500);
      setBatchNumber(`BN-${new Date().getFullYear()}-X`);
      setExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
      setImageUrl("");
      setUploadSuccess(false);
    }
    setErrorMessage("");
  }, [product, isOpen]);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload a valid image file (PNG, JPG, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image size must be under 5MB");
      return;
    }

    setErrorMessage("");
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageUrl(result);
      setIsUploading(false);
      setUploadSuccess(true);
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read image file");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClearImage = () => {
    setImageUrl("");
    setUploadSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Product name is required");
      return;
    }

    const numMrp = typeof mrp === "number" ? mrp : parseFloat(mrp as string) || 0;
    const numSelling = typeof sellingPrice === "number" ? sellingPrice : parseFloat(sellingPrice as string) || 0;
    const numStock = typeof availableStock === "number" ? availableStock : parseInt(availableStock as string) || 0;

    const discountPercentage = numMrp > 0 ? Math.round(((numMrp - numSelling) / numMrp) * 100) : 0;

    const updatedData: Partial<Product> = {
      ...(product ? { id: product.id } : {}),
      name: name.trim(),
      genericName: genericName.trim(),
      company: company.trim(),
      category,
      strength: strength.trim(),
      packSize: packSize.trim() || "1 Box",
      mrp: numMrp,
      sellingPrice: numSelling,
      discountPercentage: discountPercentage > 0 ? discountPercentage : 0,
      availableStock: numStock,
      batchNumber: batchNumber.trim() || "BN-2026-X",
      expiryDate: expiryDate || new Date().toISOString().split("T")[0],
      imageUrl: imageUrl.trim(),
      image_url: imageUrl.trim(),
    };

    try {
      setIsSaving(true);
      await onSave(updatedData);
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMessage(err.message || "Failed to save product");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Product Catalog Management
            </span>
            <h3 className="text-lg font-black text-white mt-0.5">
              {product ? `Edit Product: ${product.name}` : "Add New Medicine Product"}
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* DRAG AND DROP PHOTO UPLOADER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                Product Image & Media (Drag & Drop)
              </label>
              {imageUrl && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Image Linked
                </span>
              )}
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] ${
                isDragging
                  ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                  : imageUrl
                  ? "border-emerald-500/40 bg-slate-950/80 hover:border-emerald-500/70"
                  : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-2 py-4 text-emerald-400">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-bold">Processing Image...</span>
                </div>
              ) : imageUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full p-1" onClick={(e) => e.stopPropagation()}>
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 shadow-md flex items-center justify-center p-1">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                      onError={() => {
                        setUploadSuccess(false);
                      }}
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 truncate">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Image Ready & Previewing
                      </span>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 break-all bg-slate-900/90 p-2 rounded-lg border border-slate-800 font-mono">
                      {imageUrl.startsWith("data:") ? "Base64 Data Image Loaded" : imageUrl}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Replace Image File
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      Drag & Drop photo here, or <span className="text-emerald-400 underline">browse file</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Supports PNG, JPG, WEBP (Max 5MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Image URL input option */}
            <div className="pt-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <LinkIcon className="w-3.5 h-3.5" />
                </div>
                <input
                  type="url"
                  placeholder="Or paste direct image URL (e.g., https://example.com/medicine.png)..."
                  value={imageUrl.startsWith("data:") ? "" : imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setUploadSuccess(!!e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* BASIC PRODUCT INFORMATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Product Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Napa Extra"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Generic Formula *
              </label>
              <input
                type="text"
                placeholder="e.g., Paracetamol + Caffeine"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Manufacturer / Supplier Company *
              </label>
              <input
                type="text"
                placeholder="e.g., Beximco Pharmaceuticals Ltd."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Classification Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                required
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Cream">Cream</option>
                <option value="Supplement">Supplement</option>
                <option value="Medical Device">Medical Device</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Strength (e.g., 500mg)
              </label>
              <input
                type="text"
                placeholder="e.g., 500mg + 65mg"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Pack Size / Packaging *
              </label>
              <input
                type="text"
                placeholder="e.g., 240's Box / 10's Strip"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* PRICING & STOCK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Wholesale MRP (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g., 480.00"
                value={mrp}
                onChange={(e) => setMrp(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-emerald-400 font-bold block uppercase text-[10px]">
                Trade Price (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g., 360.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl py-2 px-3 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono font-black"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Available Stock (Box) *
              </label>
              <input
                type="number"
                placeholder="e.g., 500"
                value={availableStock}
                onChange={(e) => setAvailableStock(e.target.value === "" ? "" : parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          {/* BATCH & EXPIRY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Batch Code Reference *
              </label>
              <input
                type="text"
                placeholder="e.g., BN-2026-X"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold block uppercase text-[10px]">
                Expiration Date *
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2.5 px-5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save to Catalog</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductEditModal;
