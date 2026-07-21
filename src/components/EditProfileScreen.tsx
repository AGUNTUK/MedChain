import React, { useState } from "react";
import { X, Upload, Camera, Check, ArrowLeft, MapPin, User, Mail, Phone, Shield, ShieldAlert } from "lucide-react";
import { Pharmacy } from "../types";
import { profileService } from "../services/profile";

interface EditProfileScreenProps {
  pharmacy: Pharmacy | null;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function EditProfileScreen({ pharmacy, onClose, onSaveSuccess }: EditProfileScreenProps) {
  // Address divisions, districts, upazilas lists for high-fidelity interactive dropdowns
  const divisions = ["Dhaka", "Chittagong", "Rajshahi", "Khulna", "Barisal", "Sylhet", "Rangpur", "Mymensingh"];
  const districtsMap: Record<string, string[]> = {
    Dhaka: ["Dhaka", "Gazipur", "Narayanganj", "Tangail", "Faridpur"],
    Chittagong: ["Chittagong", "Cox's Bazar", "Comilla", "Feni", "Noakhali"],
    Rajshahi: ["Rajshahi", "Bogra", "Pabna", "Naogaon"],
    Khulna: ["Khulna", "Jessore", "Kushtia", "Satkhira"],
    Barisal: ["Barisal", "Bhola", "Patuakhali"],
    Sylhet: ["Sylhet", "Moulvibazar", "Habiganj"],
    Rangpur: ["Rangpur", "Dinajpur", "Kurigram"],
    Mymensingh: ["Mymensingh", "Netrokona", "Sherpur"]
  };
  const upazilasMap: Record<string, string[]> = {
    Dhaka: ["Mirpur", "Gulshan", "Dhanmondi", "Uttara", "Mohammadpur", "Savar"],
    Chittagong: ["Panchlaish", "Double Mooring", "Hathazari", "Patenga"],
    Rajshahi: ["Boalia", "Motihar", "Rajpara"],
    Khulna: ["Sadar", "Sonadanga", "Khalishpur"]
  };

  // Form State
  const [ownerName, setOwnerName] = useState(pharmacy?.ownerName || "");
  const [pharmacyName, setPharmacyName] = useState(pharmacy?.pharmacyName || "");
  const [phone, setPhone] = useState(pharmacy?.phone || "");
  const [email, setEmail] = useState(pharmacy?.email || "");
  const [division, setDivision] = useState(pharmacy?.division || "Dhaka");
  const [district, setDistrict] = useState(pharmacy?.district || "Dhaka");
  const [upazila, setUpazila] = useState(pharmacy?.upazila || "Mirpur");
  const [streetAddress, setStreetAddress] = useState(pharmacy?.streetAddress || pharmacy?.address || "");
  const [logoUrl, setLogoUrl] = useState(pharmacy?.logoUrl || "");

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // OTP Verification State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpVerified, setOtpVerified] = useState(false);

  // Logo Upload Simulation State
  const [dragActive, setDragActive] = useState(false);

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
      simulateLogoUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateLogoUpload(e.target.files[0]);
    }
  };

  const simulateLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Simulate successful upload and convert to base64 for local persistence preview
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const startOtpVerification = () => {
    setShowOtpModal(true);
    setOtpError("");
    setOtpCode("");
    setOtpTimer(60);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyOtp = () => {
    if (otpCode === "1234" || otpCode === "123456" || otpCode === "8888") {
      setOtpVerified(true);
      setShowOtpModal(false);
      saveProfileData(phone);
    } else {
      setOtpError("Invalid OTP Code. Use '1234' for developer test verification.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!ownerName.trim()) return setError("Full Name is required.");
    if (!pharmacyName.trim()) return setError("Pharmacy/Shop Name is required.");
    if (!phone.trim()) return setError("Phone Number is required.");
    if (!email.trim() || !email.includes("@")) return setError("A valid Email Address is required.");
    if (!streetAddress.trim()) return setError("Full Street Address is required.");

    // Check if phone number was updated
    const isPhoneUpdated = phone !== pharmacy?.phone;

    if (isPhoneUpdated && !otpVerified) {
      startOtpVerification();
    } else {
      saveProfileData(phone);
    }
  };

  const saveProfileData = async (validatedPhone: string) => {
    setLoading(true);
    setError("");

    try {
      // Combine address fields
      const combinedAddress = `${streetAddress}, ${upazila}, ${district}`;
      
      const payload: Partial<Pharmacy> = {
        pharmacyName,
        ownerName,
        phone: validatedPhone,
        address: combinedAddress,
        city: district,
        division,
        district,
        upazila,
        streetAddress,
        logoUrl,
        email
      };

      await profileService.updatePharmacyProfile(payload);
      setSuccessMsg("Profile and shop details saved successfully!");
      
      setTimeout(() => {
        onSaveSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const districts = districtsMap[division] || [division];
  const upazilas = upazilasMap[district] || ["Sadar", "Upazila Thana"];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-purple to-indigo-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-brand-lime" />
            </button>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight text-white">Edit Pharmacy Profile</h3>
              <p className="text-[10px] text-slate-200 font-semibold font-mono">ID: {pharmacy?.id ? pharmacy.id.substring(0, 8) : "Pending"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-2xl font-black flex items-center gap-2 animate-bounce">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Logo / Profile Picture Upload Section */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 bg-slate-200 rounded-full border-2 border-brand-purple/20 overflow-hidden flex items-center justify-center shadow-inner">
                {logoUrl ? (
                  <img referrerPolicy="no-referrer" src={logoUrl} alt="Shop Logo" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-brand-purple hover:bg-brand-purple/90 text-white p-1.5 rounded-full cursor-pointer shadow-md border border-white transition-all">
                <Camera className="w-3.5 h-3.5 text-brand-lime" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>

            <div className="flex-1 w-full text-center sm:text-left">
              <span className="text-[10px] text-brand-purple font-black uppercase tracking-wider block">Shop Identity</span>
              <h4 className="text-xs font-extrabold text-slate-800 mt-0.5">Pharmacy Logo or Owner Picture</h4>
              <p className="text-[9px] text-slate-400 leading-relaxed font-semibold mt-1">
                Upload shop branding for verified wholesale invoices. Drag-and-drop support available.
              </p>
              
              {/* Drag Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`mt-2 border border-dashed rounded-xl p-2 text-center text-[10px] font-bold cursor-pointer transition-colors ${
                  dragActive ? "border-brand-purple bg-brand-purple/5 text-brand-purple" : "border-slate-200 text-slate-400 hover:border-slate-300"
                }`}
              >
                Drop picture file here to upload
              </div>
            </div>
          </div>

          {/* Owner & Pharmacy Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Pharmacy Owner Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs text-slate-800 font-bold pl-9 pr-3 py-2.5 rounded-xl border border-slate-200/80 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/20 outline-none transition-all"
                  placeholder="e.g. Zahid Hasan"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Pharmacy / Shop Name</label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs text-slate-800 font-bold pl-9 pr-3 py-2.5 rounded-xl border border-slate-200/80 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/20 outline-none transition-all"
                  placeholder="e.g. City Pharma"
                />
              </div>
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                Phone Number {phone !== pharmacy?.phone && <span className="text-brand-purple font-black">(Requires OTP Verification)</span>}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs text-slate-800 font-bold pl-9 pr-3 py-2.5 rounded-xl border border-slate-200/80 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/20 outline-none transition-all"
                  placeholder="e.g. +880191234567"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs text-slate-800 font-bold pl-9 pr-3 py-2.5 rounded-xl border border-slate-200/80 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/20 outline-none transition-all"
                  placeholder="e.g. zahid@pharma.com"
                />
              </div>
            </div>
          </div>

          {/* Address Details (Dropdown selector for Division, District, Thana/Upazila) */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-purple" />
              Pharmacy Address Details
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Division</label>
                <select
                  value={division}
                  onChange={(e) => {
                    setDivision(e.target.value);
                    const listDist = districtsMap[e.target.value] || [];
                    if (listDist.length > 0) {
                      setDistrict(listDist[0]);
                      const listTh = upazilasMap[listDist[0]] || ["Sadar"];
                      setUpazila(listTh[0]);
                    }
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-xs text-slate-800 font-bold p-2 rounded-xl border border-slate-200 focus:border-brand-purple outline-none transition-all"
                >
                  {divisions.map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">District</label>
                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    const listTh = upazilasMap[e.target.value] || ["Sadar"];
                    setUpazila(listTh[0]);
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-xs text-slate-800 font-bold p-2 rounded-xl border border-slate-200 focus:border-brand-purple outline-none transition-all"
                >
                  {districts.map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Upazila/Thana</label>
                <select
                  value={upazila}
                  onChange={(e) => setUpazila(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-xs text-slate-800 font-bold p-2 rounded-xl border border-slate-200 focus:border-brand-purple outline-none transition-all"
                >
                  {upazilas.map((th) => (
                    <option key={th} value={th}>{th}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Street Address</label>
              <textarea
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs text-slate-800 font-bold p-3 rounded-xl border border-slate-200/80 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/20 outline-none transition-all"
                placeholder="e.g. Block D, Road 4, House 12"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 py-3 rounded-2xl text-xs font-extrabold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-brand-purple to-indigo-900 hover:from-brand-purple/95 hover:to-indigo-900/95 text-white py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-all"
            >
              {loading ? "Saving Details..." : "Save Profile Details"}
            </button>
          </div>
        </form>

        {/* Simulated OTP Modal */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-brand-purple/10 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-brand-lime" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Phone Verification Required</h3>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-semibold">
                  We've sent a 4-digit verification code to <span className="text-brand-purple font-bold">{phone}</span> to complete your B2B verification.
                </p>
              </div>

              {otpError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold p-2.5 rounded-xl">
                  {otpError}
                </div>
              )}

              <div className="space-y-1">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter OTP (e.g. 1234)"
                  className="w-full bg-slate-50 focus:bg-white text-center text-sm font-black tracking-[0.4em] p-3 rounded-xl border border-slate-200 focus:border-brand-purple outline-none transition-all"
                />
                <span className="text-[9px] text-slate-400 block mt-1.5 font-semibold font-mono">
                  Test Developer Code: <span className="text-brand-purple font-extrabold">1234</span>
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowOtpModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 py-2.5 rounded-xl text-[10px] font-extrabold"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyOtp}
                  className="flex-1 bg-brand-purple text-white hover:bg-brand-purple/95 py-2.5 rounded-xl text-[10px] font-black"
                >
                  Verify Code
                </button>
              </div>

              <div className="text-[9px] text-slate-400 font-bold">
                {otpTimer > 0 ? (
                  <span>Resend code in {otpTimer}s</span>
                ) : (
                  <button onClick={startOtpVerification} className="text-brand-purple underline cursor-pointer">
                    Resend Verification Code
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
