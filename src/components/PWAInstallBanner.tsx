import React, { useState, useEffect } from "react";
import { MediChainIconOnly } from './MediChainLogo';
import { Download, X, CheckCircle2, Smartphone } from "lucide-react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global state store for beforeinstallprompt event
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

export function triggerGlobalPWAInstall() {
  if (globalDeferredPrompt) {
    globalDeferredPrompt.prompt();
  } else {
    // Dispatch event as fallback
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
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem("medichain_pwa_dismissed");

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);

      installListeners.forEach((listener) => listener(true));

      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setShowBanner(false);
      installListeners.forEach((listener) => listener(false));

      // Display success toast upon installation
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const handleCustomTrigger = () => {
      if (globalDeferredPrompt) {
        globalDeferredPrompt.prompt();
      }
    };
    window.addEventListener("medichain-trigger-pwa-install", handleCustomTrigger);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("medichain-trigger-pwa-install", handleCustomTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || globalDeferredPrompt;
    if (!promptToUse) return;

    try {
      await promptToUse.prompt();
      const choiceResult = await promptToUse.userChoice;
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the PWA install prompt");
      } else {
        console.log("User dismissed the PWA install prompt");
      }
    } catch (err) {
      console.error("Error triggering install prompt:", err);
    } finally {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setShowBanner(false);
      installListeners.forEach((listener) => listener(false));
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("medichain_pwa_dismissed", "true");
  };

  return (
    <>
      {/* Success Toast when App is Installed */}
      {showSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500/30 animate-in fade-in slide-in-from-top-5 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">MediChain App installed successfully!</span>
        </div>
      )}

      {/* Floating Bottom PWA Install Banner */}
      {showBanner && (
        <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 max-w-md mx-auto z-[100] bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                <MediChainIconOnly className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-base leading-tight">
                  Install MediChain App
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Add to home screen for fast pharmacy ordering & offline access
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              onClick={handleDismiss}
              type="button"
              className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center"
            >
              Not Now
            </button>
            <button
              onClick={handleInstallClick}
              type="button"
              className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Now</span>
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
        className={`flex flex-col items-center gap-1 cursor-pointer transition-all text-emerald-600 hover:text-emerald-700 ${className}`}
        title="Install MediChain App"
      >
        <div className="relative">
          <Smartphone className="w-5 h-5 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 shadow-2xs transition-all cursor-pointer ${className}`}
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
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wide uppercase text-emerald-700 bg-emerald-100/90 hover:bg-emerald-200 transition-colors cursor-pointer border border-emerald-300/50 ${className}`}
    >
      <Download className="w-3 h-3" />
      <span>Install App</span>
    </button>
  );
};

export default PWAInstallBanner;
