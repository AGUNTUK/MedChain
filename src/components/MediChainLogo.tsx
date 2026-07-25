import React from "react";

export function MediChainOfficialLogo({ 
  className = "h-16 w-auto object-contain", 
  style, 
  size 
}: { 
  className?: string; 
  style?: React.CSSProperties; 
  size?: number 
}) {
  const widthHeight = size ? { width: size, height: size } : {};
  return (
    <img 
      src="/logo.png" 
      alt="MediChain Logo" 
      className={className} 
      style={{ ...style, ...widthHeight }}
    />
  );
}

export function MediChainFullLogo({ className = "", size = 120 }: { className?: string; size?: number }) {
  return <MediChainOfficialLogo className={`object-contain ${className}`} size={size} />;
}

export function MediChainIconOnly({ className = "", size = 48 }: { className?: string; size?: number }) {
  return <MediChainOfficialLogo className={`object-contain ${className}`} size={size} />;
}

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
  const sizeMap = {
    sm: { px: 40, text: "text-lg", subtitle: "text-[8px]" },
    md: { px: 72, text: "text-2xl", subtitle: "text-[10px]" },
    lg: { px: 130, text: "text-4xl", subtitle: "text-xs" },
    xl: { px: 190, text: "text-5xl", subtitle: "text-sm" },
  };

  const currentSize = sizeMap[size];

  return (
    <div
      className={`flex ${
        orientation === "vertical" ? "flex-col items-center text-center animate-fade-in" : "items-center gap-3"
      } ${className}`}
    >
      {withText ? (
        <MediChainFullLogo size={currentSize.px} />
      ) : (
        <MediChainIconOnly size={currentSize.px} />
      )}

      {/* Brand Typography perfectly aligned */}
      {withText && (
        <div className={orientation === "vertical" ? "mt-3" : "flex flex-col"}>
          <div className={`${currentSize.text} font-black tracking-tight select-none`}>
            <span className="text-brand-purple">Medi</span>
            <span className="text-brand-lime">Chain</span>
          </div>
          <div
            className={`${currentSize.subtitle} tracking-[0.25em] font-black uppercase ${
              textColor === "light" ? "text-slate-400" : "text-gray-500"
            } select-none ${orientation === "vertical" ? "mt-1.5" : "-mt-1"}`}
          >
            B2B PHARMA PROCUREMENT
          </div>
        </div>
      )}
    </div>
  );
}
