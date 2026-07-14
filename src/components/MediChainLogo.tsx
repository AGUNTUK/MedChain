import React from "react";

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
      {/* 3D High-Fidelity SVG Shield Logo matching the uploaded image exactly */}
      <svg
        className={`${currentSize.shield} select-none filter drop-shadow-md`}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic chiseled shield gradients */}
          <linearGradient id="shieldBorderLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5A5B64" />
            <stop offset="100%" stopColor="#2A2B30" />
          </linearGradient>
          <linearGradient id="shieldBorderRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3E3F45" />
            <stop offset="100%" stopColor="#15161A" />
          </linearGradient>
          <linearGradient id="shieldFillLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#32333A" />
            <stop offset="100%" stopColor="#1E1F24" />
          </linearGradient>
          <linearGradient id="shieldFillRight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#24252B" />
            <stop offset="100%" stopColor="#0F1012" />
          </linearGradient>

          {/* Core Purple Gradients matching the uploaded artwork */}
          <linearGradient id="purpleWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="purpleLetterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>

          {/* Premium Neon Green/Lime Chain Link Gradients with glowing 3D-effect */}
          <linearGradient id="neonGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="50%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#4d7c0f" />
          </linearGradient>
          <linearGradient id="neonGreenGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bef264" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>

          {/* Drop shadow for the chain links to overlay gracefully */}
          <filter id="linkShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-1" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
          </filter>
          
          {/* Intense neon outer glow */}
          <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- SHIELD OUTER FRAME (Metallic & Chiseled) --- */}
        {/* Left Outer Frame */}
        <path
          d="M60 10C42 14 26 15 22 28C20 54 35 84 60 98V10Z"
          fill="url(#shieldBorderLeft)"
        />
        {/* Right Outer Frame */}
        <path
          d="M60 10C78 14 94 15 98 28C100 54 85 84 60 98V10Z"
          fill="url(#shieldBorderRight)"
        />

        {/* --- SHIELD INNER FACE --- */}
        {/* Left Inner Face */}
        <path
          d="M60 15C45 18 30 19 26 30C24 52 38 79 60 92V15Z"
          fill="url(#shieldFillLeft)"
        />
        {/* Right Inner Face */}
        <path
          d="M60 15C75 18 90 19 94 30C96 52 82 79 60 92V15Z"
          fill="url(#shieldFillRight)"
        />

        {/* --- LEFT SIDE: PURPLE BRANDING WING --- */}
        <path
          d="M60 15C45 18 30 19 26 30C24.5 46.5 32 68 47.5 82C49 76.5 50.5 68 51.5 62L41 51.5H51.5V32H60V15Z"
          fill="url(#purpleWingGrad)"
        />

        {/* --- STYLIZED MONOGRAM "M" INSIDE PURPLE WING --- */}
        <path
          d="M31 34C31 34 38 41.5 44 48L53 57C51.5 69.5 45.5 81 45.5 81C45.5 81 53 74 57.5 66.5V33L47.5 43.5L39.5 34L31 34Z"
          fill="url(#purpleLetterGrad)"
        />
        {/* Subtle white highlight edge on Purple monogram "M" */}
        <path
          d="M31 34L48.5 54.5L57.5 42V25L42.5 35L31 34Z"
          fill="#FFFFFF"
          opacity="0.15"
        />

        {/* --- RIGHT SIDE: METALLIC GRAY FACE --- */}
        <path
          d="M60 15V92C60 92 72 84 78 77C72 71.5 67 60 67.5 53.5L78 41.5H67.5V26.5H60V15Z"
          fill="#1C1D21"
        />

        {/* --- GLOWING NEON GREEN/LIME CHAIN LINKS (Angled) --- */}
        {/* Upper Chain Link - angled diagonally at ~30 deg */}
        <g transform="translate(68, 25) rotate(-30)" filter="url(#linkShadow)">
          {/* Inner connector backing */}
          <rect x="0" y="0" width="28" height="12" rx="6" fill="#1C1D21" />
          {/* Main 3D Glowing Capsule Border */}
          <rect
            x="0"
            y="0"
            width="28"
            height="12"
            rx="6"
            stroke="url(#neonGreenGrad)"
            strokeWidth="4"
            fill="none"
          />
          {/* Glossy inner glow reflection */}
          <rect
            x="2"
            y="2"
            width="24"
            height="8"
            rx="4"
            stroke="url(#neonGreenGlowGrad)"
            strokeWidth="1"
            fill="none"
            opacity="0.8"
          />
        </g>

        {/* Lower Chain Link - angled parallelly */}
        <g transform="translate(68, 52) rotate(-30)" filter="url(#linkShadow)">
          {/* Inner connector backing */}
          <rect x="0" y="0" width="28" height="12" rx="6" fill="#1C1D21" />
          {/* Main 3D Glowing Capsule Border */}
          <rect
            x="0"
            y="0"
            width="28"
            height="12"
            rx="6"
            stroke="url(#neonGreenGrad)"
            strokeWidth="4"
            fill="none"
          />
          {/* Glossy inner glow reflection */}
          <rect
            x="2"
            y="2"
            width="24"
            height="8"
            rx="4"
            stroke="url(#neonGreenGlowGrad)"
            strokeWidth="1"
            fill="none"
            opacity="0.8"
          />
        </g>

        {/* --- LINKING CONNECTORS BETWEEN SHIELD & CHAINS --- */}
        {/* Linking anchor for Upper link */}
        <path
          d="M63 36L75 29"
          stroke="url(#neonGreenGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          filter="url(#neonGlow)"
        />
        {/* Linking anchor for Lower link */}
        <path
          d="M63 63L75 56"
          stroke="url(#neonGreenGrad)"
          strokeWidth="5"
          strokeLinecap="round"
          filter="url(#neonGlow)"
        />
      </svg>

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
