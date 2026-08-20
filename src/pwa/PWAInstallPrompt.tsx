import React from 'react';
import { usePWAInstall } from './usePWAInstall';
import { X, Share } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { showPrompt, isIOS, canInstall, install, dismiss } = usePWAInstall();

  if (!showPrompt) {
    return null;
  }

  // Ensure it only renders if we have the prompt OR it's iOS
  if (!canInstall && !isIOS) {
    return null;
  }

  return (
    <div className="fixed top-2 left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:w-96 z-[100] pt-[env(safe-area-inset-top)] animate-in slide-in-from-top-10 fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
        
        {/* Header/Content Area */}
        <div className="flex items-center gap-3 p-3">
          <div className="w-12 h-12 bg-white rounded-xl p-1 flex-shrink-0 shadow-inner">
            <img 
              src="/icons/icon-192.png" 
              alt="MediChain" 
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-sm truncate">
              Install MediChain App
            </h3>
            <p className="text-slate-400 text-xs truncate">
              medichain
            </p>
          </div>

          <button 
            onClick={dismiss}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors self-start -mr-1 -mt-1"
            aria-label="Close install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Area */}
        {isIOS ? (
          <div className="px-3 pb-3">
            <div className="bg-slate-800/50 rounded-lg p-2.5 flex items-center justify-center gap-2 text-xs text-slate-300">
              Tap <Share className="w-3.5 h-3.5 text-brand-lime" /> <span className="font-medium text-white">Share</span> then <span className="font-medium text-white">Add to Home Screen</span>
            </div>
          </div>
        ) : (
          <div className="px-3 pb-3 flex justify-end">
            <button 
              onClick={install}
              className="px-4 py-1.5 bg-brand-lime text-slate-900 font-medium text-sm rounded-lg shadow-sm hover:bg-brand-lime/90 active:scale-95 transition-all w-full sm:w-auto"
            >
              Install
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default PWAInstallPrompt;
