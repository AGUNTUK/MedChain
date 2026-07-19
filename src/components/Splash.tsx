import React, { useEffect, useState } from "react";
import { MediChainFullLogo } from "./MediChainLogo";
import { motion } from "motion/react";

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Keep active for exactly 2 seconds, then fade out
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    // Call onComplete after the 500ms fadeout transition is done (2.5 seconds total)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`absolute inset-0 w-full h-full bg-white flex flex-col items-center justify-between p-8 z-50 select-none overflow-hidden transition-opacity duration-500 ease-in-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Premium ambient light radial background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-brand-purple/5 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[320px] h-[320px] bg-brand-lime/5 rounded-full blur-[100px] pointer-events-none" />

      {/* spacer */}
      <div />

      {/* Centered Logo & Branding */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          {/* Subtle pulse/glow effect underneath */}
          <div className="absolute inset-0 bg-brand-purple/10 blur-xl rounded-full scale-90 animate-pulse" />
          <MediChainFullLogo size={144} className="relative z-10" />
        </motion.div>

        {/* Brand Name */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-3xl font-black tracking-tight text-slate-900 mt-5"
        >
          <span className="text-brand-purple">Medi</span>
          <span className="text-brand-lime">Chain</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-500 mt-2"
        >
          B2B Pharmacy Procurement Platform
        </motion.p>
      </div>

      {/* Bottom status indicator */}
      <div className="flex flex-col items-center gap-3 pb-4">
        {/* Glowing dual gradient loading indicator */}
        <div className="w-40 h-1 bg-slate-100 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            className="w-1/2 h-full bg-gradient-to-r from-brand-purple to-brand-lime absolute rounded-full"
          />
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.6 }}
          className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest"
        >
          Secured Enterprise Pipeline
        </motion.span>
      </div>
    </div>
  );
}

