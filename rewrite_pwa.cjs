const fs = require('fs');

const code = `import React, { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export function triggerGlobalPWAInstall() {
  if (globalDeferredPrompt) {
    globalDeferredPrompt.prompt();
  } else {
    window.dispatchEvent(new CustomEvent("medichain-trigger-pwa-install"));
  }
}

export function subscribePWAInstall(callback: (canInstall: boolean) => void) {
  installListeners.add(callback);
  callback(!!globalDeferredPrompt);
  return () => {
    installListeners.delete(callback);
  };
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(!!globalDeferredPrompt);
  useEffect(() => {
    return subscribePWAInstall(setCanInstall);
  }, []);
  return {
    canInstall,
    promptInstall: triggerGlobalPWAInstall,
  };
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const _isIOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(_isIOS);

    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as any).standalone) ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    const checkShouldShow = () => {
      const dismissedAtStr = localStorage.getItem("installPromptDismissedAt");
      if (!dismissedAtStr) return true;
      const dismissedAt = parseInt(dismissedAtStr, 10);
      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      return daysSinceDismissed > 3; // 3 days cooldown
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      installListeners.forEach((listener) => listener(true));
      
      if (checkShouldShow()) {
        setTimeout(() => setShowBanner(true), 1500);
      }
    };

    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setShowBanner(false);
      installListeners.forEach((listener) => listener(false));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const handleCustomTrigger = () => {
      if (globalDeferredPrompt) {
        globalDeferredPrompt.prompt();
      }
    };
    window.addEventListener("medichain-trigger-pwa-install", handleCustomTrigger);

    if (_isIOS && checkShouldShow()) {
      setTimeout(() => setShowBanner(true), 1500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("medichain-trigger-pwa-install", handleCustomTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    const promptToUse = deferredPrompt || globalDeferredPrompt;
    if (!promptToUse) return;

    try {
      await promptToUse.prompt();
      const choiceResult = await promptToUse.userChoice;
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the PWA install prompt");
        setShowBanner(false);
      } else {
        console.log("User dismissed the PWA install prompt");
        handleDismiss();
      }
    } catch (err) {
      console.error("Error triggering install prompt:", err);
    } finally {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      installListeners.forEach((listener) => listener(false));
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("installPromptDismissedAt", Date.now().toString());
  };

  const domain = typeof window !== 'undefined' ? window.location.hostname : 'medichain.app';

  return (
    <>
      {/* Floating Top PWA Install Banner */}
      {showBanner && !showIOSInstructions && (
        <div className="fixed top-2 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-96 z-[100] pt-safe animate-in slide-in-from-top-10 fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-3 pr-4 flex items-center gap-3 relative overflow-hidden group">
            
            <button
              onClick={handleDismiss}
              type="button"
              className="absolute top-1 right-1 p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Dismiss installation prompt"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
              <img src="/logo.png" alt="MediChain" className="w-10 h-10 object-contain" />
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <h3 className="text-sm font-black text-brand-charcoal truncate">
                Install MediChain App
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {domain}
              </p>
            </div>

            <button
              onClick={handleInstallClick}
              type="button"
              className="text-brand-purple hover:text-brand-purple-dark font-extrabold text-sm px-2 py-1 shrink-0 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div 
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center p-4 pb-safe animate-in fade-in duration-200"
          onClick={() => {
            setShowIOSInstructions(false);
            handleDismiss();
          }}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowIOSInstructions(false);
                handleDismiss();
              }}
              className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-brand-purple rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-purple/30">
                <img src="/logo.png" alt="MediChain" className="w-12 h-12 object-contain brightness-0 invert" />
              </div>
              <h3 className="text-xl font-black text-brand-charcoal mb-2">Install MediChain</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Install this application on your home screen for quick and easy access when you're on the go.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-purple shrink-0">
                  <Share className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-brand-charcoal">
                  1. Tap the <span className="font-black text-brand-purple">Share</span> button in your browser's menu bar.
                </p>
              </div>
              
              <div className="h-px bg-slate-200 w-full" />
              
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-purple shrink-0">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-brand-charcoal">
                  2. Scroll down and tap <span className="font-black text-brand-purple">Add to Home Screen</span>.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowIOSInstructions(false);
                handleDismiss();
              }}
              className="w-full mt-6 bg-brand-charcoal text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-transform"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const PWAInstallButton: React.FC<{ className?: string; variant?: "badge" | "button" | "nav" }> = ({
  className = "",
  variant = "badge",
}) => {
  const { canInstall, promptInstall } = usePWAInstall();

  if (!canInstall) return null;

  if (variant === "nav") {
    return (
      <button
        onClick={promptInstall}
        type="button"
        className={\`flex flex-col items-center gap-1 cursor-pointer transition-all text-brand-purple hover:text-brand-purple-dark \${className}\`}
        title="Install MediChain App"
      >
        <div className="relative">
          <Smartphone className="w-5 h-5 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-lime opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]"></span>
          </span>
        </div>
        <span className="text-[10px] font-black">Install</span>
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        onClick={promptInstall}
        type="button"
        className={\`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900 bg-brand-lime hover:bg-brand-lime-dark shadow-2xs transition-all cursor-pointer \${className}\`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <button
      onClick={promptInstall}
      type="button"
      className={\`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase text-slate-900 bg-brand-lime/90 hover:bg-brand-lime transition-colors cursor-pointer border border-brand-lime-dark/50 \${className}\`}
    >
      <Download className="w-3 h-3" />
      <span>Install App</span>
    </button>
  );
};

export default PWAInstallBanner;
`;

fs.writeFileSync('src/components/PWAInstallBanner.tsx', code);
