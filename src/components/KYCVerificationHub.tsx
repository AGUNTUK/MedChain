import React, { useState } from "react";
import { X, Check, Camera, Upload, Shield, CreditCard, Award, FileText, CheckCircle2, Clock, AlertTriangle, ChevronRight, HelpCircle, FileCheck } from "lucide-react";
import { Pharmacy } from "../types";
import { profileService } from "../services/profile";

interface KYCVerificationHubProps {
  pharmacy: Pharmacy | null;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function KYCVerificationHub({ pharmacy, onClose, onSaveSuccess }: KYCVerificationHubProps) {
  // Current step in the submission wizard
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // NID State
  const [nidNumber, setNidNumber] = useState(pharmacy?.nidNumber || "");
  const [nidOwnerName, setNidOwnerName] = useState(pharmacy?.nidOwnerName || "");
  const [dob, setDob] = useState(pharmacy?.dob || "");
  const [nidFrontUrl, setNidFrontUrl] = useState(pharmacy?.nidFrontUrl || "");
  const [nidBackUrl, setNidBackUrl] = useState(pharmacy?.nidBackUrl || "");

  // License State
  const [licenseNo, setLicenseNo] = useState(pharmacy?.licenseNo || "");
  const [drugLicenseExpiry, setDrugLicenseExpiry] = useState(pharmacy?.drugLicenseExpiry || "");
  const [drugLicenseUrl, setDrugLicenseUrl] = useState(pharmacy?.drugLicenseUrl || "");
  const [tradeLicenseNo, setTradeLicenseNo] = useState(pharmacy?.tradeLicenseNo || "");

  // Interactive Camera Simulators
  const [activeCameraField, setActiveCameraField] = useState<string | null>(null);

  // Drag and Drop simulation active
  const [dragField, setDragField] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragField(fieldName);
    } else if (e.type === "dragleave") {
      setDragField(null);
    }
  };

  const handleDrop = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragField(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPhotoFile(e.dataTransfer.files[0], fieldName);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      processPhotoFile(e.target.files[0], fieldName);
    }
  };

  const processPhotoFile = (file: File, fieldName: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFieldUrl(fieldName, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const setFieldUrl = (fieldName: string, url: string) => {
    if (fieldName === "nidFront") setNidFrontUrl(url);
    if (fieldName === "nidBack") setNidBackUrl(url);
    if (fieldName === "drugLicense") setDrugLicenseUrl(url);
  };

  const handleCameraSnap = (fieldName: string) => {
    setActiveCameraField(fieldName);
  };

  const triggerCameraSnapMock = (fieldName: string) => {
    // Generate lovely distinct colored high-fidelity template cards for snapping
    let mockUrl = "";
    if (fieldName === "nidFront") {
      mockUrl = "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80";
    } else if (fieldName === "nidBack") {
      mockUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80";
    } else {
      mockUrl = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=500&q=80";
    }
    setFieldUrl(fieldName, mockUrl);
    setActiveCameraField(null);
  };

  const validateNid = () => {
    if (!nidNumber || (nidNumber.length !== 10 && nidNumber.length !== 17)) {
      setError("National ID must be exactly 10 or 17 digits.");
      return false;
    }
    if (!/^\d+$/.test(nidNumber)) {
      setError("National ID must contain numbers only.");
      return false;
    }
    if (!nidOwnerName.trim()) {
      setError("NID Owner Name printed on the card is required.");
      return false;
    }
    if (!dob) {
      setError("Date of Birth is required.");
      return false;
    }
    if (!nidFrontUrl) {
      setError("Please upload NID Front Side Photo.");
      return false;
    }
    if (!nidBackUrl) {
      setError("Please upload NID Back Side Photo.");
      return false;
    }
    setError("");
    return true;
  };

  const validateLicense = () => {
    if (!licenseNo.trim()) {
      setError("Drug License Number is required.");
      return false;
    }
    if (!drugLicenseExpiry) {
      setError("Drug License Expiry Date is required.");
      return false;
    }
    if (!drugLicenseUrl) {
      setError("Please upload drug license document/photo.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmitKyc = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload: Partial<Pharmacy> = {
        nidNumber,
        nidOwnerName,
        dob,
        nidFrontUrl,
        nidBackUrl,
        licenseNo,
        drugLicenseExpiry,
        drugLicenseUrl,
        tradeLicenseNo,
        verificationStatus: "Pending" // Set to Pending review on submission
      };

      await profileService.updatePharmacyProfile(payload);
      setSuccess("KYC Verification submitted successfully!");
      setStep(3); // Go to final review step
      onSaveSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to submit KYC verification documents.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDevApproval = async (status: "Approved" | "Pending") => {
    setLoading(true);
    setError("");
    try {
      await profileService.updatePharmacyProfile({
        verificationStatus: status,
        licenseNo: licenseNo || "DC-PH-55992"
      });
      setSuccess(`Account status updated to ${status === "Approved" ? "Verified" : "Pending Approval"}.`);
      onSaveSuccess();
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed simulation.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = () => {
    const status = pharmacy?.verificationStatus || "Pending";
    if (status === "Approved") {
      return {
        label: "Verified Pharmacy",
        color: "bg-emerald-500",
        bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
        icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
        desc: "Congratulations! Your pharmacy accounts are fully verified. You have full access to wholesale B2B credit terms and DGDA license procurement options."
      };
    }
    if (status === "Pending" || status === "Under Review") {
      return {
        label: "Pending Verification",
        color: "bg-amber-500",
        bg: "bg-amber-50 border-amber-200 text-amber-800",
        icon: <Clock className="w-8 h-8 text-amber-500 animate-pulse" />,
        desc: "Our team is actively verifying your drug license and NID details. This secure compliance check takes up to 24 hours to approve."
      };
    }
    return {
      label: "Verification Required",
      color: "bg-rose-500",
      bg: "bg-rose-50 border-rose-200 text-rose-800",
      icon: <AlertTriangle className="w-8 h-8 text-rose-500" />,
      desc: "To access B2B drug supply credit lines, DGDA compliance, and corporate wholesale pricing, please complete national ID and drug license verification."
    };
  };

  const currentStatus = getStatusDisplay();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-purple/10 border border-brand-purple/20 rounded-xl">
              <Award className="w-5 h-5 text-brand-lime" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight text-white">KYC Compliance & Verification Hub</h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono">B2B Drug Trade Regulatory Controls</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Status card */}
        <div className={`p-4 mx-5 mt-4 rounded-2xl border ${currentStatus.bg} flex items-start gap-4`}>
          <div className="mt-1 flex-shrink-0">{currentStatus.icon}</div>
          <div className="flex-1 text-xs">
            <div className="font-black uppercase tracking-wider text-[10px] text-slate-500">Current Compliance State</div>
            <div className="font-extrabold text-slate-850 text-sm mt-0.5">{currentStatus.label}</div>
            <p className="mt-1 leading-relaxed text-[11px] font-semibold text-slate-600">{currentStatus.desc}</p>
          </div>
        </div>

        {/* Steps Progress Indicator (Only show if not already approved) */}
        {pharmacy?.verificationStatus !== "Approved" && (
          <div className="px-5 pt-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step >= 1 ? "bg-brand-purple text-white" : "bg-slate-200 text-slate-400"
                }`}>1</span>
                <span className={`text-[10px] font-extrabold ${step === 1 ? "text-brand-purple" : "text-slate-400"}`}>National ID</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step >= 2 ? "bg-brand-purple text-white" : "bg-slate-200 text-slate-400"
                }`}>2</span>
                <span className={`text-[10px] font-extrabold ${step === 2 ? "text-brand-purple" : "text-slate-400"}`}>Drug License</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step >= 3 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                }`}>3</span>
                <span className={`text-[10px] font-extrabold ${step === 3 ? "text-emerald-500" : "text-slate-400"}`}>Review State</span>
              </div>
            </div>
          </div>
        )}

        {/* Main interactive workflow form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-2xl font-black flex items-center gap-2 animate-pulse">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {/* Verification screens */}
          {pharmacy?.verificationStatus === "Approved" ? (
            <div className="space-y-4 py-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <FileCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-base font-black text-slate-800">DGDA Compliant B2B Account</h4>
                <p className="text-xs text-slate-400 font-semibold font-mono">License State: DC-PHARMACY-VERIFIED</p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium pt-2">
                  All systems operating securely. This verified status enables ৳100,000 credit limits, custom multi-box discounts, and priority same-day depot distributions.
                </p>
              </div>

              {/* Reset to simulate verification flow */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => handleSimulateDevApproval("Pending")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                >
                  Reset Status to Pending Approval
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: NID Verification */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4.5 h-4.5 text-brand-purple" />
                      Section A: National ID Card (NID) verification
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Please provide authentic Bangladeshi national ID card details</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">NID Number (10 or 17 digits)</label>
                      <input
                        type="text"
                        maxLength={17}
                        value={nidNumber}
                        onChange={(e) => setNidNumber(e.target.value)}
                        className="w-full bg-slate-50 focus:bg-white text-xs text-slate-800 font-bold p-2.5 rounded-xl border border-slate-200 outline-none transition-all focus:border-brand-purple"
                        placeholder="e.g. 1990261722000002"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">NID Owner Name (As Printed)</label>
                      <input
                        type="text"
                        value={nidOwnerName}
                        onChange={(e) => setNidOwnerName(e.target.value)}
                        className="w-full bg-slate-50 focus:bg-white text-xs text-slate-800 font-bold p-2.5 rounded-xl border border-slate-200 outline-none transition-all focus:border-brand-purple"
                        placeholder="e.g. Zahid Hasan"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white text-xs text-slate-800 font-bold p-2.5 rounded-xl border border-slate-200 outline-none transition-all focus:border-brand-purple"
                    />
                  </div>

                  {/* NID Photos uploads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Front side upload */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block uppercase">NID Front Side Photo</label>
                      <div
                        onDragEnter={(e) => handleDrag(e, "nidFront")}
                        onDragOver={(e) => handleDrag(e, "nidFront")}
                        onDragLeave={(e) => handleDrag(e, "nidFront")}
                        onDrop={(e) => handleDrop(e, "nidFront")}
                        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden ${
                          dragField === "nidFront" ? "border-brand-purple bg-brand-purple/5" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                        }`}
                      >
                        {nidFrontUrl ? (
                          <>
                            <img referrerPolicy="no-referrer" src={nidFrontUrl} alt="NID Front" className="w-full h-full object-cover absolute inset-0" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <Camera className="w-6 h-6 text-brand-lime" />
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400 mb-1" />
                            <span className="text-[10px] font-extrabold text-slate-600 block">Drag photo here</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">or click selector</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleFileChange(e, "nidFront")}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCameraSnap("nidFront")}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-xl text-[9px] font-black flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5 text-brand-purple" />
                        Simulate NID Front Camera Scan
                      </button>
                    </div>

                    {/* Back side upload */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block uppercase">NID Back Side Photo</label>
                      <div
                        onDragEnter={(e) => handleDrag(e, "nidBack")}
                        onDragOver={(e) => handleDrag(e, "nidBack")}
                        onDragLeave={(e) => handleDrag(e, "nidBack")}
                        onDrop={(e) => handleDrop(e, "nidBack")}
                        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden ${
                          dragField === "nidBack" ? "border-brand-purple bg-brand-purple/5" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                        }`}
                      >
                        {nidBackUrl ? (
                          <>
                            <img referrerPolicy="no-referrer" src={nidBackUrl} alt="NID Back" className="w-full h-full object-cover absolute inset-0" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <Camera className="w-6 h-6 text-brand-lime" />
                            </div>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400 mb-1" />
                            <span className="text-[10px] font-extrabold text-slate-600 block">Drag photo here</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">or click selector</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleFileChange(e, "nidBack")}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCameraSnap("nidBack")}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-xl text-[9px] font-black flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5 text-brand-purple" />
                        Simulate NID Back Camera Scan
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (validateNid()) {
                          setStep(2);
                        }
                      }}
                      className="bg-brand-purple hover:bg-brand-purple/95 text-white py-2.5 px-6 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      Continue to Drug License
                      <ChevronRight className="w-4 h-4 text-brand-lime" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: License Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Award className="w-4.5 h-4.5 text-brand-purple" />
                      Section B: Pharmacy Drug License & Trade Details
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">DGDA Licensed Pharmacies and B2B Compliance parameters only</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">DGDA Drug License Number</label>
                      <input
                        type="text"
                        value={licenseNo}
                        onChange={(e) => setLicenseNo(e.target.value)}
                        className="w-full bg-slate-50 focus:bg-white text-xs text-slate-800 font-bold p-2.5 rounded-xl border border-slate-200 outline-none transition-all focus:border-brand-purple"
                        placeholder="e.g. DC-PH-12994"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">License Expiry Date</label>
                      <input
                        type="date"
                        value={drugLicenseExpiry}
                        onChange={(e) => setDrugLicenseExpiry(e.target.value)}
                        className="w-full bg-slate-50 focus:bg-white text-xs text-slate-800 font-bold p-2.5 rounded-xl border border-slate-200 outline-none transition-all focus:border-brand-purple"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Trade License Number (Optional)</label>
                    <input
                      type="text"
                      value={tradeLicenseNo}
                      onChange={(e) => setTradeLicenseNo(e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white text-xs text-slate-800 font-bold p-2.5 rounded-xl border border-slate-200 outline-none transition-all focus:border-brand-purple"
                      placeholder="e.g. TR-550992-DK"
                    />
                  </div>

                  {/* Drug License photo upload */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase">Drug License Photo / Doc Upload</label>
                    <div
                      onDragEnter={(e) => handleDrag(e, "drugLicense")}
                      onDragOver={(e) => handleDrag(e, "drugLicense")}
                      onDragLeave={(e) => handleDrag(e, "drugLicense")}
                      onDrop={(e) => handleDrop(e, "drugLicense")}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden ${
                        dragField === "drugLicense" ? "border-brand-purple bg-brand-purple/5" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                      }`}
                    >
                      {drugLicenseUrl ? (
                        <>
                          <img referrerPolicy="no-referrer" src={drugLicenseUrl} alt="Drug License" className="w-full h-full object-cover absolute inset-0" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Camera className="w-6 h-6 text-brand-lime" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-[10px] font-extrabold text-slate-600 block">Drag drug license file here</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">or click to browse from system</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e, "drugLicense")}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCameraSnap("drugLicense")}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-xl text-[9px] font-black flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5 text-brand-purple" />
                      Simulate Document Scanner Scan
                    </button>
                  </div>

                  <div className="pt-4 flex justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-600 py-2.5 px-6 rounded-2xl text-xs font-extrabold"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateLicense()) {
                          handleSubmitKyc();
                        }
                      }}
                      disabled={loading}
                      className="bg-brand-purple hover:bg-brand-purple/95 text-white py-2.5 px-6 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {loading ? "Submitting..." : "Submit for B2B Verification"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review / Submitted State */}
              {step === 3 && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Clock className="w-8 h-8 text-amber-500" />
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-2">
                    <h4 className="text-base font-black text-slate-800">Verification Pending Review</h4>
                    <p className="text-xs text-slate-400 font-semibold font-mono">Status code: compliance-audit-pending</p>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold pt-2">
                      Our regulatory audit team is active. We are verifying your uploaded Bangladeshi NID cards and DGDA Drug Licenses against national records. Verification takes up to 24 hours.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-left max-w-sm mx-auto text-[10px] font-semibold space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Owner Registered:</span>
                      <span className="font-bold text-slate-850">{nidOwnerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">NID Code:</span>
                      <span className="font-bold font-mono text-slate-850">{nidNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">DGDA license No:</span>
                      <span className="font-bold font-mono text-slate-850">{licenseNo}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-150 flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={onClose}
                      className="bg-brand-purple text-white hover:bg-brand-purple/95 text-xs font-black py-2.5 px-6 rounded-xl cursor-pointer transition-colors"
                    >
                      Acknowledge & Close
                    </button>
                    
                    {/* Simulator Button */}
                    <button
                      onClick={() => handleSimulateDevApproval("Approved")}
                      className="bg-brand-lime text-slate-900 hover:bg-brand-lime/95 text-xs font-black py-2.5 px-6 rounded-xl cursor-pointer transition-colors border border-brand-lime/20"
                    >
                      Simulate Instant Approval (Dev Test)
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Camera overlay simulator */}
        {activeCameraField && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6">
            <div className="flex justify-between items-center text-white">
              <span className="text-xs font-black uppercase tracking-wider text-brand-lime font-mono">B2B Scanning Client v2.4</span>
              <button onClick={() => setActiveCameraField(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Target Guides */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="border-4 border-dashed border-brand-lime/70 w-full max-w-sm aspect-[1.58] rounded-3xl flex flex-col items-center justify-center text-center text-white p-6 relative">
                {/* Guideline brackets */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-brand-lime"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-brand-lime"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-brand-lime"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-brand-lime"></div>

                <Camera className="w-12 h-12 text-brand-lime animate-pulse mb-3" />
                <h4 className="text-sm font-extrabold text-white">ALIGN COMPLIANCE DOCUMENT</h4>
                <p className="text-[10px] text-slate-300 font-semibold max-w-xs mt-1.5 leading-relaxed">
                  Position the document inside the guidelines. Avoid glare, reflections, or blurring for optical OCR readability.
                </p>
              </div>
            </div>

            <div className="p-4 text-center">
              <button
                onClick={() => triggerCameraSnapMock(activeCameraField)}
                className="bg-brand-lime text-slate-900 hover:bg-brand-lime/90 font-black py-4 px-8 rounded-full text-xs shadow-xl inline-flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 stroke-[2.5]" />
                CAPTURE DOCUMENT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
