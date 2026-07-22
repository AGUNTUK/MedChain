import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  FileCheck, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle,
  FileSpreadsheet,
  BadgeAlert,
  Sparkles
} from "lucide-react";
import MediChainLogo from "./MediChainLogo";
import { profileService } from "../services";

interface PharmacyRegistrationWizardProps {
  initialPhone?: string;
  onComplete?: (pharmacyData: any) => void;
  onCancel?: () => void;
}

export default function PharmacyRegistrationWizard({
  initialPhone = "",
  onComplete,
  onCancel
}: PharmacyRegistrationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Business & Owner Details
  const [pharmacyName, setPharmacyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState("");

  // Step 2: Licensing & Regulatory
  const [drugLicenseNo, setDrugLicenseNo] = useState("");
  const [tradeLicenseNo, setTradeLicenseNo] = useState("");
  const [tinNumber, setTinNumber] = useState("");

  // Step 3: Location & Address
  const [division, setDivision] = useState("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");

  // Step 4: Documents Upload
  const [drugLicenseFile, setDrugLicenseFile] = useState<File | null>(null);
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);
  const [nidFile, setNidFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const validateStep = (currentStep: number) => {
    setError("");
    if (currentStep === 1) {
      if (!pharmacyName.trim()) {
        setError("Pharmacy Business Name is required.");
        return false;
      }
      if (!ownerName.trim()) {
        setError("Proprietor / Owner Name is required.");
        return false;
      }
      if (!phone.trim()) {
        setError("Contact mobile phone number is required.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!drugLicenseNo.trim()) {
        setError("DGDA Drug License Number is required for legal medicine distribution in Bangladesh.");
        return false;
      }
      if (!tradeLicenseNo.trim()) {
        setError("Municipal Trade License Number is required.");
        return false;
      }
    } else if (currentStep === 3) {
      if (!address.trim()) {
        setError("Detailed street address is required for B2B delivery.");
        return false;
      }
      if (!thana.trim()) {
        setError("Thana / Upazila name is required.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : 4));
    }
  };

  const handlePrev = () => {
    setError("");
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        pharmacyName,
        ownerName,
        phone,
        email,
        licenseNo: drugLicenseNo,
        tradeLicenseNo,
        tinNumber,
        address: `${address}, ${thana}, ${district}, ${division}${landmark ? ` (Near ${landmark})` : ""}`,
        city: district,
        division,
        district,
        thana,
        status: "Pending",
        submittedAt: new Date().toISOString()
      };

      await profileService.updatePharmacyProfile(payload);

      setSubmittedSuccess(true);
      if (onComplete) {
        onComplete(payload);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit pharmacy registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-900 p-6 text-white relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MediChainLogo className="w-8 h-8 text-emerald-400" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Pharmacy Onboarding Wizard</h2>
              <p className="text-xs text-emerald-200">DGDA Compliant B2B Medicine Procurement Network</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          {[
            { num: 1, label: "Business" },
            { num: 2, label: "Licensing" },
            { num: 3, label: "Location" },
            { num: 4, label: "Documents" }
          ].map((item) => (
            <div key={item.num} className="flex flex-col gap-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= item.num ? "bg-emerald-400" : "bg-white/20"
                }`}
              />
              <span
                className={`text-[10px] font-medium text-center ${
                  step === item.num ? "text-emerald-300 font-semibold" : "text-white/60"
                }`}
              >
                {item.num}. {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Form Content */}
      <div className="p-6 md:p-8 flex-1 overflow-y-auto">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {submittedSuccess ? (
          <div className="text-center py-8 px-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Registration Submitted!</h3>
            <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
              Your drug license (<span className="font-semibold text-slate-900">{drugLicenseNo}</span>) and business profile for <span className="font-semibold text-slate-900">{pharmacyName}</span> have been sent to MediChain Compliance. Verification typically takes under 24 hours.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 max-w-sm mb-6 text-left space-y-1">
              <p className="font-semibold text-slate-700">What happens next?</p>
              <p>1. DGDA license validation against national drug database.</p>
              <p>2. Credit line assignment (Up to ৳100,000 BDT wholesale credit).</p>
              <p>3. Express wholesale medicine dispatch enabled.</p>
            </div>
            <button
              onClick={() => onComplete && onComplete({ submittedSuccess: true })}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.form
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={step === 4 ? handleSubmit : (e) => e.preventDefault()}
              className="space-y-5"
            >
              {/* STEP 1: BUSINESS & OWNER */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-teal-600" />
                    Pharmacy & Proprietor Information
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pharmacy Name (Standard English / Bangla) *
                    </label>
                    <input
                      type="text"
                      value={pharmacyName}
                      onChange={(e) => setPharmacyName(e.target.value)}
                      placeholder="e.g. Popular Pharma & Medicine Corner"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Proprietor / License Holder Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Full Name as in NID / Drug License"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Mobile Phone *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01700-000000"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="pharmacy@gmail.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: LICENSING */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                    DGDA Regulatory & Tax Credentials
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      DGDA Drug License Number (Required) *
                    </label>
                    <input
                      type="text"
                      value={drugLicenseNo}
                      onChange={(e) => setDrugLicenseNo(e.target.value)}
                      placeholder="e.g. DL-DHAKA-04928"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Must be a valid Directorate General of Drug Administration (DGDA) retail/wholesale license.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Municipal Trade License Number *
                    </label>
                    <input
                      type="text"
                      value={tradeLicenseNo}
                      onChange={(e) => setTradeLicenseNo(e.target.value)}
                      placeholder="e.g. TRAD/DNCC/019283/2025"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      eTIN / BIN Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={tinNumber}
                      onChange={(e) => setTinNumber(e.target.value)}
                      placeholder="12-digit eTIN or 9-digit BIN"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: LOCATION */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    Delivery Address & Depot Mapping
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Division *</label>
                      <select
                        value={division}
                        onChange={(e) => {
                          setDivision(e.target.value);
                          setDistrict(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="Dhaka">Dhaka Division</option>
                        <option value="Chittagong">Chittagong Division</option>
                        <option value="Rajshahi">Rajshahi Division</option>
                        <option value="Khulna">Khulna Division</option>
                        <option value="Sylhet">Sylhet Division</option>
                        <option value="Barisal">Barisal Division</option>
                        <option value="Rangpur">Rangpur Division</option>
                        <option value="Mymensingh">Mymensingh Division</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">District / City *</label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Dhaka North / Gazipur"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Thana / Upazila *</label>
                    <input
                      type="text"
                      value={thana}
                      onChange={(e) => setThana(e.target.value)}
                      placeholder="e.g. Uttara / Dhanmondi / Mirpur"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Street Address *</label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Shop #12, Market Name, Road #04, Block #B"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nearest Landmark (For Courier)</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Opposite Square Hospital / Near Main Bus Stand"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: DOCUMENTS UPLOAD */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-teal-600" />
                    Verification Document Attachments
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload scanned photos or PDF copies of your licenses to unlock instant credit limits.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50">
                      <FileCheck className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                      <span className="block text-xs font-semibold text-slate-800">Drug License Scan</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG or PDF (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setDrugLicenseFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="drug-license-file"
                      />
                      <label
                        htmlFor="drug-license-file"
                        className="mt-2 inline-block px-3 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        {drugLicenseFile ? drugLicenseFile.name : "Select File"}
                      </label>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50">
                      <FileSpreadsheet className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                      <span className="block text-xs font-semibold text-slate-800">Trade License</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG or PDF (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setTradeLicenseFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="trade-license-file"
                      />
                      <label
                        htmlFor="trade-license-file"
                        className="mt-2 inline-block px-3 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        {tradeLicenseFile ? tradeLicenseFile.name : "Select File"}
                      </label>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50">
                      <User className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                      <span className="block text-xs font-semibold text-slate-800">Proprietor NID</span>
                      <span className="text-[10px] text-slate-500">Front & Back (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setNidFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="nid-file"
                      />
                      <label
                        htmlFor="nid-file"
                        className="mt-2 inline-block px-3 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        {nidFile ? nidFile.name : "Select File"}
                      </label>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2 mt-4">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Instant Verification Perks</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Verified partners enjoy up to ৳100,000 credit limit with 15-day payment cycle and priority express delivery across Bangladesh.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-6">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                  >
                    {loading ? (
                      <span>Submitting Registration...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Complete & Register Pharmacy
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.form>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
