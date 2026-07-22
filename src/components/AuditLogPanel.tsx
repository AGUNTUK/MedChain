import React, { useState } from "react";
import { 
  FileText, 
  Search, 
  Download, 
  Filter, 
  ShieldCheck, 
  ShieldAlert, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  Database
} from "lucide-react";
import * as XLSX from "xlsx";

interface AuditLogPanelProps {
  auditLogs?: any[];
  onRefresh?: () => void;
}

export default function AuditLogPanel({
  auditLogs = [],
  onRefresh
}: AuditLogPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("All");

  // Fallback demo audit entries if server logs are fresh
  const displayLogs = auditLogs.length > 0 ? auditLogs : [
    {
      id: "LOG-1092",
      timestamp: new Date().toISOString(),
      operator: "Admin Compliance Team",
      action: "PHARMACY_VERIFIED",
      module: "Pharmacy Verification",
      referenceId: "#PHARM-8042",
      details: "Approved DGDA Drug License #DL-DHAKA-10294. Assigned ৳50,000 credit line.",
      status: "Success",
      ipAddress: "103.114.172.10"
    },
    {
      id: "LOG-1091",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      operator: "System Automated Dispatch",
      action: "ORDER_DISPATCHED",
      module: "Order Processing",
      referenceId: "#ORD-1042",
      details: "Dispatched order via Dhaka Express Depot. Courier Tracking #MCH-4921.",
      status: "Success",
      ipAddress: "127.0.0.1"
    },
    {
      id: "LOG-1090",
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      operator: "Inventory Manager",
      action: "PRICE_ADJUSTMENT",
      module: "Inventory & Pricing",
      referenceId: "#PROD-201",
      details: "Updated wholesale box price for Napa Extra 500mg (৳120 -> ৳110).",
      status: "Warning",
      ipAddress: "103.114.172.15"
    }
  ];

  const filteredLogs = displayLogs.filter((log) => {
    const matchesSearch =
      (log.operator && log.operator.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.referenceId && log.referenceId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesModule = selectedModule === "All" || log.module === selectedModule;

    return matchesSearch && matchesModule;
  });

  const handleExportCSV = () => {
    const exportData = filteredLogs.map((log) => ({
      "Log Ref ID": log.id,
      Timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString("en-GB") : "",
      Operator: log.operator || "",
      Module: log.module || "",
      Action: log.action || "",
      "Reference Tag": log.referenceId || "",
      Details: log.details || "",
      Status: log.status || "Success",
      "IP Address": log.ipAddress || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Trail");
    XLSX.writeFile(workbook, `MediChain_Audit_Logs_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-teal-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-teal-400" />
            <h2 className="text-xl font-bold tracking-tight">System Operational Audit & Compliance Ledger</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Real-time immutable compliance logs tracking administrative edits, pharmacy verifications, order dispatches, and pricing updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              Refresh Logs
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Audit Trail (Excel)
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by operator, action or ref ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Module:
          </span>
          {["All", "Pharmacy Verification", "Order Processing", "Inventory & Pricing"].map((mod) => (
            <button
              key={mod}
              onClick={() => setSelectedModule(mod)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedModule === mod
                  ? "bg-slate-900 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Timestamp & Ref</th>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Module & Action</th>
                <th className="py-3.5 px-4">Operation Details</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-600">No matching audit logs found.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-800">{log.referenceId || log.id}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {log.timestamp ? new Date(log.timestamp).toLocaleString("en-GB") : "Just now"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        {log.operator || "System"}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{log.ipAddress || "103.114.172.10"}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] block w-fit mb-1">
                        {log.module || "General"}
                      </span>
                      <span className="font-mono font-bold text-teal-800 text-[11px]">{log.action}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 leading-relaxed max-w-xs">
                      {log.details}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          log.status === "Success"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.status === "Warning"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {log.status || "Success"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
