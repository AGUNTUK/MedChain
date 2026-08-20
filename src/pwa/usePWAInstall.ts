import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Detect Standalone
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      // @ts-ignore
      const isStandaloneIOS = ('standalone' in navigator) && !!navigator.standalone;
      return isStandaloneMedia || isStandaloneIOS;
    };

    setIsStandalone(checkStandalone());

    if (checkStandalone()) {
      return; // Already installed, no need to do anything else
    }

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 3. Check dismissal cooldown (7 days)
    const checkCooldown = () => {
      const dismissedAt = localStorage.getItem('medichain_pwa_install_dismissed_at');
      if (dismissedAt) {
        const timeDiff = Date.now() - parseInt(dismissedAt, 10);
        const daysDiff = timeDiff / (1000 * 3600 * 24);
        if (daysDiff < 7) {
          return true; // Still on cooldown
        }
      }
      return false;
    };

    const onCooldown = checkCooldown();

    // 4. Handle beforeinstallprompt (Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!onCooldown) {
        // Optional delay before showing
        setTimeout(() => {
          setShowPrompt(true);
        }, 1500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. iOS UI trigger (if on iOS and not installed and not on cooldown)
    if (isIOSDevice && !onCooldown) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
    }

    // 6. Handle successful installation
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      localStorage.removeItem('medichain_pwa_install_dismissed_at'); // Clear dismissal if installed
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    if (result.outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('medichain_pwa_install_dismissed_at', Date.now().toString());
  };

  return {
    showPrompt,
    isIOS,
    isStandalone,
    canInstall: !!deferredPrompt,
    install,
    dismiss
  };
}
