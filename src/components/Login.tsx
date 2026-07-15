import React, { useState } from "react";
import MediChainLogo from "./MediChainLogo";
import { motion } from "motion/react";
import { Mail, Lock, User, RefreshCw, AlertCircle, ArrowRight, ShieldCheck, UserPlus, LogIn } from "lucide-react";
import { authService } from "../services";

interface LoginProps {
  onLoginSuccess: (phoneOrEmail: string, needsSetup: boolean, role: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Pharmacy Owner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && !name) {
      setError("Please provide your full name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (mode === "login") {
        const data = await authService.login(email, password);
        setSuccessMsg("Logged in successfully!");
        setTimeout(() => {
          onLoginSuccess(data.user.phone || data.user.email, data.needsSetup, data.user.role);
        }, 500);
      } else {
        await authService.signUp(email, password, name, "Pharmacy Owner");
        setSuccessMsg("Account created. Please log in.");
        setMode("login");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between p-6 select-none relative overflow-y-auto">
      {/* Upper Logo Section */}
      <div className="flex flex-col items-center mt-3">
        <MediChainLogo size="sm" withText={true} textColor="dark" />
      </div>

      {/* Dynamic Form container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="my-auto py-4"
      >
        <div className="mb-5">
          <h1 className="text-xl font-extrabold text-brand-charcoal tracking-tight">
            {mode === "login" ? "Welcome Back" : "Create B2B Account"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "login"
              ? "Sign in with your email to access the B2B pharmacy portal."
              : "Register trade credentials to join DGDA-certified procurement."}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200/50">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "login"
                ? "bg-white text-brand-purple shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "signup"
                ? "bg-white text-brand-purple shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] p-3 rounded-xl mb-4 leading-relaxed font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Full Name
              </label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-all">
                <User className="text-slate-400 w-4 h-4 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Zahid Hasan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full outline-none text-slate-800 font-semibold text-xs bg-transparent"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Email Address
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-all">
              <Mail className="text-slate-400 w-4 h-4 mr-2 flex-shrink-0" />
              <input
                type="email"
                placeholder="owner@medichain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full outline-none text-slate-800 font-semibold text-xs bg-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Password
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-all">
              <Lock className="text-slate-400 w-4 h-4 mr-2 flex-shrink-0" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none text-slate-800 font-semibold text-xs bg-transparent"
                required
              />
            </div>
          </div>



          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-lime hover:bg-brand-lime-dark text-slate-900 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-lime/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : mode === "login" ? (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
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
