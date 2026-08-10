import React, { useState, useEffect } from "react";
import { Play, Pause, Square, RefreshCw, Download, Settings, AlertCircle, Database, CheckCircle2, ChevronDown, Cpu, Activity, Info, Link, Cloud } from "lucide-react";
import * as XLSX from "xlsx";
import { EnrichmentState, EnrichmentConfig } from "../lib/aiEnrichmentService";

export default function AIEnrichmentPanel() {
  const [state, setState] = useState<EnrichmentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [config, setConfig] = useState<EnrichmentConfig>({
    batchSize: 50,
    delayMs: 2000,
    concurrencyLimit: 5,
    dryRun: false,
    autoRetry: true,
    overwriteExisting: false,
    filters: {
      missingType: "both",
      manufacturer: "",
      generic: "",
      category: "",
      brand: ""
    }
  });

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/enrichment/status");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchStatus();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: "start" | "pause" | "resume" | "stop" | "retry") => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/enrichment/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "start" ? JSON.stringify(config) : undefined
      });
      if (res.ok) fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = (type: "csv" | "json" | "summary") => {
    if (!state) return;
    
    if (type === "json") {
      const blob = new Blob([JSON.stringify(state.logs, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai-enrichment-logs-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (type === "csv") {
      const ws = XLSX.utils.json_to_sheet(state.logs);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Logs");
      XLSX.writeFile(wb, `ai-enrichment-logs-${Date.now()}.xlsx`);
    } else if (type === "summary") {
      const summary = {
        totalProducts: state.totalProducts,
        completed: state.completedCount,
        updated: state.updatedCount,
        skipped: state.skippedCount,
        needsReview: state.needsReviewCount,
        failed: state.failedCount,
      };
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai-enrichment-summary-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!state) {
    return <div className="p-8 flex items-center justify-center text-slate-500"><RefreshCw className="animate-spin mr-2" /> Loading System State...</div>;
  }

  const isRunning = state.status === "running";
  const isPaused = state.status === "paused";
  const isIdle = state.status === "idle" || state.status === "stopped";

  const progressPercentage = state.totalProducts > 0 
    ? Math.round((state.completedCount / state.totalProducts) * 100) 
    : 0;

  const formatTime = (sec: number) => {
    if (sec <= 0) return "00:00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-32 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Cpu className="w-8 h-8 text-indigo-500" />
            AI Product Enrichment System
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Automated intelligence to resolve missing medicine MRPs and catalog images.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <div className="px-4 py-2 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Engine Status</span>
            <span className={`text-sm font-bold ${isRunning ? "text-emerald-400" : isPaused ? "text-amber-400" : "text-slate-700"}`}>
              {state.status.toUpperCase()}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
          <div className="px-4 py-2 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Memory</span>
            <span className="text-sm font-bold text-slate-700">{state.memoryUsage}</span>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
          <div className="px-4 py-2 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Model</span>
            <span className="text-sm font-bold text-indigo-400 truncate max-w-[150px]">{state.currentAiModel}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Controls & Filters */}
        <div className="space-y-6">
          <div className="bg-white/60 border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" /> Configuration
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Target Scope</label>
                <select 
                  disabled={!isIdle}
                  value={config.filters.missingType}
                  onChange={(e) => setConfig({...config, filters: {...config.filters, missingType: e.target.value as any}})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 transition-colors disabled:opacity-50"
                >
                  <option value="both">Both Missing (MRP & Image)</option>
                  <option value="mrp">Only Missing MRP</option>
                  <option value="image">Only Missing Image</option>
                  <option value="all">All Products</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Manufacturer Filter</label>
                  <input 
                    type="text"
                    disabled={!isIdle}
                    value={config.filters.manufacturer}
                    onChange={(e) => setConfig({...config, filters: {...config.filters, manufacturer: e.target.value}})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 transition-colors disabled:opacity-50"
                    placeholder="e.g. Beximco"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Category Filter</label>
                  <input 
                    type="text"
                    disabled={!isIdle}
                    value={config.filters.category}
                    onChange={(e) => setConfig({...config, filters: {...config.filters, category: e.target.value}})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 transition-colors disabled:opacity-50"
                    placeholder="e.g. Tablet"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-850">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 flex items-center gap-1"><Cloud className="w-3 h-3"/> Concurrency</label>
                  <input 
                    type="number"
                    disabled={!isIdle}
                    value={config.concurrencyLimit}
                    onChange={(e) => setConfig({...config, concurrencyLimit: parseInt(e.target.value) || 1})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 transition-colors disabled:opacity-50"
                    min="1" max="20"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Delay (ms)</label>
                  <input 
                    type="number"
                    disabled={!isIdle}
                    value={config.delayMs}
                    onChange={(e) => setConfig({...config, delayMs: parseInt(e.target.value) || 100})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 transition-colors disabled:opacity-50"
                    min="0" step="500"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-850">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={config.dryRun} disabled={!isIdle} onChange={(e) => setConfig({...config, dryRun: e.target.checked})} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${config.dryRun ? 'bg-indigo-500' : 'bg-slate-200 group-hover:bg-slate-700'} ${!isIdle && 'opacity-50'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.dryRun ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700">Dry Run Mode</span>
                    <p className="text-[10px] text-slate-500">Run search & AI without saving to database.</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={config.overwriteExisting} disabled={!isIdle} onChange={(e) => setConfig({...config, overwriteExisting: e.target.checked})} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${config.overwriteExisting ? 'bg-rose-500' : 'bg-slate-200 group-hover:bg-slate-700'} ${!isIdle && 'opacity-50'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${config.overwriteExisting ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-300">Overwrite Existing</span>
                    <p className="text-[10px] text-rose-500/70">DANGER: Replaces current MRP and images.</p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col gap-3">
              {isIdle && (
                <button 
                  onClick={() => handleAction("start")}
                  disabled={actionLoading === "start"}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-70 disabled:active:scale-100 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {actionLoading === "start" ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />} Start Processing
                </button>
              )}
              {isRunning && (
                <button 
                  onClick={() => handleAction("pause")}
                  disabled={actionLoading === "pause"}
                  className="w-full bg-amber-600 hover:bg-amber-500 active:scale-95 disabled:opacity-70 disabled:active:scale-100 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {actionLoading === "pause" ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Pause className="w-5 h-5 fill-current" />} Pause Processing
                </button>
              )}
              {isPaused && (
                <button 
                  onClick={() => handleAction("resume")}
                  disabled={actionLoading === "resume"}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-70 disabled:active:scale-100 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {actionLoading === "resume" ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />} Resume
                </button>
              )}
              {!isIdle && (
                <button 
                  onClick={() => handleAction("stop")}
                  disabled={actionLoading === "stop"}
                  className="w-full bg-rose-950 hover:bg-rose-900 active:scale-95 disabled:opacity-70 disabled:active:scale-100 disabled:cursor-not-allowed text-rose-400 font-bold py-3 px-4 rounded-xl text-sm border border-rose-900 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {actionLoading === "stop" ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5 fill-current" />} Stop Completely
                </button>
              )}
              
              <button 
                onClick={() => handleAction("retry")}
                disabled={state.failedCount === 0 || isRunning || actionLoading === "retry"}
                className="w-full bg-slate-200 hover:bg-slate-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${actionLoading === "retry" ? "animate-spin" : ""}`} /> Retry Failed Items ({state.failedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Center & Right Column: Progress & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/60 border border-slate-200 rounded-2xl p-6 relative overflow-hidden">
            {isRunning && (
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-200">
                <div className="h-full bg-indigo-500 animate-pulse" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            )}
            
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Total Progress</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{progressPercentage}%</span>
                  <span className="text-sm font-bold text-slate-500">({state.completedCount} / {state.totalProducts})</span>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Time Remaining</h3>
                <span className="text-xl font-mono text-indigo-400">{formatTime(state.estimatedRemainingTime)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Updated</span>
                <span className="text-xl font-black text-emerald-400">{state.updatedCount}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Skipped</span>
                <span className="text-xl font-black text-slate-700">{state.skippedCount}</span>
              </div>
              <div className="bg-slate-50 border border-amber-900/30 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <span className="text-[10px] uppercase font-bold text-amber-500 block mb-1">Needs Review</span>
                <span className="text-xl font-black text-amber-400">{state.needsReviewCount}</span>
              </div>
              <div className="bg-slate-50 border border-rose-900/30 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                <span className="text-[10px] uppercase font-bold text-rose-500 block mb-1">Failed</span>
                <span className="text-xl font-black text-rose-400">{state.failedCount}</span>
              </div>
            </div>
          </div>

          {/* Current Activity Box */}
          <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30">
                <Activity className={`w-5 h-5 text-indigo-400 ${isRunning ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <h4 className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-0.5">Currently Processing</h4>
                <p className="text-sm font-bold text-slate-900 max-w-[200px] sm:max-w-md truncate">
                  {isRunning ? (state.currentProduct || "Initializing Batch...") : "Idle"}
                </p>
              </div>
            </div>
            <div className="text-right">
               <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">Batch #</span>
               <span className="text-lg font-mono text-slate-700">{state.currentBatch}</span>
            </div>
          </div>

          {/* Live Activity Log */}
          <div className="bg-white/60 border border-slate-200 rounded-2xl flex flex-col h-[400px]">
            <div className="border-b border-slate-200 px-5 py-3 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-500" /> Live Activity Log
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => handleExport("csv")} className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-200 hover:bg-slate-700 rounded-lg transition-colors title='Export to Excel'"><Download className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
              {state.logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">System waiting for initial ignition sequence.</div>
              ) : (
                state.logs.map((log, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    log.status === "success" ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-300" :
                    log.status === "error" ? "bg-rose-950/20 border-rose-900/30 text-rose-300" :
                    log.status === "needs_review" ? "bg-amber-950/20 border-amber-900/30 text-amber-300" :
                    "bg-slate-50/50 border-slate-200 text-slate-500"
                  }`}>
                    <div className="flex justify-between items-start mb-1 gap-4">
                      <div className="flex items-center gap-2 truncate">
                        <span className="opacity-50 text-[10px] shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="font-bold truncate">{log.productName}</span>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                        log.status === "success" ? "bg-emerald-500/20 text-emerald-400" :
                        log.status === "error" ? "bg-rose-500/20 text-rose-400" :
                        log.status === "needs_review" ? "bg-amber-500/20 text-amber-400" :
                        "bg-slate-200 text-slate-500"
                      }`}>{log.action}</span>
                    </div>
                    <p className="opacity-80 line-clamp-2">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
