import React, { useState } from "react";
import MediChainLogo from "./MediChainLogo";
import { motion } from "motion/react";
import { ArrowLeft, Building2, User, Phone, MapPin, FileSpreadsheet, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { profileService } from "../services";

interface ProfileSetupProps {
  phone: string;
  onSetupComplete: () => void;
  onBack?: () => void;
}

export default function ProfileSetup({ phone, onSetupComplete, onBack }: ProfileSetupProps) {
  const [pharmacyName, setPharmacyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState(phone && !phone.includes("@") ? phone : "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [licenseNo, setLicenseNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyName || !ownerName || !ownerPhone || !address || !city || !licenseNo) {
      setError("Please complete all registration fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await profileService.updatePharmacyProfile({
        pharmacyName,
        ownerName,
        phone: ownerPhone,
        address,
        city,
        licenseNo
      });
      onSetupComplete();
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between p-6 select-none relative overflow-y-auto">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 p-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-100 transition-colors cursor-pointer z-50 shadow-sm"
          title="Go Back"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
      )}

      {/* Header */}
      <div className="flex flex-col items-center mt-3">
        <MediChainLogo size="sm" withText={false} />
        <h2 className="text-base font-extrabold text-brand-charcoal mt-2">Pharmacy Profile Setup</h2>
        <p className="text-[10px] text-slate-500 mt-0.5">Please provide your official B2B trade credentials</p>
      </div>

      <motion.form
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit}
        className="space-y-3.5 my-auto py-4"
      >
        {error && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pharmacy Name */}
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Pharmacy Brand / Shop Name *
          </label>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-brand-purple transition-all">
            <Building2 className="text-slate-400 w-4 h-4 mr-2" />
            <input
              type="text"
              placeholder="e.g. Lazz Pharma (Dhanmondi)"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              className="w-full outline-none text-slate-800 text-xs font-semibold bg-transparent"
              required
            />
          </div>
        </div>

        {/* Owner Name */}
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Registered Owner Name *
          </label>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-brand-purple transition-all">
            <User className="text-slate-400 w-4 h-4 mr-2" />
            <input
              type="text"
              placeholder="e.g. Zahid Hasan"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full outline-none text-slate-800 text-xs font-semibold bg-transparent"
              required
            />
          </div>
        </div>

        {/* Phone (Editable) */}
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Owner Contact Phone *
          </label>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-brand-purple transition-all">
            <Phone className="text-slate-400 w-4 h-4 mr-2" />
            <input
              type="tel"
              placeholder="e.g. 01712345678"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              className="w-full outline-none text-slate-800 text-xs font-semibold bg-transparent"
              required
            />
          </div>
        </div>

        {/* Trade License */}
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Drug License / Registration No *
          </label>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-brand-purple transition-all">
            <FileSpreadsheet className="text-slate-400 w-4 h-4 mr-2" />
            <input
              type="text"
              placeholder="e.g. DC-PH-2026-XXXX"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              className="w-full outline-none text-slate-800 text-xs font-semibold bg-transparent"
              required
            />
          </div>
        </div>

        {/* City and Address */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              City *
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-2.5">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full outline-none text-slate-800 text-xs font-bold bg-transparent"
              >
                <option value="Dhaka">Dhaka</option>
                <option value="Chittagong">Chittagong</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Rajshahi">Rajshahi</option>
                <option value="Khulna">Khulna</option>
              </select>
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Store Address *
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-brand-purple transition-all">
              <MapPin className="text-slate-400 w-4 h-4 mr-2" />
              <input
                type="text"
                placeholder="Road / Shop number"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full outline-none text-slate-800 text-xs font-semibold bg-transparent"
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-lime hover:bg-brand-lime-dark text-slate-900 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-lime/20 transition-all cursor-pointer disabled:opacity-50 mt-4"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Confirm & Request Credit Line
              <Sparkles className="w-4 h-4 text-brand-purple animate-pulse" />
            </>
          )}
        </button>
      </motion.form>

      <div className="text-center text-[9px] text-slate-400 mt-2">
        By registering, you confirm that your pharmacy license is legally active. MediChain verifies documents with the DGDA and grants a credit limit up to ৳1,500,000 instantly.
      </div>
    </div>
  );
}
