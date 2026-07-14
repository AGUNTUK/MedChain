import React, { useEffect } from "react";
import MediChainLogo from "./MediChainLogo";
import { motion } from "motion/react";

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col items-center justify-between p-8 relative overflow-hidden select-none">
      {/* Background soft lighting blobs */}
      <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[50%] bg-brand-purple/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[50%] bg-brand-lime/5 rounded-full blur-[100px]" />

      <div />

      {/* Main Animated Logo container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <MediChainLogo size="lg" withText={true} orientation="vertical" textColor="dark" />
      </motion.div>

      {/* Professional loading sign and enterprise credentials */}
      <div className="flex flex-col items-center gap-3">
        {/* Glowing Progress bar */}
        <div className="w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            className="w-1/2 h-full bg-gradient-to-r from-brand-purple to-brand-lime absolute rounded-full"
          />
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Secured B2B Operating System
        </p>
      </div>
    </div>
  );
}
