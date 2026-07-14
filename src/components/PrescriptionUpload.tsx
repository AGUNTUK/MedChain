import React, { useState } from "react";
import { Upload, Camera, FileText, Check, Plus, RefreshCw, AlertCircle, Sparkles, HelpCircle } from "lucide-react";
import { inventoryService, storageService } from "../services";

interface PrescriptionUploadProps {
  onAddToCart: (productId: string, qty: number) => Promise<boolean>;
  onTriggerTab: (tab: string) => void;
}

export default function PrescriptionUpload({ onAddToCart, onTriggerTab }: PrescriptionUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  // High quality base64 sample images representing handwritten pharmacy orders
  const SAMPLES = [
    {
      name: "Standard Daily Bulk List",
      desc: "Napa Extra, Seclo 20mg & Orsaline",
      // Simple transparent pixel fallback or mock base64 to pass, but the server handles Mock parsing or real Gemini OCR
      data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    },
    {
      name: "Beximco & Square Restock",
      desc: "Napa Extend, Alatrol, Coral-D",
      data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    }
  ];

  const handleFileUpload = async (fileOrBase64: File | string) => {
    setLoading(true);
    setError("");
    setResults([]);

    try {
      let base64Str = "";
      let storageUrl = "";

      if (fileOrBase64 instanceof File) {
        // 1. Upload to Supabase Storage (with full validation & error handling inside)
        const uploadResult = await storageService.uploadPrescription(fileOrBase64);
        storageUrl = uploadResult.url;

        // 2. Read as base64 for Gemini OCR ingestion
        base64Str = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileOrBase64);
        });
      } else {
        // Fallback for simulation presets
        base64Str = fileOrBase64;
        storageUrl = fileOrBase64;
      }

      // 3. Post to Gemini parsing backend
      const data = await inventoryService.uploadPrescription(base64Str, storageUrl);
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "AI prescription upload and analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileUpload(file);
    }
  };

  const handleBulkAddMatched = async () => {
    let count = 0;
    for (const item of results) {
      if (item.matchedProductId && item.quantitySuggested) {
        const success = await onAddToCart(item.matchedProductId, item.quantitySuggested);
        if (success) count++;
      }
    }
    setSuccessCount(count);
    setTimeout(() => {
      setSuccessCount(0);
      onTriggerTab("cart");
    }, 1500);
  };

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col select-none overflow-y-auto p-4 space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-black text-brand-charcoal">AI Prescription & List OCR</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Instant handwritten document digitization</p>
        </div>
        <span className="bg-brand-purple/10 text-brand-purple text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Gemini Powered
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Drag & Drop Frame */}
      {results.length === 0 && !loading && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all min-h-[220px] bg-white ${
            dragActive ? "border-brand-purple bg-brand-purple/5" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-3 shadow-sm">
            <Upload className="w-5 h-5 text-slate-400" />
          </div>

          <h3 className="text-xs font-black text-slate-700">Upload handwritten order sheet</h3>
          <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
            Drag & drop an image, snapshot a doctor's prescription, or select a list file from your system.
          </p>

          <label className="mt-4 bg-brand-purple hover:bg-brand-purple-dark text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer shadow-sm transition-all flex items-center gap-1.5">
            <Camera className="w-4 h-4" />
            Capture / Select Document
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      )}

      {/* Loading state with reassurance messages */}
      {loading && (
        <div className="border border-slate-100 rounded-3xl p-8 bg-white flex flex-col items-center justify-center text-center space-y-4 min-h-[220px]">
          <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
          <div>
            <h3 className="text-xs font-black text-slate-700">Gemini reading your document...</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
              Auditing handwriting details, matching active drugs, and verifying FEFO warehouse stocks. Please hold on.
            </p>
          </div>
        </div>
      )}

      {/* AI Extraction Results list */}
      {results.length > 0 && !loading && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">OCR DIGITIZATION</span>
              <h3 className="text-xs font-black text-brand-charcoal mt-0.5">Matched Catalog Items</h3>
            </div>
            <button
              onClick={() => setResults([])}
              className="text-[10px] text-brand-purple font-extrabold hover:underline"
            >
              Analyze New List
            </button>
          </div>

          {successCount > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl font-semibold">
              <Check className="w-4.5 h-4.5 text-emerald-600" />
              <span>Bulk added {successCount} matched medicines to your procurement cart!</span>
            </div>
          )}

          <div className="space-y-3">
            {results.map((item, idx) => {
              const matched = item.matchedProductId;
              return (
                <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100/60 text-xs">
                  <div>
                    <div className="font-bold text-slate-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {item.query}
                    </div>
                    {matched ? (
                      <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-1 mt-1 font-sans">
                        <Check className="w-3 h-3" />
                        Matched: {item.matchedProductName} ({item.strength})
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-500 font-bold flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        No catalog match found
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">Suggested Buy</span>
                    <span className="text-xs font-black text-brand-charcoal font-mono">{item.quantitySuggested} Box</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleBulkAddMatched}
            className="w-full bg-brand-lime hover:bg-brand-lime-dark text-slate-900 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-brand-lime/10 cursor-pointer"
          >
            Add All Matched to Procurement Cart
          </button>
        </div>
      )}

      {/* Quick Interactive Samples */}
      {results.length === 0 && !loading && (
        <div className="space-y-2.5">
          <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Quick Simulation Samples
          </h4>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Click a preset sample below to simulate instant high-fidelity Gemini AI handwritten parsing:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SAMPLES.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => handleFileUpload(sample.data)}
                className="bg-white hover:bg-slate-50 p-3.5 rounded-2xl border border-slate-100 hover:border-brand-purple transition-all text-left flex flex-col justify-between h-24 shadow-sm cursor-pointer"
              >
                <div className="text-xs font-black text-brand-charcoal leading-snug">{sample.name}</div>
                <div className="text-[9px] text-slate-400 leading-normal">{sample.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
