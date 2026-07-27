import React, { useState, useRef } from "react";
import { Upload, Scan, Loader2, FileImage, X, Check, ShoppingCart, Info, Search } from "lucide-react";
import { prescriptionService, ScannedMedicine } from "../services/prescription";
import { orderService } from "../services/order";

export default function PrescriptionScanner({ onClose }: { onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScannedMedicine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setImage(base64);
      setResults(null);
      setError(null);
      handleScan(base64);
    };
    reader.onerror = () => setError("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const handleScan = async (base64: string) => {
    setScanning(true);
    setError(null);
    try {
      const response = await prescriptionService.scanPrescription(base64);
      if (response.success && response.items) {
        setResults(response.items);
      } else {
        setError("Optical scanning completed but returned no recognizable items.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with optical scanning engine.");
    } finally {
      setScanning(false);
    }
  };

  const handleAddToCart = async (matchedProductId: string, quantity: number) => {
    setAddingToCart((prev) => ({ ...prev, [matchedProductId]: true }));
    try {
      await orderService.addToCart(matchedProductId, quantity);
      alert("Added to cart successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to add to cart.");
    } finally {
      setAddingToCart((prev) => ({ ...prev, [matchedProductId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Scan className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">AI Prescription Scanner</h2>
              <p className="text-xs font-medium text-slate-500">Powered by Google Gemini</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {!image && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-indigo-600" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-700">Upload Prescription Photo</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">Scan handwritten or printed medical prescriptions to auto-fill your cart.</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload}
                accept="image/jpeg, image/png, image/webp" 
                className="hidden" 
              />
            </div>
          )}

          {image && (
            <div className="flex flex-col gap-6">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner max-h-64 flex justify-center">
                <img src={image} alt="Uploaded prescription" className="max-h-64 object-contain" />
                <button 
                  onClick={() => { setImage(null); setResults(null); }}
                  className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {scanning && (
                  <div className="absolute inset-0 bg-indigo-900/20 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-10 h-10 animate-spin mb-3" />
                    <span className="font-bold tracking-wide drop-shadow-md">AI Optical Engine Processing...</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                  <Info className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-red-800">Scan Failed</h4>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {results && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-500" />
                    Extraction Results ({results.length} items found)
                  </h3>
                  
                  <div className="space-y-3">
                    {results.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 truncate">{item.extractedName}</h4>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                            {item.extractedStrength && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{item.extractedStrength}</span>}
                            <span>Qty: {item.extractedQuantity}</span>
                          </div>
                        </div>

                        {item.matchedProduct ? (
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs font-bold text-emerald-600">Match Found</p>
                              <p className="text-[10px] text-slate-500">{item.matchedProduct.company}</p>
                            </div>
                            <button
                              onClick={() => handleAddToCart(item.matchedProduct!.id, item.extractedQuantity)}
                              disabled={addingToCart[item.matchedProduct!.id]}
                              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                              {addingToCart[item.matchedProduct!.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                              Add
                            </button>
                          </div>
                        ) : (
                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-bold">
                              <Search className="w-3.5 h-3.5" />
                              Not in Catalog
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
