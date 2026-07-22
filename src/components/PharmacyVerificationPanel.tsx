import React, { useState } from "react";
import { 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  FileText, 
  Phone, 
  MapPin, 
  Calendar, 
  CircleDollarSign, 
  Eye, 
  Sparkles,
  RefreshCw,
  X
} from "lucide-react";
import { Pharmacy } from "../types";

interface PharmacyVerificationPanelProps {
  pharmacies: Pharmacy[];
  onPharmacyUpdated?: () => void;
}

export default function PharmacyVerificationPanel({
  pharmacies,
  onPharmacyUpdated
}: PharmacyVerificationPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Verified" | "Suspended">("All");
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [creditLimitInput, setCreditLimitInput] = useState<string>("50000");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const filteredPharmacies = pharmacies.filter((p) => {
    const matchesSearch =
      p.pharmacyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.licenseNo && p.licenseNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.phone && p.phone.includes(searchQuery));

    const isVerified = p.verificationStatus === "Approved" || (p as any).status === "Verified" || (p as any).isVerified;
    const isSuspended = p.verificationStatus === "Suspended" || (p as any).status === "Suspended";
    const isPending = !isVerified && !isSuspended;

    const matchesStatus =
      statusFilter === "All"
        ? true
        : statusFilter === "Pending"
        ? isPending
        : statusFilter === "Verified"
        ? isVerified
        : isSuspended;

    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (pharmacyId: string, status: "Verified" | "Suspended" | "Pending", creditLimit?: number) => {
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const res = await fetch(`/api/admin/pharmacies/${pharmacyId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          isVerified: status === "Verified",
          creditLimit: creditLimit || 50000,
          rejectionReason: status === "Suspended" ? rejectionReason : undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update pharmacy verification status.");
      }

      setActionSuccess(`Pharmacy status successfully updated to ${status}.`);
      setSelectedPharmacy(null);
      if (onPharmacyUpdated) {
        onPharmacyUpdated();
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to update pharmacy status.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight">Pharmacy Compliance & Verification Hub</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Validate DGDA drug license credentials, assign wholesale credit lines, and verify B2B accounts across Bangladesh.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/10">
            <span className="block text-xs text-slate-300">Pending Review</span>
            <span className="text-lg font-bold text-amber-400">
              {pharmacies.filter((p) => p.verificationStatus !== "Approved" && p.verificationStatus !== "Suspended" && (p as any).status !== "Verified").length}
            </span>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl text-center border border-white/10">
            <span className="block text-xs text-slate-300">Verified Partners</span>
            <span className="text-lg font-bold text-emerald-400">
              {pharmacies.filter((p) => p.verificationStatus === "Approved" || (p as any).status === "Verified" || (p as any).isVerified).length}
            </span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess("")} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError("")} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Pharmacy Name, Owner or License #..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {(["All", "Pending", "Verified", "Suspended"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? "bg-teal-700 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "Pending" ? "Pending Approval" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Pharmacy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPharmacies.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No pharmacies found matching your filter.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          filteredPharmacies.map((pharm) => {
            const isVerified = pharm.verificationStatus === "Approved" || (pharm as any).status === "Verified" || (pharm as any).isVerified;
            const isSuspended = pharm.verificationStatus === "Suspended" || (pharm as any).status === "Suspended";
            const isPending = !isVerified && !isSuspended;

            return (
              <div
                key={pharm.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{pharm.pharmacyName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {pharm.ownerName || "Proprietor"}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        isVerified
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : isPending
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {isVerified ? "Verified" : isPending ? "Pending DGDA" : "Suspended"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Drug License:</span>
                      <span className="font-mono font-semibold text-slate-800">{pharm.licenseNo || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Contact Mobile:</span>
                      <span className="font-semibold text-slate-800">{pharm.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Address / City:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {pharm.address || pharm.city || "Dhaka"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-400">Approved Credit:</span>
                      <span className="font-bold text-emerald-700">
                        ৳{(pharm.creditLimit || 50000).toLocaleString()} BDT
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedPharmacy(pharm);
                      setCreditLimitInput((pharm.creditLimit || 50000).toString());
                    }}
                    className="flex-1 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    Inspect Credentials
                  </button>

                  {isPending && (
                    <button
                      onClick={() => handleUpdateStatus(pharm.id, "Verified", 50000)}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Quick Approve"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Verification Inspection Modal */}
      {selectedPharmacy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{selectedPharmacy.pharmacyName}</h3>
                <p className="text-xs text-teal-200">DGDA Compliance & Credit Approval Inspection</p>
              </div>
              <button
                onClick={() => setSelectedPharmacy(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">Proprietor Name</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedPharmacy.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">DGDA License Number</span>
                  <span className="font-mono font-bold text-teal-800 text-sm">{selectedPharmacy.licenseNo || "Pending"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Contact Number</span>
                  <span className="font-semibold text-slate-800">{selectedPharmacy.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Current Status</span>
                  <span className="font-bold text-amber-700">{selectedPharmacy.status || "Pending"}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned B2B Credit Limit (BDT ৳)</label>
                <input
                  type="number"
                  value={creditLimitInput}
                  onChange={(e) => setCreditLimitInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Default credit line for pharmacy procurement orders is ৳50,000 BDT.
                </p>
              </div>

              {selectedPharmacy.status !== "Suspended" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rejection or Suspension Reason (Optional)</label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide reason if rejecting or suspending this pharmacy..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedPharmacy(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium cursor-pointer"
              >
                Close
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(selectedPharmacy.id, "Suspended")}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Reject / Suspend
              </button>

              <button
                disabled={actionLoading}
                onClick={() =>
                  handleUpdateStatus(selectedPharmacy.id, "Verified", parseFloat(creditLimitInput) || 50000)
                }
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Grant Credit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
