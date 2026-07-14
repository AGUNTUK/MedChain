import React, { useState } from "react";
import MediChainLogo from "./MediChainLogo";
import { motion } from "motion/react";
import { Smartphone, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { authService } from "../services";

interface LoginProps {
  onLoginSuccess: (phone: string, needsSetup: boolean) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10 || phone.length > 11) {
      setError("Please enter a valid 10 or 11-digit mobile number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await authService.sendOtp(phone);
      setStep("otp");
      setSuccessMsg(data.message || "Verification code sent successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== "123456") {
      setError("Invalid OTP code. Please use 123456.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await authService.verifyOtp(phone, otp);
      onLoginSuccess(phone, data.needsSetup);
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between p-6 select-none relative overflow-y-auto">
      {/* Upper Logo Section */}
      <div className="flex flex-col items-center mt-6">
        <MediChainLogo size="sm" withText={true} textColor="dark" />
      </div>

      {/* Dynamic Form container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="my-auto py-6"
      >
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-brand-charcoal tracking-tight">
            Welcome to MediChain
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {step === "phone"
              ? "Pharmacy owner's portal. Enter mobile to securely log in."
              : "Verification required. Input the security code sent."}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && step === "otp" && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] p-3 rounded-xl mb-4 leading-relaxed font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Pharmacy Owner Mobile Number
              </label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-all">
                <Smartphone className="text-slate-400 w-4 h-4 mr-2" />
                <span className="text-slate-600 font-semibold text-xs mr-1">+880</span>
                <input
                  type="tel"
                  placeholder="17XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  className="w-full outline-none text-slate-800 font-semibold text-xs bg-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full bg-brand-lime hover:bg-brand-lime-dark text-slate-900 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-lime/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Tap-to-Autofill Role-Based Sandbox */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mt-4 space-y-2">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                💡 Sandbox Role Accounts (OTP: 123456)
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPhone("01712345678")}
                  className="bg-white border border-slate-200/80 hover:border-brand-purple p-2 rounded-lg text-left font-semibold text-slate-700 transition-all flex flex-col cursor-pointer"
                >
                  <span className="text-slate-400 text-[8px] font-bold">PHARMACY OWNER</span>
                  <span>01712345678</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhone("01799999999")}
                  className="bg-white border border-slate-200/80 hover:border-brand-purple p-2 rounded-lg text-left font-semibold text-slate-700 transition-all flex flex-col cursor-pointer"
                >
                  <span className="text-slate-400 text-[8px] font-bold">ADMIN</span>
                  <span>01799999999</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhone("01788888888")}
                  className="bg-white border border-slate-200/80 hover:border-brand-purple p-2 rounded-lg text-left font-semibold text-slate-700 transition-all flex flex-col cursor-pointer"
                >
                  <span className="text-slate-400 text-[8px] font-bold">DEPOT STAFF</span>
                  <span>01788888888</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhone("01777777777")}
                  className="bg-white border border-slate-200/80 hover:border-brand-purple p-2 rounded-lg text-left font-semibold text-slate-700 transition-all flex flex-col cursor-pointer"
                >
                  <span className="text-slate-400 text-[8px] font-bold">DELIVERY STAFF</span>
                  <span>01777777777</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="relative">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Enter Verification Code (OTP)
              </label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-3 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-all">
                <ShieldCheck className="text-slate-400 w-4 h-4 mr-2" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="XXXXXX (use 123456)"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full outline-none text-slate-800 font-mono tracking-[0.5em] font-extrabold text-sm text-center bg-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-brand-purple hover:bg-brand-purple-dark text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-purple/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Verify OTP
                  <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setSuccessMsg("");
                setError("");
              }}
              className="w-full text-center text-xs font-semibold text-brand-purple hover:underline cursor-pointer"
            >
              Change Mobile Number
            </button>
          </form>
        )}
      </motion.div>

      {/* Enterprise Security assurance Footer */}
      <div className="border-t border-slate-100 pt-4 text-center">
        <p className="text-[9px] text-slate-400 leading-relaxed">
          🔒 Secured by DGDA Bangladesh-approved serialization. Procurement access is exclusively granted to authorized pharmacies holding active trade licenses.
        </p>
      </div>
    </div>
  );
}
