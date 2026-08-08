import React from "react";
import { 
  Building2, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  FileText, 
  Phone, 
  MapPin, 
  AlertCircle 
} from "lucide-react";
import MediChainLogo from "./MediChainLogo";
import { Pharmacy } from "../types";

interface PharmacyPendingScreenProps {
  pharmacy: Pharmacy | null;
  onRefreshStatus: () => void;
  onLogout: () => void;
  loading?: boolean;
}

export default function PharmacyPendingScreen({
  pharmacy,
  onRefreshStatus,
  onLogout,
  loading = false
}: PharmacyPendingScreenProps) {
  const isSuspended = pharmacy?.verificationStatus === "Suspended" || pharmacy?.verificationStatus === "Rejected";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-slate-850 border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 space-y-6">
        {/* Header Logo */}
        <div className="flex justify-center">
          <MediChainLogo size="md" />
        </div>

        {/* Status Badge & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border shadow-inner">
            {isSuspended ? (
              <span className="bg-rose-500/20 text-rose-300 border-rose-500/30 flex items-center gap-1.5 px-3 py-1 rounded-full">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Account Suspended
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1.5 px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Pending Admin Review
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            {isSuspended
              ? "Account Access Suspended"
              : "Your Account is Pending Admin Approval"}
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            {isSuspended
              ? pharmacy?.verificationNotes ||
                "Your pharmacy verification account has been suspended or rejected. Please contact support or upload updated DGDA licensing documents to restore procurement privileges."
              : "Thank you for completing your pharmacy onboarding. Our regulatory compliance team is currently reviewing your DGDA Drug License credentials. You will receive B2B procurement access as soon as verification completes."}
          </p>
        </div>

        {/* Pharmacy Profile Summary Card */}
        {pharmacy && (
          <div className="bg-slate-900/80 border border-slate-750 p-4 sm:p-5 rounded-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Business Name</span>
              <span className="font-bold text-white text-right">{pharmacy.pharmacyName}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Proprietor / Owner</span>
              <span className="font-semibold text-slate-200 text-right">{pharmacy.ownerName || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">DGDA Drug License</span>
              <span className="font-mono font-bold text-teal-400 text-right">{pharmacy.licenseNo || "Pending Submission"}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Contact Phone</span>
              <span className="font-semibold text-slate-200 text-right">{pharmacy.phone || "N/A"}</span>
            </div>

            <div className="flex items-start justify-between">
              <span className="text-slate-400 font-medium">Delivery Address</span>
              <span className="font-medium text-slate-300 text-right max-w-[200px] truncate">
                {pharmacy.address || pharmacy.city || "Dhaka"}
              </span>
            </div>
          </div>
        )}

        {/* Next Steps Info Box */}
        <div className="bg-teal-950/40 border border-teal-800/40 rounded-2xl p-4 text-xs text-teal-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-teal-300">Need Urgent Procurement Access?</p>
            <p className="text-[11px] text-teal-200/80 leading-relaxed">
              For expedited compliance verification, contact our DGDA licensing desk at{" "}
              <span className="font-mono text-white">support@medichain.bd</span> or call{" "}
              <span className="font-mono text-white">+880 1712-345678</span>.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={onRefreshStatus}
            disabled={loading}
            className="w-full sm:flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Check Verification Status</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full sm:w-auto py-3 px-5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
