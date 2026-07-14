import React, { useState } from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  withText?: boolean;
  textColor?: "light" | "dark";
  orientation?: "horizontal" | "vertical";
}

export default function MediChainLogo({
  className = "",
  size = "md",
  withText = true,
  textColor = "dark",
  orientation = "horizontal",
}: LogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    sm: { shield: "w-8 h-8", text: "text-lg", subtitle: "text-[8px]" },
    md: { shield: "w-16 h-16", text: "text-2xl", subtitle: "text-[10px]" },
    lg: { shield: "w-28 h-28", text: "text-4xl", subtitle: "text-xs" },
    xl: { shield: "w-40 h-40", text: "text-5xl", subtitle: "text-sm" },
  };

  const currentSize = sizeMap[size];

  return (
    <div
      className={`flex ${
        orientation === "vertical" ? "flex-col items-center text-center animate-fade-in" : "items-center gap-3"
      } ${className}`}
    >
      {!imageError ? (
        <img 
          src="/logo.png" 
          alt="MediChain Logo" 
          className={`${currentSize.shield} object-contain filter drop-shadow-md`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={`${currentSize.shield} bg-slate-200 rounded-xl flex items-center justify-center`}>
          <span className="text-[10px] font-bold text-slate-400">MC</span>
        </div>
      )}

      {/* Brand Typography matching the second uploaded image perfectly */}
      {withText && (
        <div className={orientation === "vertical" ? "mt-4" : "flex flex-col"}>
          <div className={`${currentSize.text} font-black tracking-tight select-none`}>
            <span className="text-brand-purple">Medi</span>
            <span className="text-brand-lime">Chain</span>
          </div>
          <div
            className={`${currentSize.subtitle} tracking-[0.25em] font-black uppercase ${
              textColor === "light" ? "text-slate-450" : "text-gray-500"
            } select-none ${orientation === "vertical" ? "mt-1.5" : "-mt-1"}`}
          >
            B2B PHARMA PROCUREMENT
          </div>
        </div>
      )}
    </div>
  );
}
