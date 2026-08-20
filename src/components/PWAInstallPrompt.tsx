import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function PWAInstallPrompt() {
  const { showPrompt, isIOS, isStandalone, promptInstall, dismissPrompt } = usePWAInstall(3); // 3 days cooldown
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (isStandalone) return null;

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      promptInstall();
    }
  };

  return (
    <>
      <AnimatePresence>
        {showPrompt && !showIOSInstructions && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0, transition: { duration: 0.2 } }}
            className="fixed top-2 left-2 right-2 md:left-auto md:right-4 md:w-96 z-50 pt-safe"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-3 pr-4 flex items-center gap-3 relative overflow-hidden">
              <button
                onClick={dismissPrompt}
                className="absolute top-1 right-1 p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                aria-label="Dismiss installation prompt"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-100 overflow-hidden">
                <img src="/logo.png" alt="MediChain" className="w-10 h-10 object-contain" />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <h3 className="text-sm font-black text-brand-charcoal truncate">
                  Install MediChain App
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  medichain.app
                </p>
              </div>

              <button
                onClick={handleInstallClick}
                className="text-brand-purple font-extrabold text-sm px-2 py-1 flex-shrink-0 active:opacity-70 transition-opacity"
              >
                Install
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center p-4 pb-safe"
            onClick={() => {
              setShowIOSInstructions(false);
              dismissPrompt();
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowIOSInstructions(false);
                  dismissPrompt();
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
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-purple flex-shrink-0">
                    <Share className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-brand-charcoal">
                    1. Tap the <span className="font-black text-brand-purple">Share</span> button in your browser's menu bar.
                  </p>
                </div>
                
                <div className="h-px bg-slate-200 w-full" />
                
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-purple flex-shrink-0">
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
                  dismissPrompt();
                }}
                className="w-full mt-6 bg-brand-charcoal text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-transform"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
