import React, { useState } from "react";
import officialLogo from "../assets/images/logo.png";

export function MediChainOfficialLogo({ 
  className = "h-16 w-auto object-contain", 
  style, 
  size 
}: { 
  className?: string; 
  style?: React.CSSProperties; 
  size?: number 
}) {
  const [imgError, setImgError] = useState(false);
  const widthHeight = size ? { width: size, height: size } : {};

  if (imgError) {
    return <InlineSVGLogo className={className} style={{ ...style, ...widthHeight }} />;
  }

  return (
    <img 
      src={officialLogo || "/logo.png"} 
      alt="MediChain Logo" 
      className={className} 
      style={{ ...style, ...widthHeight }}
      onError={() => setImgError(true)}
    />
  );
}

export function MediChainFullLogo({ className = "", size = 120 }: { className?: string; size?: number }) {
  return <MediChainOfficialLogo className={`object-contain ${className}`} size={size} />;
}

export function MediChainIconOnly({ className = "", size }: { className?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {imgError ? (
        <InlineSVGLogo 
          className="object-contain h-full w-full max-h-full max-w-full" 
          style={size ? { width: size, height: size } : {}}
        />
      ) : (
        <img 
          src={officialLogo || "/logo.png"} 
          alt="MediChain Logo" 
          className="object-contain h-full w-full max-h-full max-w-full" 
          style={size ? { width: size, height: size } : {}}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

function InlineSVGLogo({ className = "", style = {} }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg 
      className={className} 
      style={style}
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="20" y="20" width="60" height="60" rx="16" fill="#8B5CF6" />
      <rect x="42" y="30" width="16" height="40" rx="4" fill="#8CC63F" />
      <rect x="30" y="42" width="40" height="16" rx="4" fill="#8CC63F" />
    </svg>
  );
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
            <span style={{ color: "#8B5CF6" }}>Medi</span>
            <span style={{ color: "#8CC63F" }}>Chain</span>
          </div>
          <div
            className={`${currentSize.subtitle} tracking-[0.25em] font-black uppercase ${
              textColor === "light" ? "text-slate-400" : "text-gray-500"
            } select-none ${orientation === "vertical" ? "mt-1.5" : "-mt-1"}`}
          >
            B2B PHARMA PROCUREMENT PLATFORM
          </div>
        </div>
      )}
    </div>
  );
}
